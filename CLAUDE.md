# CLAUDE.md — TruckPay Project

> This file gives Claude full context about the TruckPay project.
> Read this entirely before writing any code or making any suggestions.

---

## What Is TruckPay

TruckPay (truckpay.app) is a Progressive Web App (PWA) for truck drivers to track
their weekly earnings, deductions, and expenses. It is built and maintained by
Sanjar Azizov. The app is currently in active use by real truck drivers.

The app is **vanilla JavaScript, HTML, and CSS — no frameworks, no build tools,
no backend**. All data is stored in the browser's localStorage. It must work
fully offline. Do not introduce React, Vue, npm packages, or any external
dependencies unless explicitly asked.

Current live version: **V2.1**

---

## Tech Stack

- **Frontend:** Vanilla JS, HTML5, CSS3
- **Storage:** localStorage only (no backend, no database)
- **Hosting:** truckpay.app (Netlify or similar static host)
- **AI integration:** Anthropic Claude API (claude-sonnet-4-20250514) for
  receipt scanning via vision — called directly from client-side fetch()
- **No build step** — edit files directly, changes go live immediately
- **PWA** — has a service worker and manifest.json for installability

---

## File Structure

The app is likely a single `index.html` with embedded or linked:
- All JS in one or a few `.js` files
- All CSS in one or a few `.css` files
- `manifest.json` for PWA
- `sw.js` for service worker

When modifying, always ask which file a section lives in before editing.
Do not create new files unless instructed — keep the codebase minimal.

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

### Dates
Display format: `Mon DD, YYYY` (e.g. `Apr 06, 2026`)
Storage format: `YYYY-MM-DD` (ISO)

---

## Data Architecture

All data lives in localStorage. Keys follow the pattern `truckpay_XXXXX`.

### Profile — `truckpay_profile`
```json
{
  "name": "Akrom Aripov",
  "phone": "6787022212",
  "email": "akrom1980@gmail.com",
  "driverType": "solo",
  "companyDeduction": 11,
  "weeklyPeriod": "monday",
  "annualGoal": null,
  "weeklyGoal": null
}
```

### Loads — `truckpay_loads`
```json
[{
  "id": "uuid",
  "origin": "Georgia",
  "destination": "Texas",
  "pickupDate": "2026-03-14",
  "deliveryDate": "2026-03-15",
  "loadRate": 1607.00,
  "deductionRate": 11,
  "weekId": "2026-W11",
  "deadheadMiles": null,
  "loadMiles": null,
  "dispatcher": { "name": "", "company": "", "phone": "" },
  "broker": { "name": "", "company": "" },
  "bolNumber": "",
  "notes": ""
}]
```

### Deductions — `truckpay_deductions`
```json
[{
  "id": "uuid",
  "type": "FUEL",
  "amount": 975.00,
  "date": "2026-03-09",
  "weekId": "2026-W10",
  "isFixed": false,
  "receiptPhoto": null
}]
```

### Fixed Deductions — `truckpay_fixed_deductions`
```json
[{
  "id": "uuid",
  "name": "Weekly Insurance",
  "amount": 345.00,
  "isFixed": true,
  "effectiveFrom": "2025-11-01"
}]
```

### Weekly Mileage — `truckpay_mileage`
```json
{
  "2026-W11": { "startMileage": 992950, "endMileage": 997572 },
  "2026-W12": { "startMileage": 997572, "endMileage": 0 }
}
```

### Subscription — `truckpay_subscription`
```json
{
  "tier": "pro",
  "startDate": "2026-01-01",
  "endDate": "2026-07-02",
  "trialUsed": false,
  "earlyAdopter": true
}
```

### Schema Version — `truckpay_schema_version`
Integer. Currently `3`. Increment when data structure changes and add migration.

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

## Mileage Calculation — CRITICAL BUG CONTEXT

**The bug:** Multi-week mileage totals showed large negative numbers (e.g. -998,600).

**Root cause:** Code was doing `lastWeekEnd - firstWeekStart` across the full
period instead of summing per-week deltas. When any week has `endMileage = 0`
(not yet entered), the result goes massively negative.

**Correct approach — always use this:**
```javascript
function getTotalMilesForPeriod(weekIds) {
  let total = 0;
  weekIds.forEach(weekId => {
    const m = mileageData[weekId];
    if (m && m.startMileage > 0 && m.endMileage > 0) {
      const diff = m.endMileage - m.startMileage;
      if (diff > 0 && diff < 15000) { // sanity check
        total += diff;
      }
    }
  });
  return total;
}
```

