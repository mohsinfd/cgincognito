/**
 * Validation utilities
 */

/**
 * Validate DOB format (DDMMYYYY)
 */
export function validateDOB(dob: string): { valid: boolean; error?: string } {
  if (!dob || typeof dob !== 'string') {
    return { valid: false, error: 'DOB is required' };
  }

  if (!/^\d{8}$/.test(dob)) {
    return { valid: false, error: 'DOB must be 8 digits (DDMMYYYY)' };
  }

  const day = parseInt(dob.substring(0, 2));
  const month = parseInt(dob.substring(2, 4));
  const year = parseInt(dob.substring(4, 8));

  if (day < 1 || day > 31) {
    return { valid: false, error: 'Invalid day (must be 01-31)' };
  }

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Invalid month (must be 01-12)' };
  }

  if (year < 1900 || year > new Date().getFullYear()) {
    return { valid: false, error: 'Invalid year' };
  }

  return { valid: true };
}

/**
 * Validate month format (YYYY-MM)
 */
export function validateMonth(month: string): { valid: boolean; error?: string } {
  if (!month || typeof month !== 'string') {
    return { valid: false, error: 'Month is required' };
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { valid: false, error: 'Month must be in YYYY-MM format' };
  }

  const [year, monthNum] = month.split('-').map(Number);

  if (year < 2000 || year > 2100) {
    return { valid: false, error: 'Invalid year' };
  }

  if (monthNum < 1 || monthNum > 12) {
    return { valid: false, error: 'Invalid month' };
  }

  return { valid: true };
}

/**
 * Validate bank code
 */
export function validateBankCode(code: string, allowedCodes: string[]): boolean {
  return allowedCodes.includes(code.toLowerCase());
}

/**
 * Validate card last digits
 */
export function validateCardLastDigits(digits: string): { valid: boolean; error?: string } {
  if (!digits || typeof digits !== 'string') {
    return { valid: false, error: 'Card digits are required' };
  }

  if (!/^\d{2,4}$/.test(digits)) {
    return { valid: false, error: 'Card digits must be 2-4 numbers' };
  }

  return { valid: true };
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

