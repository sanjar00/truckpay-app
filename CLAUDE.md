# CLAUDE.md — TruckPay Project

> This file gives Claude full context about the TruckPay project.
> Read this entirely before writing any code or making any suggestions.

---

## What Is TruckPay

TruckPay (truckpay.app) is a Progressive Web App (PWA) for truck drivers to track
their weekly earnings, deductions, and expenses. It is built and maintained by
Sanjar Azizov. The app is currently in active use by real truck drivers.

Current live version: **V2.2**

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI Components:** shadcn/ui (Button, Input, Card, Popover, Calendar, Select, etc.)
- **Styling:** Tailwind CSS + custom brutal design system classes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **AI integration:** OpenAI ChatGPT API (gpt-4-vision) for
  receipt scanning via vision — called via Supabase Edge Function
- **Utilities:** date-fns for date manipulation, lucide-react for icons
- **PWA:** Service worker and manifest.json for installability
- **Hosting:** Netlify (or similar)

---

## File Structure

Standard React + Vite project structure:
- `src/pages/` — page components (Index.tsx = Home, LoadReports.tsx, etc.)
- `src/components/` — reusable components (LoadCard, AddLoadForm, ReceiptScanner, etc.)
- `src/lib/` — utility functions (Supabase client, date helpers, etc.)
- `src/styles/` — global CSS
- `public/` — static assets, manifest.json, service worker
- `vite.config.ts` — Vite configuration
- `tailwind.config.js` — Tailwind CSS configuration

When modifying components, maintain existing patterns for imports, styling, and state management.
Do not break the Supabase query patterns or date/locale formatting conventions.

---

## Design System — NEVER DEVIATE FROM THIS

### Colors
```css
--navy:    #1a1a2e   /* Primary background, cards, headers */
--amber:   #f0a500   /* Primary accent, CTAs, highlights */
--white:   #ffffff   /* Card backgrounds, text on dark */
--green:   #2d6a2d   /* Positive values, net pay, success */
--red:     #c0392b   /* Negative values, deductions, danger */
--blue:    #4a90d9   /* Grade B loads, secondary info */
--light:   #f0f0f0   /* Page background */
--peach:   #fdf0e0   /* Mileage section background */
--mint:    #e8f5e9   /* Per diem / positive section background */
```

### Typography
- Labels: UPPERCASE, monospace (`font-family: monospace`), `letter-spacing: 1px`,
  `font-size: 11–12px`, color: muted/gray
- Values: Bold, `font-size: 16–24px` for normal, `font-size: 28–36px` for hero metrics
- Page titles: Bold uppercase, `font-size: 20–24px`

### Components
```css
/* Card */
border: 2px solid var(--navy);
border-radius: 8px;
padding: 16px 20px;
background: white;

/* Primary Button (amber) */
background: #f0a500;
color: #1a1a2e;
font-weight: 800;
text-transform: uppercase;
letter-spacing: 1px;
border: 2px solid #1a1a2e;
border-radius: 4px;

/* Destructive Button (red) */
background: #c0392b;
color: white;

/* Section Header */
background: #1a1a2e;
color: #f0a500;
text-transform: uppercase;
```

### Background
Grid texture pattern on all page backgrounds (existing CSS class — reuse it).

### Money Format
Always display as `$X,XXX.XX` — use `.toLocaleString('en-US', {style:'currency', currency:'USD'})` or equivalent.
Always use a comma as the thousands separator — never a space (e.g. `5,059` not `5 059`).

### Dates
Display format: `Mon DD, YYYY` (e.g. `Apr 06, 2026`)
Storage format: `YYYY-MM-DD` (ISO)

---

## Data Architecture

All data is stored in Supabase PostgreSQL database. User authentication via Supabase Auth.
Components fetch data via Supabase client with proper error handling and real-time subscriptions where needed.

### Key Tables

**profiles** — User profile settings
- name, email, phone, weeklyPeriod, annualGoal, weeklyGoal
- driverType: `'owner-operator'` | `'lease-operator'` | `'company-driver'`
- companyDeduction (% deducted for owner-operator and lease-operator)
- companyPayType: `'per_mile'` | `'percentage'` (company-driver only)
- companyPayRate: $/mile or % value depending on companyPayType
- leaseRatePerMile: cost per mile for lease-operator (deducted from net weekly)
- earlyAdopterBannerDismissed: boolean — persist banner dismissal so it doesn't reappear

