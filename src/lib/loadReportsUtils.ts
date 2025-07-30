export const getWeeklyPeriodDisplay = (weeklyPeriod: string) => {
  const periodMap = {
    'sunday': 'SUNDAY_TO_SATURDAY',
    'monday': 'MONDAY_TO_SUNDAY',
    'tuesday': 'TUESDAY_TO_MONDAY',
    'wednesday': 'WEDNESDAY_TO_TUESDAY',
    'thursday': 'THURSDAY_TO_WEDNESDAY',
    'friday': 'FRIDAY_TO_THURSDAY',
    'saturday': 'SATURDAY_TO_FRIDAY'
  };
  return periodMap[weeklyPeriod] || 'SUNDAY_TO_SATURDAY';
};

export const calculateFixedDeductionsForWeek = (deductions: any[], weekStartDate: Date) => {
  if (!deductions) return 0;
  
  const weekStartString = weekStartDate.toISOString().split('T')[0];
  
  // Group deductions by type
  const deductionsByType = deductions
    .filter(d => d.isFixed)
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
    const applicableDeductions = typeDeductions
      .filter(d => (d.dateAdded || d.created_at) <= weekStartString)
      .sort((a, b) => (b.dateAdded || b.created_at).localeCompare(a.dateAdded || a.created_at));
    
    // Use the most recent amount that was effective for this week
    if (applicableDeductions.length > 0) {
      totalFixedDeductions += applicableDeductions[0].amount;
    }
  });
  
  return totalFixedDeductions;
};