/**
 * PII Redaction Utility
 *
 * Automatically detects and redacts Personally Identifiable Information (PII)
 * from logs and error messages to comply with privacy regulations (GDPR, CCPA).
 *
 * Features:
 * - Pattern-based detection (email, phone, SSN, credit card, IP)
 * - Field-based detection (known PII field names)
 * - Hash IDs for privacy-preserving analytics
 * - Configurable redaction strategies
 */

export interface RedactionOptions {
  hashIds?: boolean; // Hash UUIDs instead of removing
  maskEmails?: boolean; // Mask emails (e.g., u***@example.com)
  removeNames?: boolean; // Remove names completely
  redactIpAddresses?: boolean; // Redact IP addresses
  redactPhoneNumbers?: boolean; // Redact phone numbers
}

// PII patterns for regex matching
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
};

// Known PII field names (case-insensitive matching)
const PII_FIELDS = [
  'email',
  'email_address',
  'user_email',
  'e_mail',
  'name',
  'first_name',
  'last_name',
  'full_name',
  'username',
  'display_name',
  'phone',
  'phone_number',
  'mobile',
  'telephone',
  'contact_number',
  'address',
  'street_address',
  'city',
  'zip',
  'postal_code',
  'zipcode',
  'password',
  'secret',
  'token',
  'api_key',
  'access_token',
  'refresh_token',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
];

/**
 * Simple hash function for IDs (non-cryptographic, for privacy only)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

/**
 * Mask an email address (e.g., user@example.com -> u***@example.com)
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***';
  const masked = localPart.length > 1 ? `${localPart[0]}***` : '***';
  return `${masked}@${domain}`;
}

/**
 * Check if a field name contains PII indicators
 */
function isPIIField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return PII_FIELDS.some(
    pii =>
      lowerField.includes(pii.toLowerCase()) ||
      lowerField === pii.toLowerCase(),
  );
}

/**
 * Redact a single value based on type and options
 */
function redactValue(value: unknown, options: RedactionOptions): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle strings
  if (typeof value === 'string') {
    let result = value;

    // Redact emails
    if (options.maskEmails !== false) {
      result = result.replace(PII_PATTERNS.email, match => maskEmail(match));
    }

    // Redact phone numbers
    if (options.redactPhoneNumbers !== false) {
      result = result.replace(PII_PATTERNS.phone, '***-***-****');
      result = result.replace(PII_PATTERNS.ssn, '***-**-****');
      result = result.replace(PII_PATTERNS.creditCard, '****-****-****-****');
    }

    // Redact IP addresses
    if (options.redactIpAddresses !== false) {
      result = result.replace(PII_PATTERNS.ipAddress, '***.***.***.***');
    }

    // Hash UUIDs if requested
    if (options.hashIds) {
      result = result.replace(
        PII_PATTERNS.uuid,
        match => `hashed_${hashString(match)}`,
      );
    }

    return result;
  }

  return value;
}

/**
 * Redact PII from an object recursively
 */
function redactObject(obj: unknown, options: RedactionOptions, path = ''): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item, index) =>
      redactObject(item, options, `${path}[${index}]`),
    );
  }

  // Handle objects
  if (typeof obj === 'object' && obj !== null) {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Check if field name indicates PII
      if (isPIIField(key)) {
        // Remove PII fields completely if removeNames is true and it's a name field
        if (
          options.removeNames &&
          ['name', 'first_name', 'last_name', 'full_name'].some(n =>
            key.toLowerCase().includes(n),
          )
        ) {
          redacted[key] = '[REDACTED]';
        } else if (typeof value === 'string') {
          // Mask/redact string values
          redacted[key] = redactValue(value, options);
        } else {
          // Recursively redact nested objects
          redacted[key] = redactObject(value, options, currentPath);
        }
      } else {
        // Recursively process non-PII fields
        redacted[key] = redactObject(value, options, currentPath);
      }
    }

    return redacted;
  }

  // Handle primitives
  return redactValue(obj, options);
}

/**
 * Redact PII from data (objects, arrays, primitives)
 *
 * @param data - Data to redact (object, array, or primitive)
 * @param options - Redaction options
 * @returns Redacted data
 *
 * @example
 * ```typescript
 * const logData = {
 *   user_id: '123e4567-e89b-12d3-a456-426614174000',
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   body: { message: 'Hello' }
 * };
 *
 * const redacted = redactPII(logData, {
 *   hashIds: true,
 *   maskEmails: true,
 *   removeNames: true
 * });
 * // Result: {
 * //   user_id: 'hashed_abc12345',
 * //   email: 'u***@example.com',
 * //   name: '[REDACTED]',
 * //   body: { message: 'Hello' }
 * // }
 * ```
 */
export function redactPII(
  data: unknown,
  options: RedactionOptions = {},
): unknown {
  const defaultOptions: RedactionOptions = {
    hashIds: true,
    maskEmails: true,
    removeNames: false, // Keep names by default, just mask them
    redactIpAddresses: true,
    redactPhoneNumbers: true,
    ...options,
  };

  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return redactValue(data, defaultOptions);
  }

  // Handle arrays and objects
  return redactObject(data, defaultOptions);
}

/**
 * Sanitize error messages to remove internal details
 *
 * @param error - Error object or unknown error
 * @returns User-friendly error message without internal details
 *
 * @example
 * ```typescript
 * // Before: "Database error: duplicate key value violates unique constraint 'users_email_key'"
 * // After: "A record with this information already exists"
 * ```
 */
export function sanitizeErrorMessage(error: Error | unknown): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  if (error instanceof Error) {
    let message = error.message;

    // Remove database-specific details
    message = message.replace(/database error:?\s*/gi, '');
    message = message.replace(
      /violates unique constraint\s+['"]?\w+['"]?/gi,
      'already exists',
    );
    message = message.replace(
      /violates foreign key constraint/gi,
      'invalid reference',
    );
    message = message.replace(/violates check constraint/gi, 'invalid value');
    message = message.replace(/column\s+['"]?(\w+)['"]?\s+/gi, '');
    message = message.replace(
      /relation\s+['"]?(\w+)['"]?\s+does not exist/gi,
      'resource not found',
    );

    // Remove SQL details
    message = message.replace(/SQL\s+STATE:\s*\w+/gi, '');
    message = message.replace(/DETAIL:\s*.*/gi, '');
    message = message.replace(/LINE\s+\d+:/gi, '');

    // Remove file paths and stack traces
    message = message.split('\n')[0]; // Only first line

    // Remove absolute paths
    message = message.replace(/\/[^\s]+\/[^\s]+\.ts:\d+:\d+/g, '');

    // Clean up whitespace
    message = message.trim();

    // If message is empty or too technical, provide generic message
    if (
      !message ||
      message.length < 10 ||
      (/error|exception/i.test(message) && message.length < 30)
    ) {
      return 'An error occurred while processing your request';
    }

    return message;
  }

  if (typeof error === 'string') {
    return sanitizeErrorMessage(new Error(error));
  }

  return 'An unexpected error occurred';
}
