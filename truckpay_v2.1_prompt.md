# TRUCKPAY V2.1 — IMPLEMENTATION PROMPT
# Paste this into Claude console as the opening message alongside your full codebase
# ================================================================

## CONTEXT

You are a senior developer continuing work on TruckPay (truckpay.app) — a vanilla JS PWA for truck drivers.
The app is already at V2.0 with the following already working:
- Load Reports with weekly mileage, week navigation, loads list
- Deductions with fixed/recurring types, weekly entry for fuel/toll/custom
- Earnings Summary with multi-period filter (Last 2/3/4 weeks, YTD, Custom Range)
- Per Diem page (IRS Meal Deduction)
- IFTA Report page (Fuel Tax Filing)
- Weekly Pay Forecast ("AT THIS PACE...") on Load Reports
- Lane Performance section in Summary
- Monthly Net Income bar chart in Summary (YTD view)
- Optional fields on Add Load form: deadhead miles, dispatcher, broker, BOL number
- State dropdowns for origin/destination

Do NOT rewrite or break any of the above. Only add/fix what is listed below.

Design system to maintain strictly:
- Colors: #1a1a2e (navy), #f0a500 (amber), #ffffff (white), #2d6a2d (green), #c0392b (red), #f0f0f0 (light bg)
- Style: uppercase monospace labels, bold large values, thick borders, grid background texture
- All monetary values: $X,XXX.XX format
- Mobile-first — every feature must work with one thumb on a 375px screen

---

## FIX 1 — MILEAGE BUG (CRITICAL, DO FIRST)

### Problem
In Earnings Summary, Total Miles shows a large negative number like -998,600.
The bug is in how multi-week mileage is aggregated.

### Root Cause
The code is calculating total miles by doing something like:
`lastWeekEndMileage - firstWeekStartMileage`
This gives odometer span, not sum of driven miles. If any week has end mileage = 0
(not entered yet), the result goes massively negative.

### Fix
Change ALL multi-week mileage calculations to:
```
totalMiles = sum of (endMileage - startMileage) per individual week,
             but ONLY include a week if BOTH startMileage > 0 AND endMileage > 0
             AND (endMileage - startMileage) > 0
             AND (endMileage - startMileage) < 15000 (sanity cap per week)
```

Apply this fix everywhere mileage is aggregated:
- Earnings Summary total miles display
- Mileage card in Summary
- Any CSV export that includes mileage
- RPM calculations in multi-week views

Also: in Load Reports, if endMileage is 0 or empty, do NOT calculate
miles driven or RPM for that week — show "--" instead of a wrong number.

---

## FIX 2 — WEEKLY GOAL "LOADS NEEDED" CALCULATION

### Problem
The Weekly Goal input field exists on Load Reports but shows no output.
The driver types in a goal (e.g. $5,000 net) and nothing happens.

### Fix
Below the weekly goal input, add a live-calculated line:
- Calculate: remaining net needed = goal - current projected net pay
- Calculate: loads needed = remaining / average driver pay per load this week
- Show: "You need ~X more loads at your current average to hit your goal"
- If already on track: show in green "✓ ON TRACK — projected net exceeds your goal"
- If goal is not set: hide this line entirely

---

## FEATURE 1 — LOAD PROFITABILITY SCORE ON LOAD CARDS

### What to build
Add a grade badge to every load card in both:
- Load Reports (week view)
- Earnings Summary (loads list)

### Grade calculation
Use driver pay (after company deduction) divided by estimated miles.
Estimated miles per load = week's total miles driven ÷ number of loads that week.
If week mileage is not entered, use a fallback of 500 miles per load.

