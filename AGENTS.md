# AGENTS.md — TruckPay Project

> This file gives Codex full context about the TruckPay project.
> Read this entirely before writing any code or making any suggestions.

---

## What Is TruckPay

TruckPay (truckpay.app) is a Progressive Web App (PWA) for truck drivers to track
their weekly earnings, deductions, and expenses. It is built and maintained by
Sanjar Azizov. The app is currently in active use by real truck drivers.

Current live version: **V2.3**

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite 5
- **UI Components:** shadcn/ui (Button, Input, Card, Popover, Calendar, Select, Dialog, etc.)
- **Styling:** Tailwind CSS 3 + custom brutal design system classes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (email/password + Google + LinkedIn social auth)
- **AI integration:** OpenAI gpt-4o for receipt scanning via vision — called via Supabase Edge Function
- **Charts:** Recharts 2
- **Utilities:** date-fns 3 for date manipulation, lucide-react for icons
- **PWA:** Service worker and manifest.json for installability
- **Hosting:** Netlify — live at **truckpay.app**

---

## File Structure

```
src/
  pages/
    Index.tsx          — Main app shell (all views, routing, modals, tab bar)
    NotFound.tsx       — 404 page
  components/
    AddLoadForm.tsx         — Add/edit load form (ZIP lookup, dates, rate, detention)
    LoadReports.tsx         — Load management page (weekly loads, summary, mileage)
    LoadReportsHeader.tsx   — Week navigation header with period display
    LoadCard.tsx            — Individual load card (edit/delete inline)
    LoadSummaryCards.tsx    — Gross/net/expenses cards for the week
    WeeklySummary.tsx       — Weekly breakdown of loads and deductions
    WeeklyForecastCard.tsx  — Projected gross/net with confidence level and goal bar
    MileageTracking.tsx     — Odometer start/end entry, deadhead miles display
    Deductions.tsx          — Fixed deductions management
    DeductionsSummary.tsx   — Summary view of deductions
    ForecastSummary.tsx     — Multi-period earnings analysis, charts, lane performance
    PersonalExpenses.tsx    — Personal (non-truck) expenses by category
    ReceiptScanner.tsx      — AI receipt photo capture and review modal
    PerDiemCalculator.tsx   — IRS meal deduction calculator
    IFTAReport.tsx          — IFTA quarterly fuel tax report
    SettingsPanel.tsx       — Profile, goals, subscription, password, account deletion
    LoginPage.tsx           — Email/password + Google + LinkedIn login
    Registration.tsx        — New user onboarding (profile + driver type setup)
    ResetPasswordPage.tsx   — Password recovery flow (intercepts magic link)
    UpgradeModal.tsx        — Tier comparison and upgrade/trial modal
    SubscriptionSuccessModal.tsx — Post-upgrade success confirmation
    ConfirmationDialog.tsx  — Generic confirm/cancel dialog
    LocationCombobox.tsx    — Location autocomplete
    SummaryCards.tsx        — Generic summary card component
    WeekNavigation.tsx      — Standalone week nav (used in some contexts)
  hooks/
    useAuth.tsx             — Auth context (user, signOut, isPasswordRecovery, isSocialAuth)
    useSubscription.tsx     — Subscription tier, feature gating, trial/upgrade logic
    useLoadReports.ts       — Load CRUD, week navigation, newLoad state
    useDeductionsManager.ts — Weekly deductions and extra deductions CRUD
    useMileageManager.ts    — Odometer entry, auto-fill from adjacent weeks
    useZipLookup.ts         — Google Maps ZIP → city/state + distance lookup
    use-mobile.tsx          — Mobile viewport detection
  lib/
    loadReportsUtils.ts     — calculateDriverPay(), getWeeklyPeriodDisplay(), calculateFixedDeductionsForWeek()
    weeklyPeriodUtils.ts    — getUserWeekStart(), getUserWeekEnd(), getWeekStartsOn()
    utils.ts                — cn() tailwind class merge helper
  types/
    LoadReports.ts          — Load, NewLoad, WeeklyMileage, ExtraDeduction, DeleteConfirmation interfaces
  integrations/
    supabase/client.ts      — Supabase client singleton
  styles/                   — Global CSS
public/                     — manifest.json, service worker, icons
supabase/functions/
  scan-receipt/             — OpenAI gpt-4o receipt parser
  driving-distance/         — Google Maps distance between two ZIPs
  create-checkout-session/  — Stripe Checkout session creator
  create-portal-session/    — Stripe Customer Portal session creator
  stripe-webhook/           — Stripe event handler (subscription lifecycle)
  calculate-ifta-miles/     — IFTA state mileage calculator
```

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
Display format: `MMM D, YYYY` (e.g. `Apr 6, 2026`) — use `format(date, 'MMM d, yyyy')` from date-fns.
Storage format: `YYYY-MM-DD` (ISO).
All date picker buttons use calendar Popover pattern — never a plain `<input type="date">`.