**load_reports** — Truck loads with earnings data
- id, user_id, origin, destination, pickupDate, deliveryDate, loadRate, deductionRate, weekId
- deadheadMiles, loadMiles, estimatedMiles, driverPay
- pickupZip, deliveryZip, pickupCityState, deliveryCityState (auto-populated via Google Maps lookup)
- detentionAmount (added when driver waits >2 hours at pickup/dropoff — adds to gross before deductions)
- notes
- created_at, updated_at

**weekly_deductions** — Fixed weekly expense categories (FUEL, TOLL, MAINTENANCE, etc.)
- id, user_id, type, amount, week_start, category, notes

**weekly_extra_deductions** — One-off weekly expenses
- id, user_id, description, amount, week_start, category

**deductions** — Legacy deductions table (use weekly_deductions/weekly_extra_deductions for new data)

**fixed_deductions** — Recurring weekly costs
- id, user_id, name, amount, effectiveFrom

**weekly_mileage** — Odometer readings per week
- id, user_id, weekId, startMileage, endMileage, leaseMilesCost (only populated for lease-operator drivers)

**subscriptions** — User subscription tier and status
- id, user_id, tier, startDate, endDate, trialUsed, earlyAdopter

---

## Week ID Calculation

Week IDs are in format `YYYY-WXX`. This is critical — inconsistency here
causes the mileage calculation bug. Always use this exact function:

```javascript
function getWeekId(date, weekStart = 'monday') {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...
  const offset = weekStart === 'monday'
    ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
    : -dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + offset);
  const year = monday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((monday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}
```

Use `profile.weeklyPeriod` ('monday' or 'sunday') as the weekStart parameter.

---

## Subscription Tiers

| Tier | Price | Gated Features |
|------|-------|----------------|
| Free | $0 | Current week only, max 5 loads/week |
| Pro | $14.99/mo or $119.88/yr | Full history, IFTA, Per Diem, CSV export, YTD, AI Receipt Scanner |
| Owner-Op | $29.99/mo or $239.88/yr | Everything in Pro + Dispatcher Book, Lane RPM Analytics, Annual Goal |

**Early Adopter rule:** Any user with existing data (loads/deductions before
today) automatically gets `earlyAdopter: true` and 90 days of Pro free.
Akrom Aripov is an early adopter — do not lock him out.

**Paywall triggers:**
- Navigating to IFTA or Per Diem (Free tier)
- Clicking Export CSV (Free tier)
- Clicking "Scan Receipt with AI" (Free tier)
- Navigating to any week older than current (Free tier)
- Adding 6th load in a week (Free tier)

---

## Pages / Sections

The app uses hash-based routing. All sections on one page, shown/hidden by JS.

| Hash | Name | Purpose |
|------|------|---------|
| `#home` | Home | Dashboard, weekly snapshot, navigation |
| `#loads` | Load Reports | Week navigation, mileage, loads list, forecast |
| `#deductions` | Deductions | Fixed deductions, weekly fuel/toll/custom entry |
| `#summary` | Earnings Summary | Multi-period income analysis, charts, lane performance |
| `#expenses` | Personal Expenses | Personal (non-truck) expense categories |
| `#perdiem` | Per Diem | IRS daily meal deduction calculator |
| `#ifta` | IFTA Report | Quarterly fuel tax report |
| `#settings` | Settings | Profile, deduction types, data management |

---

## Language Rules — Plain English Only

The app must never show developer-style variable names or code strings to the user.
All text must be plain English that a non-technical truck driver understands.
Enforce this on every new feature — no exceptions.