**Also:** If `endMileage` is 0 or missing for a week, show `--` for that
week's miles and RPM. Never show a negative number or calculate with 0.

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

The app was using developer-style labels. All text must be plain English
that a non-technical truck driver understands. Enforce this on every new
feature:

| ❌ Never use | ✅ Use instead |
|-------------|---------------|
| `WEEK_MANAGEMENT_SYSTEM` | Remove — don't show at all |
| `PREV_WEEK` / `NEXT_WEEK` | `← Last Week` / `Next Week →` |
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
| `SHOW OPTIONAL FIELDS (deadhead, dispatcher, BOL...)` | `+ More Details` |

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

## Known Issues (Do Not Re-introduce)

1. **Giant blank space on Home screen** — there is extra whitespace between the
   profile card and the navigation tiles. The cause is likely a min-height or
   padding on a container div. Fix by removing excessive spacing.

2. **Mileage bug** — described above. Fixed in V2.1. Do not revert.

3. **Desktop layout breaks** — the app renders wide blank columns on desktop.
   This is acceptable for now — the app is mobile-only. Do not attempt a
   desktop redesign unless asked.

---

## AI Receipt Scanner — Implementation Notes

Located in Deductions page. Button: "📷 Scan Receipt with AI"

```javascript
// API call — client side, no API key needed (handled by proxy or env)
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
          source: { type: "base64", media_type: "image/jpeg", data: base64Image }
        },
        {
          type: "text",
          text: `Analyze this receipt for a truck driver. Return ONLY valid JSON:
{"merchant":"name","category":"FUEL|TOLL|MAINTENANCE|PARTS|FOOD|LODGING|OTHER","amount":0.00,"date":"YYYY-MM-DD","notes":"brief description"}
If date unclear use null. If amount unclear use null.`
        }
      ]
    }]
  })
});
```

**Image handling:**
- Compress before API: max 1024px, JPEG quality 0.80
- Compress before storage: max 800px, JPEG quality 0.65
- Process multiple images sequentially, not in parallel
- Show progress: "Processing 2 of 4 receipts..."

**Storage warning:** localStorage is ~5MB. Show usage bar in Settings.
Warn at 80% full. Add "Clear Old Receipt Photos" option.

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

Before ANY destructive operation (clear, import, schema migration):
```javascript
localStorage.setItem(
  'truckpay_backup_' + Date.now(),
  JSON.stringify(exportAllData())
);
```

Always wrap localStorage in try/catch — it can be full or disabled:
```javascript
try {
  localStorage.setItem(key, value);
} catch (e) {
  showError('Storage full. Please export your data to free up space.');
}
```

---

## Version History

| Version | Key Changes |
|---------|-------------|
| V1.2 | Original — basic loads, deductions, summary |
| V2.0 | Added Per Diem, IFTA, Weekly Forecast, Deadhead, Dispatcher fields, Monthly chart, Lane Performance, State dropdowns |
| V2.1 | Mileage bug fix, Load Profitability grades, Lane RPM, AI Receipt Scanner, Subscription/Paywall, Annual Goal, Edit on Summary loads, Plain English labels |

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

- Do NOT add React, Vue, or any JS framework
- Do NOT add npm dependencies or a build step
- Do NOT create a backend or database — localStorage only
- Do NOT add desktop-specific layouts (mobile-only app)
- Do NOT use technical labels visible to users (see Language Rules above)
- Do NOT show a negative number for miles — show `--` if data incomplete
- Do NOT pre-fill Load Rate with a fake number like `1200.00`
- Do NOT break existing data in localStorage when adding new features
- Do NOT introduce new localStorage keys without documenting them here
- Do NOT make network calls in offline-critical paths (mileage, loads list)
- Do NOT implement Stripe payments directly — add a TODO comment and
  simulate with localStorage for now

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
- Optional fields: deadhead, dispatcher, broker, BOL
- Early Adopter Pro bonus
- Version V2.1

### 🔄 In Progress / Next Up
- Bottom tab bar navigation (highest UX priority)
- Fix blank space on Home screen
- Load Profitability grade badges on load cards
- Lane Performance RPM column
- AI Receipt Scanner (flagship Pro feature)
- Annual Income Goal (Settings + YTD progress bar)
- Edit button on Summary load cards
- Plain English label replacement throughout

### 📋 Backlog
- Stripe payment integration (replace localStorage simulation)
- OpenRouteService API for auto-filling load miles
- PDF export for weekly reports and IFTA
- Push notifications for end-of-week reminders
- App Store / Google Play native wrapper