### PRO Lock Badge (locked nav tiles)
```tsx
<div className="absolute top-2 right-2 flex items-center gap-1">
  <span className="brutal-mono text-xs font-bold px-1.5 py-0.5 rounded"
    style={{ background: '#f0a500', color: '#1a1a2e', fontSize: '10px', lineHeight: 1 }}>PRO</span>
  <Lock className="w-3 h-3 opacity-60" />
</div>
```
Applied to: SUMMARY, PER DIEM, IFTA tiles on the home dashboard.

---

## Data Architecture

All data is stored in Supabase PostgreSQL. User authentication via Supabase Auth.
Components fetch data via Supabase client with error handling and null checks.

### Key Tables

**profiles** — User profile settings
- name, email, phone, weeklyPeriod, annualGoal, weeklyGoal
- driverType: `'owner-operator'` | `'lease-operator'` | `'company-driver'`
- companyDeduction (% deducted for owner-operator and lease-operator)
- companyPayType: `'per_mile'` | `'percentage'` (company-driver only)
- companyPayRate: $/mile or % value depending on companyPayType
- leaseRatePerMile: cost per mile for lease-operator (deducted from net weekly)
- earlyAdopterBannerDismissed: boolean — persisted so banner never reappears after dismissal

**load_reports** — Truck loads with earnings data
- id, user_id, location_from, location_to, pickup_date, delivery_date, rate, company_deduction, driver_pay, week_period, date_added
- deadhead_miles, estimated_miles
- pickup_zip, delivery_zip, pickup_city_state, delivery_city_state (auto-populated via Google Maps)
- detention_amount (added when driver waits >2 hours — adds to gross before deductions)
- notes

**weekly_deductions** — Per-week typed deductions (FUEL, TOLL, MAINTENANCE, etc.)
- id, user_id, week_start, deduction_type, amount, updated_at

**weekly_extra_deductions** — One-off weekly expenses (free-text name)
- id, user_id, week_start, name, amount, date_added

**fixed_deductions** — Recurring weekly costs effective from a date
- id, user_id, name, amount, effectiveFrom

**weekly_mileage** — Odometer readings per week
- id, user_id, week_start (ISO date string), startMileage, endMileage
- leaseMilesCost (only populated for lease-operator drivers)

**subscriptions** — User subscription tier and status
- id, user_id, tier, startDate, endDate, trialUsed, earlyAdopter, earlyAdopterBannerDismissed
- stripeCustomerId, stripeSubscriptionId (set by webhook)

**personal_expense_types** — User-defined personal expense categories
- id, user_id, name

**personal_expenses** — Individual personal expense entries
- id, user_id, expense_type_id, amount, note, date

---

## Week ID / Week Start Calculation

Week starts are ISO date strings (`YYYY-MM-DD`) based on the user's `weeklyPeriod` setting.
Always use these helpers from `src/lib/weeklyPeriodUtils.ts`:

```typescript
getUserWeekStart(date, userProfile)  // → Date of week start for given date
getUserWeekEnd(date, userProfile)    // → Date of week end for given date
```

The `weeklyPeriod` field maps to a day-of-week offset:
- `'sunday'` → week starts Sunday (default)
- `'monday'` → week starts Monday
- (tuesday through saturday also supported)

Week period display strings (from `getWeeklyPeriodDisplay()` in `loadReportsUtils.ts`):
```
'sunday'    → 'Sun – Sat'
'monday'    → 'Mon – Sun'
'tuesday'   → 'Tue – Mon'
'wednesday' → 'Wed – Tue'
'thursday'  → 'Thu – Wed'
'friday'    → 'Fri – Thu'
'saturday'  → 'Sat – Fri'
```

---

## Subscription Tiers

