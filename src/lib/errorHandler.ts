// Centralized error handler to prevent information leakage
// Maps database/API error codes to user-friendly messages

const ERROR_MESSAGES: Record<string, string> = {
  // PostgreSQL error codes
  '23505': 'This item already exists. Please use a different name.',
  '23503': 'Referenced item not found.',
  '23502': 'Required information is missing.',
  '42501': 'Permission denied.',
  '22P02': 'Invalid data format.',
  // Supabase/PostgREST codes
  'PGRST116': 'Item not found.',
  'PGRST301': 'Request timeout. Please try again.',
  '42P01': 'An error occurred. Please try again.',
  '42703': 'An error occurred. Please try again.',
};

const AUTH_ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /invalid login|invalid password|invalid credentials/i, message: 'Invalid email or password.' },
  { pattern: /email already|already registered|user already registered/i, message: 'An account with this email already exists.' },
  { pattern: /email not confirmed/i, message: 'Please verify your email address.' },
  { pattern: /rate limit|too many requests/i, message: 'Too many attempts. Please wait a moment and try again.' },
  { pattern: /password.*weak|password.*short/i, message: 'Password is too weak. Please use a stronger password.' },
  { pattern: /invalid email/i, message: 'Please enter a valid email address.' },
  { pattern: /session expired|jwt expired/i, message: 'Your session has expired. Please sign in again.' },
];

export function formatDatabaseError(error: unknown, defaultMessage: string): string {
  // Log full error for debugging (only in development)
  if (import.meta.env.DEV) {
    console.error('[Database Error]:', error);
  }

  if (!error || typeof error !== 'object') {
    return defaultMessage;
  }

  const errorObj = error as Record<string, unknown>;
  
  // Try to get error code from various possible locations
  const errorCode = errorObj.code || errorObj.error_code;
  
  // Return user-friendly message based on error code
  if (typeof errorCode === 'string' && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }
  
  // For auth errors, check against known patterns
  const errorMessage = errorObj.message;
  if (typeof errorMessage === 'string') {
    for (const { pattern, message } of AUTH_ERROR_PATTERNS) {
      if (pattern.test(errorMessage)) {
        return message;
      }
    }
  }
  
  // Return safe default message
  return defaultMessage;
}
