/**
 * API Versioning Utilities
 * 
 * Provides version management for Edge Functions to support
 * backward compatibility and graceful deprecation.
 */

export const API_VERSION = 'v1';
export const SUPPORTED_VERSIONS = ['v1'];

/**
 * Validate if a requested API version is supported
 */
export function validateApiVersion(requestedVersion?: string): boolean {
  if (!requestedVersion) return true; // Default to current version
  return SUPPORTED_VERSIONS.includes(requestedVersion);
}

/**
 * Add version headers to response
 */
export function addVersionHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return {
    ...headers,
    'X-API-Version': API_VERSION,
    'X-Supported-Versions': SUPPORTED_VERSIONS.join(','),
  };
}

/**
 * Get API version from request headers
 */
export function getRequestedVersion(req: Request): string {
  return req.headers.get('X-API-Version') || req.headers.get('Api-Version') || API_VERSION;
}

/**
 * Check if client version is deprecated
 */
export function isVersionDeprecated(_version: string): boolean {
  // Future: Mark old versions as deprecated
  // For now, all supported versions are not deprecated
  return false;
}

/**
 * Add deprecation warning to headers if applicable
 */
export function addDeprecationHeaders(version: string, headers: Record<string, string> = {}): Record<string, string> {
  if (isVersionDeprecated(version)) {
    return {
      ...headers,
      'Deprecation': 'true',
      'Sunset': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString(), // 90 days
    };
  }
  return headers;
}

