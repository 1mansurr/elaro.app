/**
 * UUID Generation Utility
 *
 * Provides functions for generating unique identifiers for offline-created items.
 * These temporary IDs are used until the server assigns permanent IDs after sync.
 */

/**
 * Generate a UUID v4 (random)
 * This is a simplified implementation for React Native without external dependencies.
 *
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, A, or B
 */
export function generateUUID(): string {
  // Use crypto.getRandomValues if available, otherwise fall back to Math.random
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    return generateUUIDCrypto();
  }
  return generateUUIDMath();
}

/**
 * Generate UUID using crypto.getRandomValues (more secure)
 */
function generateUUIDCrypto(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generate UUID using Math.random (fallback)
 */
function generateUUIDMath(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a temporary ID with a specific prefix for offline items
 * These are easily identifiable and can be replaced when synced
 *
 * @param resourceType - Type of resource (assignment, lecture, etc.)
 * @returns A temporary ID with format: temp_{resourceType}_{uuid}
 */
export function generateTempId(resourceType: string): string {
  const uuid = generateUUID();
  return `temp_${resourceType}_${uuid}`;
}

/**
 * Check if an ID is a temporary offline ID
 */
export function isTempId(id: string): boolean {
  return id.startsWith('temp_');
}

/**
 * Extract the resource type from a temporary ID
 */
export function extractResourceTypeFromTempId(tempId: string): string | null {
  if (!isTempId(tempId)) {
    return null;
  }

  const parts = tempId.split('_');
  if (parts.length >= 3) {
    return parts[1]; // temp_{resourceType}_{uuid}
  }

  return null;
}