| ❌ Never use | ✅ Use instead |
|-------------|---------------|
| `WEEK_MANAGEMENT_SYSTEM` | Remove — don't show at all |
| `EXPENSE_MANAGEMENT_SYSTEM` | Remove — don't show at all |
| `DEDUCTION_TYPES` | `Deduction Types` |
| `SET_RECURRING_WEEKLY_AMOUNTS` | `Set recurring weekly amounts` |
| `CURRENT_FIXED_DEDUCTIONS` | `Current Fixed Deductions` |
| `ADD_NEW_DEDUCTION_TYPE` | `Add New Deduction Type` |
| `ENTER_NAME` | `Enter name` (or use a descriptive placeholder) |
| `ADD_TYPE` | `+ Add Type` |
| `WEEKLY_AMOUNT_($)` | `Weekly Amount ($)` |
| `FIXED_AT_$X.XX/WEEK` | `Fixed at $X.XX/week` |
| `EFFECTIVE_FROM_MMM_D,_YYYY` | `Effective from MMM D, YYYY` |
| `ADMIN_FEE` (as a label) | `Admin Fee` |
| `WEEKLY__INSURANCE` (double underscore) | `Weekly Insurance` |
| `PREV_WEEK` / `NEXT_WEEK` | `← Last Week` / `Next Week →` |
| `CURRENT_WEEK` | Remove — the date range below already says it |
| `MONDAY_TO_SUNDAY` | `Mon – Sun` or remove |
| `Apr_06 - Apr_12,_2026` (underscores) | `Apr 06 – Apr 12, 2026` |
| `TOTAL_LOADS` | `Loads This Week` |
| `GROSS_PAY` | `Total Earned` |
| `WEEKLY_MILEAGE` | `Miles This Week` |
| `START_OF_WEEK_MILEAGE` | `Odometer Monday` |
| `END_OF_WEEK_MILEAGE` | `Odometer Sunday` |
| `ADD_NEW_LOAD` / `RECORD_LOAD_DATA` | `+ Add Load` |
| `WEEK_LOADS (4)` | `This Week's Loads (4)` |
| `ADDED_DEDUCTIONS_THIS_WEEK` | `Expenses Added` |
| `AT THIS PACE...` | `This Week's Forecast` |
| `PROJ. GROSS` | `Estimated Gross` |
| `PROJ. NET` | `Estimated Take-Home` |
| `PAYMENT_BREAKDOWN` | `Pay Breakdown` |
| `AFTER_COMPANY_CUT` | `After Company (11%)` |
| `ADDED_DEDUCTIONS` | `Fuel & Expenses` |
| `FIXED_DEDUCTIONS` | `Weekly Fixed Costs` |
| `ADD_CUSTOM_DEDUCTION` | `+ Add Expense` |
| `SHOW OPTIONAL FIELDS (deadhead, detention...)` | `+ More Details` |
| `FIX` (checkbox label on deductions) | `Recurring` |
| `Enter expense type nam` (truncated) | `Enter expense type name` |

---

## UX Rules — Mobile First

- **Primary target:** iPhone/Android, one-thumb use, 375–390px wide
- **No horizontal scrolling** ever
- **Tap targets:** Minimum 44x44px for all buttons and interactive elements
- **No hover-only interactions** — all actions must work on touch
- **Bottom tab bar** (to be implemented): fixed navigation with 4 tabs:
  🚚 Loads | 💸 Expenses | 📊 Summary | ⚙️ More
- **Forms:** Pre-fill today's date on all date fields — driver changes only if needed
- **Load Rate field:** Show `$0.00` placeholder — never pre-fill a fake amount
- **Empty states:** Every list must have a helpful empty state message, not just blank space

---

## UI/UX Improvement Backlog
> Sourced from a full audit of the live app (April 2026). Implement these as
> part of V2.3 and beyond. Do not deviate from the design system when fixing these.

### 🔴 P0 — Critical (fix before next release)

**1. Code labels still visible in production**
Despite the Language Rules above, several raw code strings are still rendering
in the live app. Audit every component and ensure none of the ❌ strings from
the Language Rules table appear anywhere in the UI. Specific confirmed locations:
- `WEEK_MANAGEMENT_SYSTEM` — Load Reports page subtitle
- `EXPENSE_MANAGEMENT_SYSTEM` — Deductions page subtitle
- `DEDUCTION_TYPES` / `SET_RECURRING_WEEKLY_AMOUNTS` — Deductions section headers
- `CURRENT_WEEK` / `PREV_WEEK` / `NEXT_WEEK` — week navigation buttons
- `MONDAY_TO_SUNDAY` — week range label
- `Apr_06 - Apr_12,_2026` — date with underscores instead of spaces
- `FIXED_AT_$X.XX/WEEK` / `EFFECTIVE_FROM_...` — deduction confirmation messages
- `WEEKLY_AMOUNT_($)` — deduction input label
- `ENTER_NAME` / `ADD_TYPE` — Deductions form placeholder and button
- `CURRENT_FIXED_DEDUCTIONS` / `ADMIN_FEE` / `WEEKLY__INSURANCE` — deduction items
- `ADD_NEW_DEDUCTION_TYPE` — section heading
- `Enter expense type nam` — truncated placeholder on Personal Expenses