| Tier | Price | Gated Features |
|------|-------|----------------|
| Free | $0 | Current week only, max 5 loads/week |
| Pro | $14.99/mo or $9.99/mo (annual, $119.88/yr) | Full history, IFTA, Per Diem, CSV export, YTD, AI Receipt Scanner, Weekly Forecast |
| Owner-Op | $29.99/mo or $19.99/mo (annual, $239.88/yr) | Everything in Pro + Dispatcher Book, Lane Analytics, Annual Goal |

**PRO features** (from `useSubscription.tsx`):
`ifta`, `perdiem`, `ytd`, `fullHistory`, `export`, `receipts`, `forecast`

**OWNER features** (in addition to Pro):
`dispatcher`, `laneAnalytics`, `annualGoal`, `multiTruck`

**Early Adopter rule:** Users with pre-existing loads/deductions get `earlyAdopter: true` and 90 days of Pro free. The auto-detection code is currently disabled (TODO in useSubscription.tsx line ~210) — early adopter status is set manually.

**Trial:** 7-day free Pro trial, no payment required. One-time per account (`trialUsed` flag).

**Paywall triggers:**
- Navigating to SUMMARY, IFTA, or PER DIEM (Free tier)
- Clicking "Scan Receipt with AI" (Free tier)
- Navigating to any week older than current (Free tier)
- Adding 6th load in a week (Free tier)

**UpgradeModal defaults:**
- Billing toggle defaults to `'annual'` (Annual shown first, saves ~33%)
- Cards always render side-by-side (2-column grid, no mobile stack)
- Pro features listed: Full load history, IFTA reports, Per Diem tracker, AI receipt scanner
- Owner-Op features listed: Everything in Pro, Dispatcher book, Lane analytics, Annual goal tracking
- Trial button at bottom (amber primary style) — shown only if `!subscription.trialUsed`

---

## Stripe Integration

**Account:** `acct_1TLaKsDDJ9hkmBpw` (live mode)

### Products & Prices

| Plan | Billing | Price ID | Amount | Payment Link |
|------|---------|----------|--------|--------------|
| Pro | Monthly | `price_1TLainDDJ9hkmBpwH8pF7LXu` | $14.99/mo | https://buy.stripe.com/dRmdR9f19aEsb49ayag7e00 |
| Pro | Annual | `price_1TLaiqDDJ9hkmBpw2EEWTeIv` | $119.88/yr | https://buy.stripe.com/eVq28r6uD5k8got21Eg7e01 |
| Owner-Op | Monthly | `price_1TLaitDDJ9hkmBpwG40JiG5d` | $29.99/mo | https://buy.stripe.com/eVq00j6uDcMA1tzfSug7e02 |
| Owner-Op | Annual | `price_1TLaiwDDJ9hkmBpwZ1jI886S` | $239.88/yr | https://buy.stripe.com/14AaEX7yH3c03BH0XAg7e03 |

### Edge Functions (all deployed)

1. **`create-checkout-session`** — Creates Stripe Checkout session
   - Receives: `{ priceId, userId }`
   - Returns: `{ url }` — redirect to Stripe-hosted checkout
   - On success, Stripe redirects to `https://truckpay.app/?checkout=success`

