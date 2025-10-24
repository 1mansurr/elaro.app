/**
 * Comprehensive API Versioning Strategy
 * 
 * Provides robust version management for Edge Functions to support
 * backward compatibility, graceful deprecation, and client migration.
 */

// Current API version
export const API_VERSION = 'v2';

// All supported versions (including legacy)
export const SUPPORTED_VERSIONS = ['v1', 'v2'];

// Deprecated versions that are still supported but will be sunset
export const DEPRECATED_VERSIONS = ['v1'];

// Sunset dates for deprecated versions
export const SUNSET_VERSIONS: Record<string, string> = {
  'v1': '2024-12-31' // v1 will be sunset on this date
};

// Migration guides for version transitions
export const MIGRATION_GUIDES: Record<string, string> = {
  'v1-to-v2': 'https://docs.elaro.app/migration/v1-to-v2',
  'v2-to-v3': 'https://docs.elaro.app/migration/v2-to-v3'
};

// Breaking changes by version
export const BREAKING_CHANGES: Record<string, string[]> = {
  'v2': [
    'Response format changed for error messages',
    'Pagination parameters renamed',
    'Some field names updated for consistency'
  ]
};

export interface VersionInfo {
  version: string;
  isSupported: boolean;
  isDeprecated: boolean;
  sunsetDate?: string;
  migrationGuide?: string;
  breakingChanges?: string[];
  isLatest: boolean;
}

export interface VersionResponse {
  currentVersion: string;
  requestedVersion: string;
  isSupported: boolean;
  isDeprecated: boolean;
  sunsetDate?: string;
  migrationGuide?: string;
  supportedVersions: string[];
  latestVersion: string;
}

/**
 * Get comprehensive version information
 */
export function getVersionInfo(version: string): VersionInfo {
  const isSupported = SUPPORTED_VERSIONS.includes(version);
  const isDeprecated = DEPRECATED_VERSIONS.includes(version);
  const sunsetDate = SUNSET_VERSIONS[version];
  const migrationGuide = MIGRATION_GUIDES[`${version}-to-${API_VERSION}`];
  const breakingChanges = BREAKING_CHANGES[version];
  const isLatest = version === API_VERSION;

  return {
    version,
    isSupported,
    isDeprecated,
    sunsetDate,
    migrationGuide,
    breakingChanges,
    isLatest
  };
}

/**
 * Validate if a requested API version is supported
 */
export function validateApiVersion(requestedVersion?: string): boolean {
  if (!requestedVersion) return true; // Default to current version
  return SUPPORTED_VERSIONS.includes(requestedVersion);
}

/**
 * Check if client version is deprecated
 */
export function isVersionDeprecated(version: string): boolean {
  return DEPRECATED_VERSIONS.includes(version);
}

/**
 * Check if version is sunset (past sunset date)
 */
export function isVersionSunset(version: string): boolean {
  const sunsetDate = SUNSET_VERSIONS[version];
  if (!sunsetDate) return false;
  
  const sunset = new Date(sunsetDate);
  const now = new Date();
  return now > sunset;
}

/**
 * Get API version from request headers with fallback
 */
export function getRequestedVersion(req: Request): string {
  return req.headers.get('X-API-Version') || 
         req.headers.get('Api-Version') || 
         req.headers.get('API-Version') ||
         API_VERSION;
}

/**
 * Add comprehensive version headers to response
 */
export function addVersionHeaders(
  headers: Record<string, string> = {},
  requestedVersion?: string
): Record<string, string> {
  const versionInfo = requestedVersion ? getVersionInfo(requestedVersion) : null;
  
  return {
    ...headers,
    'X-API-Version': API_VERSION,
    'X-Supported-Versions': SUPPORTED_VERSIONS.join(','),
    'X-Latest-Version': API_VERSION,
    ...(versionInfo?.isDeprecated && {
      'X-Deprecated-Version': 'true',
      'X-Sunset-Date': versionInfo.sunsetDate || '',
      'X-Migration-Guide': versionInfo.migrationGuide || ''
    }),
    ...(versionInfo?.sunsetDate && {
      'X-Sunset-Date': versionInfo.sunsetDate
    })
  };
}

/**
 * Create version-aware error response
 */
export function createVersionError(
  requestedVersion: string,
  statusCode: number = 400
): Response {
  const versionInfo = getVersionInfo(requestedVersion);
  
  const errorResponse = {
    error: 'Unsupported API Version',
    code: 'UNSUPPORTED_VERSION',
    message: `API version '${requestedVersion}' is not supported`,
    supportedVersions: SUPPORTED_VERSIONS,
    latestVersion: API_VERSION,
    ...(versionInfo.isDeprecated && {
      deprecationWarning: true,
      sunsetDate: versionInfo.sunsetDate,
      migrationGuide: versionInfo.migrationGuide
    })
  };

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: addVersionHeaders({
      'Content-Type': 'application/json'
    }, requestedVersion)
  });
}

/**
 * Create version information response
 */
export function createVersionResponse(requestedVersion: string): VersionResponse {
  const versionInfo = getVersionInfo(requestedVersion);
  
  return {
    currentVersion: API_VERSION,
    requestedVersion,
    isSupported: versionInfo.isSupported,
    isDeprecated: versionInfo.isDeprecated,
    sunsetDate: versionInfo.sunsetDate,
    migrationGuide: versionInfo.migrationGuide,
    supportedVersions: SUPPORTED_VERSIONS,
    latestVersion: API_VERSION
  };
}

/**
 * Handle version compatibility for request/response transformation
 */
export function transformForVersion<T>(
  data: T,
  requestedVersion: string,
  transformer?: (data: T, version: string) => T
): T {
  if (!transformer) return data;
  
  try {
    return transformer(data, requestedVersion);
  } catch (error) {
    console.error('Version transformation failed:', error);
    return data; // Return original data if transformation fails
  }
}

/**
 * Log version usage for analytics
 */
export function logVersionUsage(
  requestedVersion: string,
  endpoint: string,
  userId?: string
): void {
  const versionInfo = getVersionInfo(requestedVersion);
  
  console.log('API Version Usage:', {
    version: requestedVersion,
    endpoint,
    userId,
    isSupported: versionInfo.isSupported,
    isDeprecated: versionInfo.isDeprecated,
    isLatest: versionInfo.isLatest,
    timestamp: new Date().toISOString()
  });
}

/**
 * Check if version requires migration
 */
export function requiresMigration(version: string): boolean {
  const versionInfo = getVersionInfo(version);
  return versionInfo.isDeprecated || versionInfo.sunsetDate !== undefined;
}

/**
 * Get migration recommendations
 */
export function getMigrationRecommendations(version: string): string[] {
  const recommendations: string[] = [];
  const versionInfo = getVersionInfo(version);
  
  if (versionInfo.isDeprecated) {
    recommendations.push(`Version ${version} is deprecated. Please upgrade to ${API_VERSION}.`);
  }
  
  if (versionInfo.sunsetDate) {
    recommendations.push(`Version ${version} will be sunset on ${versionInfo.sunsetDate}.`);
  }
  
  if (versionInfo.migrationGuide) {
    recommendations.push(`See migration guide: ${versionInfo.migrationGuide}`);
  }
  
  if (versionInfo.breakingChanges && versionInfo.breakingChanges.length > 0) {
    recommendations.push('Breaking changes in this version:', ...versionInfo.breakingChanges);
  }
  
  return recommendations;
}

/**
 * Add deprecation warning to headers if applicable (legacy function for backward compatibility)
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