Thresholds (driver pay per mile):
- A — EXCELLENT: $2.50+/mile → green badge
- B — GOOD: $2.00–$2.49/mile → blue badge (#4a90d9)
- C — AVERAGE: $1.50–$1.99/mile → amber badge
- D — POOR: under $1.50/mile → red badge

### Display
On each load card, top-right corner: a small square badge showing the letter grade
and color. Below the grade letter, show the RPM: e.g. "$2.14/mi"
Keep it compact — badge should be max 48x48px, not intrusive.

---

## FEATURE 2 — RPM ADDED TO LANE PERFORMANCE

### Problem
Lane Performance in Summary shows avg driver pay per lane but not RPM.
A $3,916 Texas→Massachusetts load over 2,200 miles ($1.78/mi) is actually
worse than a $1,691 Georgia→Texas load over 800 miles ($2.11/mi).
The current ranking is misleading.

### Fix
In the Lane Performance section, for each lane row add:
- Avg RPM next to avg driver pay (if mileage data is available)
- Sort lanes by avg RPM (not avg dollar amount) when mileage data exists
- If no mileage data for a lane, sort by avg dollar amount and show "--" for RPM
- Update Best Lane / Worst Lane cards to also show RPM

---

## FEATURE 3 — AI RECEIPT SCANNER

### Overview
This is the flagship new feature. Drivers can photograph or upload receipts/invoices,
and AI automatically extracts the merchant, category, amount, and date, then
pre-fills a deduction entry for the driver to confirm.

### Where it goes
In the Deductions page, add a new button above ADD_CUSTOM_DEDUCTION:

  [ 📷  SCAN RECEIPT WITH AI ]

Style it differently from other buttons — use a gradient or distinct visual
to make it feel premium. Label it "AI-POWERED" in small text below.

### User flow
1. Driver taps SCAN RECEIPT WITH AI
2. A modal appears with two options:
   - "📷 Take Photo" (opens device camera, back-facing)
   - "📁 Upload Files" (file picker, allows multiple images at once, accepts image/*)
3. After selecting 1 or more images, show a loading state:
   "🤖 AI is reading your receipts..." with a spinner
4. For each image, call the Claude API (see below)
5. Show results as preview cards — one card per receipt — each showing:
   - Category (editable dropdown: FUEL / TOLL / MAINTENANCE / PARTS / FOOD / LODGING / OTHER)
   - Merchant / Description (editable text field)
   - Amount (editable number field, highlighted if AI was uncertain)
   - Date (editable date picker, pre-filled from receipt)
   - Small thumbnail of the original receipt image
6. "✓ CONFIRM ALL" button at the bottom bulk-inserts all confirmed entries into deductions
7. Driver can remove individual cards before confirming, or edit any field
8. On confirm: all entries are saved to localStorage as deduction entries,
   assigned to the correct week based on receipt date,
   and the receipt image is stored compressed (max 800px, 70% JPEG quality)

### Claude API call (use this exact approach)
```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: base64ImageData }
        },
        {
          type: "text",
          text: `Analyze this receipt or invoice for a truck driver.
Return ONLY a valid JSON object, no markdown, no explanation:
{
  "merchant": "name of business or service provider",
  "category": "FUEL or TOLL or MAINTENANCE or PARTS or FOOD or LODGING or OTHER",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "notes": "brief description of what was purchased"
}
Rules:
- category must be exactly one of the listed options
- amount must be a number (the total paid, not subtotal)
- If date is not visible, use null
- If amount is not clear, use null
- merchant should be the business name only, not address`
        }
      ]
    }]
  })
});
const data = await response.json();
const text = data.content[0].text;
const receipt = JSON.parse(text);
```

### Error handling
- If AI returns null for amount: highlight the amount field in red, show "Amount unclear — please enter manually"
- If AI returns null for date: default to today, let driver change it
- If API call fails: show "AI couldn't read this receipt. You can enter details manually." and show a blank editable card
- If image is not a receipt (e.g. random photo): AI will return low-confidence data, show a warning: "This may not be a receipt — please verify the details"

### Storage
- Store the compressed receipt image as base64 in the deduction entry: `receiptPhoto: "data:image/jpeg;base64,..."`
- Add a small camera icon to any deduction list item that has a photo attached
- Tapping the icon opens a modal showing the full receipt image
- In Settings > Data Management, add: "Storage Used: X.X MB / ~5MB limit" with a usage bar
- When storage is above 80%, show a warning banner: "Storage almost full — export your data or clear old receipts"

---

## FEATURE 4 — SUBSCRIPTION & PAYWALL SYSTEM

### Tiers
- Free: current week only, max 5 loads/week, no AI scanner, no IFTA, no Per Diem, no CSV export
- Pro ($14.99/month): full history, AI receipt scanner, IFTA, Per Diem, CSV export, YTD dashboard
- Owner-Operator ($29.99/month): everything in Pro + dispatcher contact book, lane RPM analytics, annual goal

### Subscription state in localStorage
```javascript
// Key: 'truckpay_subscription'
{
  tier: "free",          // "free" | "pro" | "owner"
  startDate: null,
  endDate: null,
  trialUsed: false,
  earlyAdopter: false    // set true if user already has data before paywall launch
}
```

### Early adopter logic
On first load after this update:
- Check if localStorage has any loads or deductions with dates before today
- If yes: set earlyAdopter = true, set tier = "pro", set endDate = 90 days from today
- Show a one-time banner: "🎉 Early Adopter Bonus: Pro free until [date]. Thank you for using TruckPay!"
- This ensures Akrom and existing users don't get locked out

### Paywall placement — show upgrade modal when:
1. Navigating to IFTA or Per Diem pages (if tier = free)
2. Clicking Export CSV (if tier = free)
3. Clicking "SCAN RECEIPT WITH AI" (if tier = free) — this is the key conversion moment
4. Navigating to any week older than the current week (if tier = free)
5. Trying to add a 6th load in a week (if tier = free)

### Upgrade modal design
Full-screen dark overlay with a centered card:
- Header: "UPGRADE TRUCKPAY" in amber
- Subtext: what feature they were trying to use
- Two side-by-side option cards:
  - PRO: $14.99/mo — list 4 key features
  - OWNER-OP: $29.99/mo — "Everything in Pro +" list 3 extra features
- Annual pricing toggle: show "Save 33% with annual" — Pro $119.88/yr, Owner $239.88/yr
- Primary CTA: "START 7-DAY FREE TRIAL" (only show if trialUsed = false)
- Secondary: "MAYBE LATER"
- For now (pre-Stripe): clicking the trial CTA sets tier = "pro" in localStorage
  with endDate = 7 days from now, trialUsed = true, and shows a success message.
  Add a TODO comment: "// TODO: Replace with Stripe Checkout redirect"

### Navigation icons
On home screen menu cards, add a small lock icon 🔒 to:
- IFTA REPORT card (free users)
- PER DIEM card (free users)
These disappear once user is Pro.

---

## FEATURE 5 — ANNUAL INCOME GOAL

### Where it goes
In Settings, add a new section below Weekly Period called "INCOME GOALS":
- Annual Income Goal ($): number input, e.g. 120000
- Weekly Income Goal ($): number input (or auto-calculate: annual / 52)

### Display in Earnings Summary (YTD view)
Below the Total Net Income card, add a progress section:
- "ANNUAL GOAL PROGRESS"
- Progress bar: filled % = (YTD net income / annual goal) × 100
- Text: "You've earned $XX,XXX of your $XXX,XXX annual goal (XX%)"
- Below bar: "On pace to earn $XXX,XXX this year" (extrapolate from weekly average)
- Color: green if on pace or ahead, amber if slightly behind (<10%), red if significantly behind (>10%)

Only show this section if annual goal is set in settings. If not set, show a small
"Set Annual Goal →" link that navigates to Settings.

---

## FEATURE 6 — EDIT BUTTON ON LOADS IN SUMMARY

### Problem
In Earnings Summary loads list, load cards only show a delete button.
There's no way to edit a load from the Summary view.

### Fix
Add an edit (pencil) button to load cards in Summary, same as exists in Load Reports.
The edit button should open the same edit modal/form that Load Reports uses,
pre-filled with the load's current data.
After saving, refresh the Summary view to show updated totals.

---

## IMPLEMENTATION ORDER

Do these in sequence — each sprint is a commit:

### Sprint 1 — Fixes (do first, these affect data trust)
1. Mileage bug fix
2. Weekly goal "loads needed" calculation

### Sprint 2 — Core missing features
3. Load Profitability Score (grade badges on all load cards)
4. RPM in Lane Performance
5. Edit button on Summary loads

### Sprint 3 — AI Receipt Scanner (highest monetization value)
6. Build the full scan receipt UI flow
7. Wire up Claude API call with image input
8. Implement preview cards with editable fields
9. Implement bulk confirm + storage

### Sprint 4 — Monetization
10. Subscription state system + early adopter logic
11. Paywall modal design
12. Paywall placement on gated features
13. Lock icons on home screen nav

### Sprint 5 — Polish
14. Annual income goal in Settings + YTD progress bar
15. Storage usage indicator in Settings
16. Version bump to V2.1 in footer

---

## IMPORTANT TECHNICAL NOTES

1. The Claude API key is already handled — do not hardcode or expose it.
   Call the API from client-side the same way the rest of the app makes fetch calls.

2. Image compression before API call and before storage:
   - Resize to max 1024px on longest side
   - JPEG quality 0.80 for API call (better AI accuracy)
   - JPEG quality 0.65 for localStorage storage (smaller size)

3. Multiple receipt uploads: process images sequentially, not in parallel,
   to avoid rate limiting. Show a progress indicator: "Processing 2 of 4 receipts..."

4. All new localStorage keys must follow existing naming convention: `truckpay_XXXXX`

5. Before any migration or schema change, auto-backup:
   `localStorage.setItem('truckpay_backup_' + Date.now(), JSON.stringify(exportAllData()))`

6. Test every new feature on 375px viewport width before considering it done.

7. When asking for clarification: ask ONE question at a time, do not halt
   implementation of unrelated features while waiting for answer.

---
*TruckPay V2.1 Spec | Based on live review of truckpay.app on April 3, 2026*
*Stack: Vanilla JS PWA | Storage: localStorage | AI: Claude API (vision)*