**2. Logout button is a top-level red CTA**
The OUT (logout) button is bright red and sits prominently in the top-right
header next to the Settings gear icon. A driver could accidentally log out.
Move logout inside the Settings page. The header should only show the Settings
icon (⚙️). No logout button visible on any page except inside Settings.

**3. Version tag shows wrong version**
Footer reads "TRUCKPAY V2.1" — update to "TRUCKPAY V2.2".

---

### 🟠 P1 — High Priority

**4. Bottom tab bar navigation**
This is the #1 UX priority. The current home-screen tile navigation requires
going back to home between every section. Replace with a persistent bottom tab
bar fixed to the bottom of all screens:

```
[ 🚚 Loads ] [ 💸 Expenses ] [ 📊 Summary ] [ ⚙️ More ]
```

- Loads → Load Reports (#loads)
- Expenses → Deductions (#deductions)
- Summary → Earnings Summary (#summary)
- More → opens a sheet with: Personal Expenses, Per Diem, IFTA, Settings, Logout
- Active tab highlighted in amber
- Tab bar always visible — no page should require going "back to home" to navigate

**5. Add Load button not accessible enough**
Adding a load is the most frequent driver action. Currently requires navigating
to Load Reports and scrolling to find the amber ADD LOAD button. Fix:
- Add a floating action button (FAB) on the Load Reports page, fixed to the
  bottom-right above the tab bar: large amber `+` button, always visible
- Optionally add a quick "Add Load" shortcut card on the Home screen below
  the weekly snapshot

**6. Personal Expenses — all forms expanded by default**
Every expense category (Mechanic, Tires, Truck Wash, Parts, etc.) shows its
full "Add New Expense" form (Amount, Date, Note, ADD button) at all times.
With 4+ categories this creates a wall of identical forms.
Fix: collapse all forms by default. Show only the category header with total
amount and expense count. Expand the form on tap. Use an accordion pattern.

**7. IFTA page — no export button**
Per Diem has an EXPORT button but IFTA does not. IFTA's entire purpose is to
produce a report for filing. Add an "Export IFTA Report" button (same style as
Per Diem's export) at the bottom of the IFTA page.

---

### 🟠 P2 — Medium Priority

**8. "Recurring" checkbox label on Deductions**
The checkbox next to each deduction type is labeled "FIX" — this is unclear.
Replace with "Recurring" as a toggle label. The meaning should be obvious:
toggle on = this deduction repeats every week automatically.

**9. Fuel tracked in two places — clarify or consolidate**
Fuel expenses appear both in Load Reports (as weekly Fuel & Expenses entries)
and in Deductions (as a FUEL deduction type). This confuses drivers — they
don't know which one to use. Either:
- Consolidate both into one place with a clear label, OR
- Add a small tooltip/note: "Fuel entered here applies to this week's loads.
  For recurring fixed fuel costs, use Deductions."

**10. AI Receipt Scanner — add context label**
The "SCAN RECEIPT WITH AI / AI-POWERED" button in Deductions appears mid-page
with no explanation of what it does or what type of receipt to scan.
Add a brief descriptor below the button: "Take a photo of a fuel, toll, or
expense receipt — Claude will read the amount and date automatically."

**11. Odometer fields interrupt Load Reports flow**
The ODOMETER MONDAY / ODOMETER SUNDAY fields sit between the weekly stats cards
and the forecast card in Load Reports. This breaks the reading flow. Options:
- Move them into a collapsible "Miles This Week" section that is closed by
  default and expands on tap
- Or move them to a dedicated Mileage tab within Load Reports

**12. Lane names truncated throughout Summary and IFTA**
Lane names are cut off everywhere: `MISSISSIPPI → FLO...`, `FOUNTAIN HILL, PA ...`,
`JACKSON, TN → WA...`. Full route names are important — drivers need to
recognize their lanes at a glance. Fix by allowing text to wrap to a second
line instead of truncating with `...`.

**13. Early Adopter banner persists after dismissal**
The "🎉 Early Adopter Bonus: Pro free until 07.07.2026" banner reappears on
every app load even after the driver taps ✕. Persist the dismissal:
store `earlyAdopterBannerDismissed: true` in the `profiles` table and check
it on load. Once dismissed, never show it again.

**14. IFTA empty state — add first-use guidance**
All loads on the IFTA page show "No state miles entered" with just an EDIT
button and no explanation. A first-time user has no idea what to do.
Add a prominent info banner at the top of the load list when no state miles
have been entered:
"Tap EDIT on each load to add the miles you drove per state. This is required
for your quarterly IFTA filing."

---

### 🟡 P3 — Polish

**15. Remove "WELCOME, [NAME]!" from Home screen**
The greeting "WELCOME, AKROM ARIPOV!" takes up space without adding value.
Drivers know their own name. Remove it. The weekly snapshot card is a
sufficient and more useful greeting.

**16. Pay Breakdown — differentiate income vs. deduction rows**
In the Pay Breakdown section at the bottom of Load Reports, all rows render
with the same visual weight (plain text, same size). Make the breakdown
scannable:
- Income rows (Total Earned, After Company Cut): normal or slightly positive styling
- Deduction rows (Other Expenses, Weekly Fixed Costs): red text or a minus prefix
- Take-Home: largest, boldest number in the breakdown — green, hero size

**17. "AVG DRIVER PAY" label repeats on every lane row**
In the Lane Performance section of Earnings Summary, every row ends with
`· AVG DRIVER PAY`. Since every row is a driver pay figure, this label adds
clutter without adding meaning. Remove it — the column is self-explanatory.

**18. RPM missing on some lane rows — improve display**
Some lane rows in Lane Performance show `--` for RPM because mileage data is
missing. Instead of a plain dash, show a small amber indicator: `⚠ No miles`
so the driver knows why RPM is unavailable and what to fix.

**19. "AT THIS PACE..." forecast label**
Replace "AT THIS PACE..." with "This Week's Forecast" — clearer and consistent
with the Language Rules table above. The confidence level (HIGH/MODERATE/LOW)
can stay as a badge.

**20. Per Diem — tax bracket is hardcoded at 25%**
The "EST. TAX SAVINGS (25% BRACKET)" label assumes all drivers are in the 25%
bracket. Add a tax bracket selector to the Settings page (options: 10%, 12%,
22%, 24%, 32%) and use `profile.taxBracket` to calculate the savings estimate.
Default to 22% if not set. Show the selected bracket in the label.

**21. Home screen nav tiles have no visual hierarchy**
All 6 nav tiles (Load Reports, Deductions, Summary, Personal Expenses, Per Diem,
IFTA) look identical. Daily-use sections should feel more prominent than
quarterly ones. Consider:
- Making the Load Reports tile taller or distinctly styled (most-used feature)
- Grouping tiles: "Weekly" (Loads, Deductions) vs. "Reports" (Summary,
  Per Diem, IFTA) with a small section label between groups

**22. Home screen weekly goal progress**
The home snapshot shows what the driver earned but not how it compares to
their goal. Add a small progress bar below the Take-Home number:
`$2,456 of $5,000 goal ████░░░░ 49%`
Only show if `profile.weeklyGoal` is set. If not set, show a subtle prompt:
"Set a weekly goal →"

---

## Known Issues (Do Not Re-introduce)

1. **Mileage bug** — described above in Mileage Calculation section. Fixed in V2.1. Do not revert.

2. **Desktop layout breaks** — the app renders wide blank columns on desktop.
   This is acceptable for now — the app is mobile-only. Do not attempt a
   desktop redesign unless asked.

---

## AI Receipt Scanner — Implementation Notes

**Location:** Personal Expenses page. Button: "SCAN RECEIPT WITH AI"

**Purpose:** Auto-extract merchant, category, amount, and date from receipt images to quickly add personal expenses.

**API:** OpenAI ChatGPT (gpt-4o) via Supabase Edge Function

**Frontend flow:**
1. User clicks "SCAN RECEIPT WITH AI" button in Personal Expenses
2. Choose "TAKE PHOTO" (mobile) or "UPLOAD FILES" (desktop)
3. Images compressed: max 1024px, JPEG quality 0.80
4. Call edge function: `supabase/functions/scan-receipt/` with base64 image
5. Receive parsed JSON: `{ merchant, category, amount, date, notes }`
6. Review extracted data in modal
7. Auto-create expense category if doesn't exist
8. Add expense under that category

**Edge function (`supabase/functions/scan-receipt/index.ts`):**
- Receives: `{ imageBase64: base64String }`
- Returns: `{ merchant, category, amount, date, notes }`
- Uses OpenAI gpt-4o model via `OPENAI_API_KEY` environment variable
- API key stored securely in Supabase secrets, never exposed in frontend

**Image handling:**
- Compress before API: max 1024px, JPEG quality 0.80
- Process multiple images sequentially (not in parallel)
- Show progress: "Processing 2 of 4 receipts..."
- Display receipt image thumbnail in review modal

**Categories auto-created:**
Supported receipt categories: FUEL, TOLL, MAINTENANCE, PARTS, FOOD, LODGING, OTHER
If category doesn't exist in Personal Expenses, it's created automatically on confirmation.

**Environment setup:**
```bash
supabase secrets set OPENAI_API_KEY sk-proj-your-key-here
supabase functions deploy scan-receipt
```

**Security:**
- API key stored securely in Supabase secrets
- No frontend environment variables needed
- All OpenAI communication happens server-side via Edge Function
- No CORS issues (server-to-server communication)

---

## ZIP-to-ZIP Mileage Tracking

The Add Load form now auto-populates estimated mileage via Google Maps:

1. **User enters pickup ZIP** → Lookup via Geocoding API (extracts city, state, lat/lng)
2. **User enters delivery ZIP** → Same lookup process
3. **When both ZIPs resolve** → Distance Matrix API calculates driving distance in miles
4. **Form shows estimated miles** → Driver can edit if needed

**Implementation:**
- Frontend: `useZipLookup()` hook manages state and calls Supabase edge function
- Edge function: `supabase/functions/driving-distance/` handles Google Maps API calls
- Database: `load_reports` includes `pickup_zip`, `delivery_zip`, `pickup_city_state`, `delivery_city_state`, `estimated_miles`
- Validation: ZIP inputs require exactly 5 digits (regex: `^\d{5}$`)
- Timeout: 10-second AbortController on edge function calls
- Error handling: Clear error messages when ZIP lookup fails, prevents form submission until both ZIPs resolve successfully

**Key files:**
- `src/hooks/useZipLookup.ts` — State management and Google Maps calls
- `supabase/functions/driving-distance/index.ts` — Edge function server
- `src/components/AddLoadForm.tsx` — Form integration with ZIP inputs and estimated miles display
- Database migration: `20260409000000_add_zip_and_miles_to_loads.sql`

---

## Driver Types & Pay Calculations

Three driver types are supported. Pay logic is in `src/lib/loadReportsUtils.ts → calculateDriverPay()`.

| Driver Type | Pay Formula | Notes |
|-------------|-------------|-------|
| `owner-operator` | `(rate + detention) × (1 - companyDeduction%)` | Company takes a % cut of gross |
| `lease-operator` | Same as owner-operator, PLUS `leaseMilesCost` deducted from weekly net | Lease cost = totalWeeklyMiles × leaseRatePerMile |
| `company-driver` (per_mile) | `estimatedMiles × companyPayRate` | Fixed $/mile; detention does NOT affect pay |
| `company-driver` (percentage) | `(rate + detention) × companyPayRate%` | Percentage of gross including detention |

**Detention Pay rules:**
- Detention is additional pay when driver waits >2 hours at pickup or dropoff
- Stored as `detention_amount` on each load
- Added to the load rate BEFORE applying percentage deductions for owner-op, lease-op, and company-driver (percentage) types
- Included in all gross pay totals across LoadReports, ForecastSummary, and Index home snapshot
- Displayed on load cards as "+ $X detention"

**Lease Miles Cost rules:**
- Only applies to `lease-operator` driver type
- Calculated weekly: `totalOdometerMiles × leaseRatePerMile`
- Stored in `weekly_mileage.lease_miles_cost`
- Deducted from net pay AFTER all other deductions (shown as a separate line in WeeklySummary)
- Does NOT affect individual load driver pay — deducted at the weekly level

---

## Load Profitability Score

Grade each load by Rate Per Mile (driver pay ÷ estimated miles):

```javascript
function getLoadGrade(driverPay, miles) {
  const rpm = driverPay / (miles || 500); // 500mi fallback
  if (rpm >= 2.50) return { grade: 'A', label: 'EXCELLENT', color: '#2d6a2d' };
  if (rpm >= 2.00) return { grade: 'B', label: 'GOOD',      color: '#4a90d9' };
  if (rpm >= 1.50) return { grade: 'C', label: 'AVERAGE',   color: '#f0a500' };
  return              { grade: 'D', label: 'POOR',      color: '#c0392b' };
}
```

Display as a small badge (48×48px max) on top-right of each load card.
Show RPM below the grade letter: `$2.14/mi`

---

## Per Diem Rates (IRS 2025)

```javascript
const PER_DIEM_FULL_DAY    = 80.00;  // Full day away from home
const PER_DIEM_PARTIAL_DAY = 59.50;  // First and last day (75% of full)
```

Pickup day = partial. Delivery day = partial. All days in between = full.
Deduplicate dates across loads (driver may have multiple loads same day).

---

## IFTA Tax Rates (2025 — Static Lookup)

```javascript
const IFTA_DIESEL_RATES = {
  AL:0.290, AZ:0.270, AR:0.285, CA:0.610, CO:0.205, CT:0.440,
  DE:0.220, FL:0.363, GA:0.326, ID:0.320, IL:0.467, IN:0.550,
  IA:0.325, KS:0.260, KY:0.268, LA:0.200, ME:0.312, MD:0.427,
  MA:0.240, MI:0.272, MN:0.285, MS:0.180, MO:0.170, MT:0.278,
  NE:0.348, NV:0.270, NH:0.222, NJ:0.489, NM:0.210, NY:0.176,
  NC:0.385, ND:0.230, OH:0.470, OK:0.190, OR:0.380, PA:0.741,
  RI:0.370, SC:0.260, SD:0.280, TN:0.274, TX:0.200, UT:0.319,
  VT:0.308, VA:0.262, WA:0.494, WV:0.357, WI:0.309, WY:0.240
};
// Note: IFTA rates change quarterly. Update this table each quarter.
```

---

## Data Safety Rules

- Always test database migrations in development before deploying to production
- Supabase provides built-in backup and rollback capabilities
- When adding new Supabase queries, always add error handling and null checks
- Do not assume data exists — always handle missing or incomplete records gracefully

---

## Version History

| Version | Key Changes |
|---------|-------------|
| V1.2 | Original — basic loads, deductions, summary |
| V2.0 | Added Per Diem, IFTA, Weekly Forecast, Deadhead, Monthly chart, Lane Performance, State dropdowns |
| V2.1 | Mileage bug fix, Load Profitability grades (A/B/C/D), AI Receipt Scanner, Subscription/Paywall, Plain English labels, ZIP-to-ZIP auto-mileage, Weekly mileage auto-fill, WeeklyForecastCard with goal tracking |
| V2.2 | Replaced dispatcher/broker/BOL with Detention Pay, Three driver types (owner-op/lease-op/company), Lease Miles Cost weekly deduction, Company-driver per-mile and percentage pay types, Detention included in all gross totals |

---

## Real User Context

The primary test user is **Akrom Aripov** — Sanjar's uncle, an active solo
truck driver. His account: `akrom1980@gmail.com`. He has 47+ real loads
entered since Jan 2026. His weekly gross averages ~$7,000–$9,000.
He is an Early Adopter (Pro free until July 2026).

When making UX decisions, ask: *"Can Akrom do this with one thumb while
parked at a truck stop?"* If no, simplify it.

---

## What NOT to Do

- Do NOT add desktop-specific layouts (mobile-only app)
- Do NOT use technical labels visible to users (see Language Rules above)
- Do NOT show a negative number for miles — show `--` if data incomplete
- Do NOT pre-fill Load Rate with a fake number like `1200.00`
- Do NOT break existing Supabase data when adding new features or migrations
- Do NOT modify database schema without planning a migration
- Do NOT make unnecessary network calls — batch queries where possible
- Do NOT implement Stripe payments directly — add a TODO comment and simulate with Supabase for now
- Do NOT introduce new date input fields without using calendar picker Popover pattern
- Do NOT break existing component patterns or styling conventions
- Do NOT show the logout button as a top-level CTA in the header — it belongs inside Settings
- Do NOT show the "WELCOME, [NAME]" greeting on the Home screen — it wastes space
- Do NOT allow any raw code variable names (`SNAKE_CASE`, underscores, ALL_CAPS system strings) to render as user-facing text
- Do NOT use a space as a thousands separator in numbers — always use a comma (`5,059` not `5 059`)
- Do NOT expand all Personal Expense category forms by default — collapse them, expand on tap
- Do NOT truncate lane names in Lane Performance or IFTA — allow text to wrap

---

## Sprint Status (as of April 2026)

### ✅ Done
- Load Reports with weekly navigation, mileage, loads list
- Deductions (fixed + weekly fuel/toll/custom)
- Earnings Summary (multi-period, YTD, monthly chart, lane performance)
- Per Diem page
- IFTA Report page
- Weekly Pay Forecast ("AT THIS PACE")
- State dropdowns on Add Load form
- Early Adopter Pro bonus
- Version V2.1
- Fixed blank space on Home screen
- Replaced all technical labels with plain English throughout
- Added live weekly snapshot on Home screen (Loads, Earned, Expenses, Take-Home)
- Added info icons with tooltips on snapshot stats explaining calculations
- Simplified Add Load form (placeholder $0.00, pre-fill dates, company deduction moved to optional)
- Made Driver Pay the hero number on load cards
- Converted all date input fields to calendar picker dropdowns (LoadCard, WeeklySummary, PersonalExpenses, ReceiptScanner)
- ZIP-to-ZIP auto-mileage tracking via Google Maps (Geocoding + Distance Matrix APIs)
- **Load Profitability grade badges (A/B/C/D)** on load cards — based on RPM, color-coded with RPM value shown
- **Deadhead miles calculation** — total odometer miles minus sum of load estimated miles (shown in MileageTracking)
- **Weekly mileage auto-fill** — start mileage pre-fills from previous week's end; end mileage pre-fills from next week's start
- **Three driver types** — owner-operator, lease-operator, company-driver — with correct pay formulas for each
- **Lease Miles Cost** — weekly cost (miles × leaseRatePerMile) deducted from net pay for lease-operator drivers only; stored in weekly_mileage table
- **Company-driver pay types** — per-mile (fixed $/mile rate) and percentage (% of gross); configured in profile settings
- **Detention Pay field** — replaces dispatcher/broker/BOL fields; added to gross before deductions; shown on load cards and included in all gross totals (LoadReports, ForecastSummary, home snapshot)
- **WeeklyForecastCard** — projects weekly gross/net with confidence level (LOW/MODERATE/HIGH), progress bar toward weekly goal, loads needed to hit goal, comparison vs. historical average
- Version V2.2

### 🔄 In Progress / Next Up
- **Bottom tab bar navigation** (highest UX priority — see UI/UX Improvement Backlog #4)
- Fix remaining code label strings in production (see UI/UX Improvement Backlog #1)
- Move logout out of header into Settings (see UI/UX Improvement Backlog #2)
- Lane Performance RPM column
- Annual Income Goal (Settings + YTD progress bar)
- Multi-load mileage estimation (when 6+ loads entered)

### 📋 Backlog
- Stripe payment integration (replace localStorage simulation)
- PDF export for weekly reports and IFTA (see also UI/UX Improvement Backlog #7)
- Push notifications for end-of-week reminders
- App Store / Google Play native wrapper (Capacitor recommended)
- Personal Expenses accordion collapse (UI/UX Improvement Backlog #6)
- IFTA export button (UI/UX Improvement Backlog #7)
- Per Diem configurable tax bracket (UI/UX Improvement Backlog #20)
- Home screen weekly goal progress bar (UI/UX Improvement Backlog #22)
- Persist Early Adopter banner dismissal (UI/UX Improvement Backlog #13)
- Pay Breakdown visual hierarchy (UI/UX Improvement Backlog #16)