2. **`stripe-webhook`** — Handles Stripe lifecycle events (deployed with `--no-verify-jwt`)
   - Always verify `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Price-to-tier map:
     ```javascript
     const PRICE_TO_TIER = {
       'price_1TLainDDJ9hkmBpwH8pF7LXu': 'pro',
       'price_1TLaiqDDJ9hkmBpw2EEWTeIv': 'pro',
       'price_1TLaitDDJ9hkmBpwG40JiG5d': 'owner-op',
       'price_1TLaiwDDJ9hkmBpwZ1jI886S': 'owner-op',
     };
     ```

3. **`create-portal-session`** — Creates Stripe Customer Portal session for self-serve management

**Supabase secrets required:**
```bash
supabase secrets set STRIPE_SECRET_KEY sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET whsec_...
supabase secrets set OPENAI_API_KEY sk-proj-...
```

---

## Pages / Views

The app uses `currentView` state in `Index.tsx` — no URL routing. All views rendered in place.

| View key | Name | Notes |
|----------|------|-------|
| `dashboard` | Home | Weekly snapshot, nav tiles, scan receipt, early adopter banner |
| `loads` | Load Reports | Week navigation, mileage, loads list, forecast card |
| `deductions` | Deductions | Fixed + weekly deductions |
| `forecast` | Earnings Summary | Multi-period analysis, charts, lane performance (PRO) |
| `expenses` | Personal Expenses | Personal expense categories (YTD default) |
| `perdiem` | Per Diem | IRS meal deduction calculator (PRO) |
| `ifta` | IFTA Report | Quarterly fuel tax report (PRO) |
| `settings` | Settings | Profile, goals, subscription, password, account deletion |

### Home Dashboard Layout (dashboard view)

1. Header: Logo + "TRUCKPAY / DRIVE SMART. EARN MORE." + Settings gear button
2. Weekly Snapshot card — Loads, Earned (gross), Expenses, Take-Home (net)
   - Shows weekly goal progress bar if `truckpay_weekly_goal` set in localStorage
   - Shows "Set a weekly goal →" link to Settings if not set
3. "Add your first load to get started" callout (amber button) — shown only when `weekSnapshot.loadCount === 0`
4. "SCAN RECEIPT WITH AI" button — shown only when `isFeatureAllowed('receipts')` is true
5. Early Adopter banner — shown when `earlyAdopter && !earlyAdopterBannerDismissed && endDate`
6. 6 nav tiles in 2-column grid (order matters):
   1. LOAD REPORTS — "Manage Loads"
   2. DEDUCTIONS — "Truck Expenses"
   3. PERSONAL EXPENSES — "Track Expenses"
   4. SUMMARY — "Earnings Breakdown" **[PRO badge if locked]**
   5. PER DIEM — "IRS Meal Deduction" **[PRO badge if locked]**
   6. IFTA REPORT — "Fuel Tax Filing" **[PRO badge if locked]**
7. Footer: `TRUCKPAY V2.3`

### Bottom Tab Bar (mobile only, `md:hidden`)

5 tabs: Loads | Expenses | **+ Add Load (center)** | Summary | More

"More" sheet contains: Personal Expenses, Per Diem, IFTA Report, Settings, Logout.

---

## LocalStorage

Only two keys are intentionally stored:
- `truckpay_weekly_goal` — user's weekly take-home goal (number string)
- `truckpay_annual_goal` — user's annual income goal (number string)

All other `truckpay_*` keys are stripped on app init (stale data guard) and all keys are cleared on logout/account deletion. **Never store subscription tier, early adopter status, or session data in localStorage** — those live only in the Supabase `subscriptions` table.

```typescript
const ALLOWED_LOCAL_KEYS = new Set(['truckpay_weekly_goal', 'truckpay_annual_goal']);
```

---

## Add Load Form

**Required fields:** Pickup ZIP, Delivery ZIP, Load Rate

**Auto-populated:** Pickup/Delivery city+state (via ZIP lookup), Estimated Miles (Google Maps distance)

**Always preselected:** Pickup Date and Delivery Date both default to `new Date()` (today) — they are actual `Date` objects in state, not strings. The calendar shows today highlighted on open.

**Optional fields** (behind "More Details" toggle):
- Company Deduction % (hidden for company-driver type)
- Detention Pay ($)
- Notes

**Chevron behavior:** `ChevronRight` when collapsed → `ChevronDown` when expanded.

**Submit button:** Amber (#f0a500), navy text (#1a1a2e), disabled until both ZIPs resolve successfully.

**Validation:** Rate > 0, both ZIPs exactly 5 digits, both ZIPs must successfully resolve before submit is enabled.

---

## AI Receipt Scanner

**Entry points:**
1. **Personal Expenses page** — "SCAN RECEIPT WITH AI" button
2. **Home dashboard** — "SCAN RECEIPT WITH AI" button (PRO users only) → destination picker first

**Destination picker (home only):** User chooses between:
- **Personal Expense** → saves to `personal_expenses` table (creates `personal_expense_types` row if needed)
- **Truck / Work Expense** → saves to `weekly_extra_deductions` keyed to the week matching the receipt's date (uses `getUserWeekStart(receiptDate, userProfile)`)

**Flow:**
1. Take photo (mobile) or upload files (desktop)
2. Images compressed: max 1024px, JPEG 0.80 quality
3. Call `supabase/functions/scan-receipt/` with base64 image
4. Receive: `{ merchant, category, amount, date, notes }`
5. Review/edit in modal (merchant, category select, amount, date picker)
6. Confirm → auto-create category if needed → save expense

**Supported categories:** FUEL, TOLL, MAINTENANCE, PARTS, FOOD, LODGING, OTHER

---

## ZIP-to-ZIP Mileage Tracking

1. User enters pickup ZIP → `useZipLookup` calls `driving-distance` edge function → resolves city/state
2. User enters delivery ZIP → same lookup
3. Both resolved → distance calculated via Google Maps Distance Matrix → shown as Estimated Miles (editable)

**Key files:**
- `src/hooks/useZipLookup.ts` — state and edge function calls
- `supabase/functions/driving-distance/index.ts` — Google Maps API
- Timeout: 10-second AbortController per call

---

## Driver Types & Pay Calculations

Pay logic lives in `src/lib/loadReportsUtils.ts → calculateDriverPay()`.

| Driver Type | Pay Formula | Notes |
|-------------|-------------|-------|
| `owner-operator` | `(rate + detention) × (1 - companyDeduction%)` | Company takes % of gross |
| `lease-operator` | Same as owner-operator, PLUS `leaseMilesCost` deducted from weekly net | Lease cost = totalOdometerMiles × leaseRatePerMile |
| `company-driver` (per_mile) | `estimatedMiles × companyPayRate` | Detention does NOT affect pay |
| `company-driver` (percentage) | `(rate + detention) × companyPayRate%` | Percentage of gross including detention |

**Detention Pay:** Added to gross BEFORE applying deduction % for owner-op, lease-op, and company-driver (percentage). Stored as `detention_amount` per load. Shown on load cards as `+ $X detention`.

**Lease Miles Cost:** Only for lease-operator. Weekly: `totalOdometerMiles × leaseRatePerMile`. Stored in `weekly_mileage.leaseMilesCost`. Deducted at the weekly level, not per-load.

---

## Load Profitability Score

```javascript
function getLoadGrade(driverPay, miles) {
  const rpm = driverPay / (miles || 500); // 500mi fallback
  if (rpm >= 2.50) return { grade: 'A', label: 'EXCELLENT', color: '#2d6a2d' };
  if (rpm >= 2.00) return { grade: 'B', label: 'GOOD',      color: '#4a90d9' };
  if (rpm >= 1.50) return { grade: 'C', label: 'AVERAGE',   color: '#f0a500' };
  return              { grade: 'D', label: 'POOR',      color: '#c0392b' };
}
```

Shown as badge (48×48px max) on top-right of each load card with RPM: `$2.14/mi`.

---

## Per Diem Rates (IRS 2025)

```javascript
const PER_DIEM_FULL_DAY    = 80.00;  // Full day away from home
const PER_DIEM_PARTIAL_DAY = 59.50;  // First and last day (75%)
```

Pickup day = partial. Delivery day = partial. All days between = full.
Dates deduplicated across loads (driver may have multiple loads on same day).

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
// Update this table each quarter — IFTA rates change.
```

