import {
  format,
  formatDistance,
  formatRelative,
  parseISO,
  isValid,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

// Date formatting utilities
export const formatDate = (date: Date | string, formatStr: string = 'MMM dd, yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, formatStr) : 'Invalid date';
};

export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatTime = (date: Date | string): string => {
  return formatDate(date, 'HH:mm');
};

// Relative date formatting
export const formatRelativeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return 'Invalid date';
  
  if (isToday(dateObj)) return 'Today';
  if (isYesterday(dateObj)) return 'Yesterday';
  if (isThisWeek(dateObj)) return format(dateObj, 'EEEE');
  if (isThisYear(dateObj)) return format(dateObj, 'MMM dd');
  
  return format(dateObj, 'MMM dd, yyyy');
};

export const formatDistanceToNow = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? formatDistance(dateObj, new Date(), { addSuffix: true }) : 'Invalid date';
};

// Date range utilities
export const getDateRange = (startDate: Date, endDate: Date) => {
  return {
    start: startOfDay(startDate),
    end: endOfDay(endDate),
  };
};

export const getWeekRange = (date: Date) => {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
};

export const getMonthRange = (date: Date) => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

// Date manipulation utilities
export const addDaysToDate = (date: Date, days: number): Date => {
  return addDays(date, days);
};

export const subtractDaysFromDate = (date: Date, days: number): Date => {
  return subDays(date, days);
};

// Date validation
export const isValidDate = (date: any): boolean => {
  if (typeof date === 'string') {
    return isValid(parseISO(date));
  }
  return isValid(date);
};

// Date comparison utilities
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd');
};

export const isInPast = (date: Date): boolean => {
  return date < new Date();
};

export const isInFuture = (date: Date): boolean => {
  return date > new Date();
};

// Export commonly used formats
export const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  MEDIUM: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  TIME: 'HH:mm',
  DATETIME: 'MMM dd, yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
} as const; 