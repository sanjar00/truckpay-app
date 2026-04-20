/**
 * Calculate driver pay for a single load based on driver type.
 *
 * owner-operator / lease-operator:
 *   driverPay = (rate + detention) * (1 - companyDeduction / 100)
 *   (lease weekly mileage cost is deducted at the weekly level, not per-load)
 *
 * company-driver, per_mile:
 *   driverPay = estimatedMiles * companyPayRate
 *
 * company-driver, percentage:
 *   driverPay = (rate + detention) * (companyPayRate / 100)
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
  companyDeductionOverride?: number
): number => {
  const driverType = userProfile?.driverType || 'owner-operator';
  const grossRate = rate + (detentionAmount || 0);

  if (driverType === 'company-driver') {
    const payType = userProfile?.companyPayType;
    const payRate = parseFloat(String(userProfile?.companyPayRate || 0));

    if (payType === 'per_mile') {
      return (estimatedMiles || 0) * payRate;
    }
    // percentage of gross (including detention)
    return grossRate * (payRate / 100);
  }

  // owner-operator and lease-operator both use company deduction % (applied to gross + detention)
  const deduction =
    companyDeductionOverride != null && !Number.isNaN(companyDeductionOverride)
      ? companyDeductionOverride
      : parseFloat(String(userProfile?.companyDeduction || 0));
  return grossRate * (1 - deduction / 100);
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