---

## Authentication

**Login:** Email/password, Google OAuth, LinkedIn OAuth
**Social auth:** Users who sign in via Google/LinkedIn are redirected to Registration to complete their profile (driver type, company deduction, etc.) if `userProfile.driverType` is missing.

**Forgot Password:**
- "Forgot password?" link on login page
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/' })`
- User clicks magic link → app intercepts `PASSWORD_RECOVERY` auth event → shows `ResetPasswordPage`
- Never hardcode domain in `redirectTo` — always use `window.location.origin`

**Change Password (Settings):** Dedicated section with New Password + Confirm, validates match and min 6 chars.

**Supabase dashboard requirements:**
- Site URL: `https://truckpay.app`
- Redirect URLs allowlist: `https://truckpay.app/**`

---

## Period Filters

**ForecastSummary (Earnings Summary page):**
Default: `'ytd'` (Year-to-Date). Options: Last 2 weeks, Last 3 weeks, Last 4 weeks, YTD, Custom range.

**PersonalExpenses page:**
Default: `'ytd'` (Year-to-Date, Jan 1 → today). Options: Year to Date, Last 2 weeks, Last 3 weeks, Last 4 weeks, Custom range.

---

## Language Rules — Plain English Only

The app must never show developer-style variable names or code strings to the user.
All text must be plain English that a non-technical truck driver understands.

