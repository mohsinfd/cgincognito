/**
 * Date utilities
 */

/**
 * Convert DDMMYYYY to YYYY-MM-DD
 */
export function ddmmyyyyToIso(ddmmyyyy: string): string {
  if (ddmmyyyy.length !== 8) {
    throw new Error(`Invalid date format: ${ddmmyyyy}`);
  }

  const day = ddmmyyyy.substring(0, 2);
  const month = ddmmyyyy.substring(2, 4);
  const year = ddmmyyyy.substring(4, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Convert YYYY-MM-DD to DDMMYYYY
 */
export function isoToDdmmyyyy(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}${month}${year}`;
}

/**
 * Get month string from date (YYYY-MM)
 */
export function getMonthString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get start and end of month
 */
export function getMonthRange(monthStr: string): { start: Date; end: Date } {
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Format date for display (DD MMM YYYY)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const day = d.getDate();
  const month = d.toLocaleString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

