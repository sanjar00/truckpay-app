/**
 * Calculate driver pay for a single load based on driver type.
 *
 * Multi-stop note: for multi-stop loads, pass the SUM of per-stop detention as
 * `detentionAmount` and the SUM of per-stop stop-off fees as `stopOffFees`.
 * Single-stop callers can omit `stopOffFees` entirely (defaults to 0) — their
 * behavior is unchanged.
 *
 * owner-operator / lease-operator:
 *   driverPay = (rate + detention + stopOffFees) * (1 - companyDeduction / 100)
 *   (lease weekly mileage cost is deducted at the weekly level, not per-load)
 *
 * company-driver, per_mile:
 *   driverPay = estimatedMiles * companyPayRate
 *   (detention and stop-off fees do NOT affect per-mile pay)
 *
 * company-driver, percentage:
 *   driverPay = (rate + detention + stopOffFees) * (companyPayRate / 100)
 */
export const calculateDriverPay = (
  rate: number,
  userProfile: {
    driverType?: string;
    companyDeduction?: number | string;
    companyPayType?: string;
    companyPayRate?: number | string;
  },
  estimatedMiles?: number,
  detentionAmount?: number,
  companyDeductionOverride?: number,
  stopOffFees?: number,
): number => {
  const driverType = userProfile?.driverType || 'owner-operator';
  const grossRate = rate + (detentionAmount || 0) + (stopOffFees || 0);

  if (driverType === 'company-driver') {
    const payType = userProfile?.companyPayType;
    const payRate = parseFloat(String(userProfile?.companyPayRate || 0));

    if (payType === 'per_mile') {
      return (estimatedMiles || 0) * payRate;
    }
    // percentage of gross (including detention + stop-off fees)
    return grossRate * (payRate / 100);
  }

  // owner-operator and lease-operator both use company deduction %
  // (applied to gross + detention + stop-off fees)
  const deduction =
    companyDeductionOverride != null && !Number.isNaN(companyDeductionOverride)
      ? companyDeductionOverride
      : parseFloat(String(userProfile?.companyDeduction || 0));
  return grossRate * (1 - deduction / 100);
};

/**
 * Helper to sum up the money side-effects of a multi-stop load's intermediate stops.
 * Accepts either LoadStop[] (from DB) or NewLoadStop[] (in-flight form state) via
 * duck-typing on `detentionAmount` / `stopOffFee` fields.
 */
export const sumStopSideEffects = (
  stops: Array<{ detentionAmount?: number | string; stopOffFee?: number | string }> | undefined,
): { detention: number; stopOffFees: number } => {
  if (!stops || stops.length === 0) return { detention: 0, stopOffFees: 0 };
  let detention = 0;
  let stopOffFees = 0;
  for (const s of stops) {
    const d = typeof s.detentionAmount === 'string' ? parseFloat(s.detentionAmount) : s.detentionAmount;
    const f = typeof s.stopOffFee === 'string' ? parseFloat(s.stopOffFee) : s.stopOffFee;
    if (!Number.isNaN(d as number) && d) detention += d as number;
    if (!Number.isNaN(f as number) && f) stopOffFees += f as number;
  }
  return { detention, stopOffFees };
};

export const getWeeklyPeriodDisplay = (weeklyPeriod: string) => {
  const periodMap: Record<string, string> = {
    'sunday': 'Sun – Sat',
    'monday': 'Mon – Sun',
    'tuesday': 'Tue – Mon',
    'wednesday': 'Wed – Tue',
    'thursday': 'Thu – Wed',
    'friday': 'Fri – Thu',
    'saturday': 'Sat – Fri'
  };
  return periodMap[weeklyPeriod] || 'Sun – Sat';
};

export const calculateFixedDeductionsForWeek = (deductions: any[], weekStartDate: Date) => {
  if (!deductions) return 0;

  const weekStartString = weekStartDate.toISOString().split('T')[0];

  // Group deductions by type
  const deductionsByType = deductions
    .filter(d => d.isFixed) // Only include active fixed deductions
    .reduce((acc, deduction) => {
      if (!acc[deduction.type]) {
        acc[deduction.type] = [];
      }
      acc[deduction.type].push(deduction);
      return acc;
    }, {} as Record<string, typeof deductions>);

  let totalFixedDeductions = 0;

  // For each deduction type, find the amount that was effective for this week
  Object.values(deductionsByType).forEach(typeDeductions => {
    // Get all deductions for this type that were effective on or before this week
    // Parse the date properly to compare (extract just the date part from dateAdded which may be ISO string)
    const applicableDeductions = typeDeductions
      .filter(d => {
        const dateStr = d.dateAdded ? d.dateAdded.split('T')[0] : (d.created_at ? d.created_at.split('T')[0] : null);
        return dateStr && dateStr <= weekStartString;
      })
      .sort((a, b) => {
        const dateA = a.dateAdded ? a.dateAdded.split('T')[0] : (a.created_at ? a.created_at.split('T')[0] : '');
        const dateB = b.dateAdded ? b.dateAdded.split('T')[0] : (b.created_at ? b.created_at.split('T')[0] : '');
        return dateB.localeCompare(dateA); // Descending order (most recent first)
      });

    // Use the most recent amount that was effective for this week
    if (applicableDeductions.length > 0) {
      totalFixedDeductions += applicableDeductions[0].amount;
    }
  });

  return totalFixedDeductions;
};