| ❌ Never use | ✅ Use instead |
|-------------|---------------|
| `WEEK_MANAGEMENT_SYSTEM` | Remove entirely |
| `EXPENSE_MANAGEMENT_SYSTEM` | Remove entirely |
| `DEDUCTION_TYPES` | `Deduction Types` |
| `SET_RECURRING_WEEKLY_AMOUNTS` | `Set recurring weekly amounts` |
| `CURRENT_FIXED_DEDUCTIONS` | `Current Fixed Deductions` |
| `ADD_NEW_DEDUCTION_TYPE` | `Add New Deduction Type` |
| `ENTER_NAME` | `Enter name` |
| `ADD_TYPE` | `+ Add Type` |
| `WEEKLY_AMOUNT_($)` | `Weekly Amount ($)` |
| `FIXED_AT_$X.XX/WEEK` | `Fixed at $X.XX/week` |
| `EFFECTIVE_FROM_MMM_D,_YYYY` | `Effective from MMM D, YYYY` |
| `ADMIN_FEE` (as label) | `Admin Fee` |
| `WEEKLY__INSURANCE` (double underscore) | `Weekly Insurance` |
| `PREV_WEEK` / `NEXT_WEEK` | `← Last Week` / `Next Week →` |
| `CURRENT_WEEK` | Remove — date range says it already |
| `MONDAY_TO_SUNDAY` | `Mon – Sun` |
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
- **Bottom tab bar** — 5 tabs (Loads | Expenses | + Add Load | Summary | More), hidden on `md+` screens
- **Forms:** Pickup and delivery dates always preselected to `new Date()` as a `Date` object — driver changes only if needed
- **Load Rate field:** Show `$0.00` placeholder — never pre-fill a value
- **Empty states:** Every list must have a helpful empty state message, not blank space
- **Personal Expenses:** Forms collapsed by default — expand on tap (accordion pattern)

---

## Data Safety Rules

- Always test database migrations in development before deploying to production
- Always add error handling and null checks to Supabase queries
- Do not assume data exists — handle missing or incomplete records gracefully
- Never store sensitive data (subscription tier, session tokens) in localStorage

---

## Known Issues (Do Not Re-introduce)

1. **Mileage bug** — fixed in V2.1. Always sum per-week deltas (endMileage − startMileage per week). Never subtract first-week-start from last-week-end. Show `--` if endMileage is 0 or missing.

2. **Desktop layout** — app renders wide blank columns on desktop. Acceptable for now — mobile-only. Do not attempt a desktop redesign unless asked.

3. **pickupDate/deliveryDate type** — these must be `Date | undefined` objects in NewLoad state, never ISO strings. Using strings breaks the calendar `selected` prop and the date never shows as highlighted.

---

## Real User Context

The primary test user is **Akrom Aripov** — Sanjar's uncle, an active solo
truck driver. His account: `akrom1980@gmail.com`. He has 47+ real loads
entered since Jan 2026. His weekly gross averages ~$7,000–$9,000.
He is an Early Adopter (Pro free always).

When making UX decisions, ask: *"Can Akrom do this with one thumb while
parked at a truck stop?"* If no, simplify it.

---

## What NOT to Do

- Do NOT add desktop-specific layouts (mobile-only app)
- Do NOT use technical labels visible to users (see Language Rules above)
- Do NOT show a negative number for miles — show `--` if data incomplete
- Do NOT pre-fill Load Rate with a fake number
- Do NOT break existing Supabase data when adding new features or migrations
- Do NOT modify database schema without planning a migration
- Do NOT make unnecessary network calls — batch queries where possible
- Do NOT skip Stripe webhook verification — always validate `stripe-signature`
- Do NOT introduce new date input fields without using calendar picker Popover pattern
- Do NOT show the logout button as a top-level CTA — it belongs inside Settings only
- Do NOT allow raw code variable names (`SNAKE_CASE`, ALL_CAPS system strings) to render as user-facing text
- Do NOT use a space as a thousands separator — always use a comma (`5,059` not `5 059`)
- Do NOT expand all Personal Expense category forms by default — collapse them, expand on tap
- Do NOT truncate lane names in Lane Performance or IFTA — allow text to wrap
- Do NOT hardcode a domain in `redirectTo` for Supabase auth emails — always use `window.location.origin`
- Do NOT store subscription status, early adopter flag, or tier info in localStorage — DB only
- Do NOT initialize `pickupDate` or `deliveryDate` as ISO strings — use `new Date()` (Date object)
- Do NOT show the "Add your first load" callout unless `weekSnapshot.loadCount === 0`
- Do NOT show the "WELCOME, [NAME]" greeting on the Home screen

