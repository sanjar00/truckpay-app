import { startOfWeek, endOfWeek, isAfter, isBefore, startOfDay } from 'date-fns';

// Map weekly period strings to weekStartsOn values
const WEEKLY_PERIOD_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

export const getWeekStartsOn = (weeklyPeriod: string): number => {
  return WEEKLY_PERIOD_MAP[weeklyPeriod as keyof typeof WEEKLY_PERIOD_MAP] || 0;
};

// Determine which weekly period to use for a specific date
export const getWeeklyPeriodForDate = (date: Date, userProfile: any): string => {
  const { weeklyPeriod, weeklyPeriodUpdatedAt } = userProfile || {};
  
  // If no update timestamp, use current weekly period
  if (!weeklyPeriodUpdatedAt) {
    return weeklyPeriod || 'sunday';
  }
  
  const updateDate = new Date(weeklyPeriodUpdatedAt);
  const targetDate = startOfDay(date);
  const updateDateStart = startOfDay(updateDate);
  
  // For dates before the update, we need to determine the old weekly period
  // Since we don't store historical weekly periods, we'll assume the previous
  // common setting was 'sunday' if the current is different, or 'monday' if current is 'sunday'
  if (isBefore(targetDate, updateDateStart)) {
    // Use a reasonable default for historical data
    // This could be enhanced to store historical weekly periods in the database
    return weeklyPeriod === 'sunday' ? 'monday' : 'sunday';
  }
  
  // For dates on or after the update, use the current weekly period
  return weeklyPeriod || 'sunday';
};

export const getUserWeekStart = (date: Date, userProfile: any): Date => {
  const weeklyPeriod = getWeeklyPeriodForDate(date, userProfile);
  const weekStartsOn = getWeekStartsOn(weeklyPeriod);
  return startOfWeek(date, { weekStartsOn });
};

export const getUserWeekEnd = (date: Date, userProfile: any): Date => {
  const weeklyPeriod = getWeeklyPeriodForDate(date, userProfile);
  const weekStartsOn = getWeekStartsOn(weeklyPeriod);
  return endOfWeek(date, { weekStartsOn });
};

// Get week start for a specific weekly period (for date range calculations)
export const getWeekStartForPeriod = (date: Date, weeklyPeriod: string): Date => {
  const weekStartsOn = getWeekStartsOn(weeklyPeriod);
  return startOfWeek(date, { weekStartsOn });
};

export const getWeekEndForPeriod = (date: Date, weeklyPeriod: string): Date => {
  const weekStartsOn = getWeekStartsOn(weeklyPeriod);
  return endOfWeek(date, { weekStartsOn });
};

export const getWeeklyPeriodDisplayName = (weeklyPeriod: string): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const startDay = getWeekStartsOn(weeklyPeriod);
  const endDay = (startDay + 6) % 7;
  return `${dayNames[startDay]} to ${dayNames[endDay]}`;
};