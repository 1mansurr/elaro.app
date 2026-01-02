/**
 * API Versioning Service for Client Applications
 *
 * Provides version management, compatibility checking, and migration guidance
 * for client applications using the ELARO API.
 */

export interface VersionInfo {
  version: string;
  isSupported: boolean;
  isDeprecated: boolean;
  sunsetDate?: string;
  migrationGuide?: string;
  breakingChanges?: string[];
  isLatest: boolean;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  supportedVersions?: string[];
  latestVersion?: string;
  deprecationWarning?: boolean;
  sunsetDate?: string;
  migrationGuide?: string;
}

export class ApiVersioningService {
  private static instance: ApiVersioningService;
  private currentVersion: string = 'v2';
  private supportedVersions: string[] = ['v1', 'v2'];
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  }

  static getInstance(): ApiVersioningService {
    if (!ApiVersioningService.instance) {
      ApiVersioningService.instance = new ApiVersioningService();
    }
    return ApiVersioningService.instance;
  }

  /**
   * Get the current API version being used
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Set the API version to use for requests
   */
  setVersion(version: string): void {
    if (this.supportedVersions.includes(version)) {
      this.currentVersion = version;
    } else {
      throw new Error(`Unsupported API version: ${version}`);
    }
  }

  /**
   * Get supported API versions from server
   */
  async getSupportedVersions(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/functions/v1/api-v2/version`,
        {
          headers: {
            'X-API-Version': this.currentVersion,
          },
        },
      );

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const data = await response.json();
            return data.supportedVersions || this.supportedVersions;
          } catch {
            console.warn('Failed to parse version response as JSON');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch supported versions:', error);
    }

    return this.supportedVersions;
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  /**
   * Get version information from server
   */
  async getVersionInfo(version: string): Promise<VersionInfo | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/functions/v1/api-v2/version`,
        {
          headers: {
            'X-API-Version': version,
          },
        },
      );

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            return await response.json();
          } catch {
            console.warn('Failed to parse version info as JSON');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch version info:', error);
    }

    return null;
  }

  /**
   * Make a versioned API request
   * @param endpoint - API endpoint path (e.g., 'auth/signin' or 'api-v2/courses/list')
   * @param options - Fetch options including method, body, headers
   * @param requireAuth - Whether to include auth token (default: true for most endpoints, false for auth endpoints)
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/functions/v1/${endpoint}`;

    // Get auth token from Supabase client if required
    let authToken: string | null = null;
    if (requireAuth) {
      try {
        // Dynamically import supabase to avoid circular dependencies
        const { supabase } = await import('@/services/supabase');
        const {
          data: { session },
        } = await supabase.auth.getSession();
        authToken = session?.access_token || null;
      } catch (error) {
        // If getting session fails, continue without token (will fail auth check on server)
        console.warn('Failed to get auth token:', error);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Version': this.currentVersion,
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if required and available
    if (requireAuth && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Add idempotency key for POST/PUT/DELETE operations to endpoints that require it
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      options.method || 'GET',
    );
    if (
      isMutation &&
      (endpoint.includes('/devices') || endpoint.includes('/users/devices'))
    ) {
      // Generate idempotency key for device registration
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      headers['Idempotency-Key'] = idempotencyKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Read response body once (can only be read once)
      const contentType = response.headers.get('content-type');
      const hasJsonContent = contentType?.includes('application/json');
      const responseText = await response.text();

      // Check if response is ok before parsing
      if (!response.ok) {
        // Try to get error message from response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        let errorCode: string | undefined;

        // Special handling for timeout errors (504)
        const isTimeout = response.status === 504;
        if (isTimeout && !response.statusText) {
          errorMessage =
            'Gateway Timeout: The server did not respond in time. Please try again.';
        }

        if (
          hasJsonContent &&
          responseText &&
          responseText.trim() &&
          responseText !== 'undefined' &&
          responseText !== 'null'
        ) {
          try {
            const parsed = JSON.parse(responseText);
            errorMessage =
              parsed.message ||
              parsed.error?.message ||
              parsed.error ||
              errorMessage;
            errorCode = parsed.code || parsed.error?.code;
          } catch (parseError) {
            // If we can't parse error, use status text or default message
            console.warn('Failed to parse error response:', parseError);
            if (isTimeout && errorMessage.includes('Unknown error')) {
              errorMessage =
                'Gateway Timeout: The server did not respond in time. Please try again.';
            }
          }
        }

        return {
          error: isTimeout ? 'Gateway Timeout' : 'Request failed',
          message: errorMessage,
          code: errorCode || `HTTP_${response.status}`,
        };
      }

      // Parse successful response
      let data: any = {};

      if (hasJsonContent) {
        if (
          responseText &&
          responseText.trim() &&
          responseText !== 'undefined' &&
          responseText !== 'null'
        ) {
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.warn('Failed to parse response as JSON:', parseError);
            return {
              error: 'Invalid response format',
              message: 'Server returned invalid JSON',
            };
          }
        } else {
          // Empty JSON response is valid
          data = {};
        }
      } else if (responseText) {
        // Non-JSON response with content
        return {
          error: 'Unexpected response format',
          message: `Server returned ${contentType || 'unknown'} content`,
          data: responseText,
        };
      }

      // Check for version-related headers
      const isDeprecated =
        response.headers.get('X-Deprecated-Version') === 'true';
      const sunsetDate = response.headers.get('X-Sunset-Date');
      const migrationGuide = response.headers.get('X-Migration-Guide');

      if (isDeprecated) {
        console.warn(`API version ${this.currentVersion} is deprecated.`, {
          sunsetDate,
          migrationGuide,
        });
      }

      // Handle both standard response format and legacy format
      if (data.success !== undefined) {
        // Standard format: { success: true, data: {...}, error: {...} }
        if (data.success && data.data) {
          return {
            data: data.data,
            ...data,
            deprecationWarning: isDeprecated,
            sunsetDate: sunsetDate || undefined,
            migrationGuide: migrationGuide || undefined,
          };
        } else if (!data.success && data.error) {
          return {
            error: data.error.message || data.error,
            code: data.error.code,
            message: data.error.message,
            ...data,
            deprecationWarning: isDeprecated,
            sunsetDate: sunsetDate || undefined,
            migrationGuide: migrationGuide || undefined,
          };
        }
      }

      // Legacy format: { data: {...}, error: {...} }
      return {
        ...data,
        deprecationWarning: isDeprecated,
        sunsetDate: sunsetDate || undefined,
        migrationGuide: migrationGuide || undefined,
      };
    } catch (error) {
      // Handle network errors (fetch fails, no response received)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError =
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('network') ||
        error instanceof TypeError;

      console.error('API request failed:', error);
      return {
        error: isNetworkError ? 'Network error' : 'Request failed',
        message: errorMessage,
      };
    }
  }

  /**
   * Make a GET request with versioning
   */
  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    requireAuth: boolean = true,
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/functions/v1/${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return this.request<T>(
      endpoint,
      {
        method: 'GET',
      },
      requireAuth,
    );
  }

  /**
   * Make a POST request with versioning
   */
  async post<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>,
    requireAuth: boolean = true,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth,
    );
  }

  /**
   * Make a PUT request with versioning
   */
  async put<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>,
    requireAuth: boolean = true,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth,
    );
  }

  /**
   * Make a DELETE request with versioning
   */
  async delete<T = any>(
    endpoint: string,
    requireAuth: boolean = true,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'DELETE',
      },
      requireAuth,
    );
  }

  /**
   * Check for version compatibility and show warnings
   */
  async checkCompatibility(): Promise<void> {
    try {
      const versionInfo = await this.getVersionInfo(this.currentVersion);

      if (versionInfo) {
        if (versionInfo.isDeprecated) {
          console.warn(`API version ${this.currentVersion} is deprecated.`, {
            sunsetDate: versionInfo.sunsetDate,
            migrationGuide: versionInfo.migrationGuide,
          });
        }

        if (versionInfo.sunsetDate) {
          const sunset = new Date(versionInfo.sunsetDate);
          const now = new Date();
          const daysUntilSunset = Math.ceil(
            (sunset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          if (daysUntilSunset <= 30) {
            console.warn(
              `API version ${this.currentVersion} will be sunset in ${daysUntilSunset} days.`,
            );
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check API compatibility:', error);
    }
  }

  /**
   * Get migration recommendations for current version
   */
  async getMigrationRecommendations(): Promise<string[]> {
    try {
      const versionInfo = await this.getVersionInfo(this.currentVersion);

      if (!versionInfo) return [];

      const recommendations: string[] = [];

      if (versionInfo.isDeprecated) {
        recommendations.push(
          `Version ${this.currentVersion} is deprecated. Please upgrade to ${versionInfo.isLatest ? 'latest' : 'a supported version'}.`,
        );
      }

      if (versionInfo.sunsetDate) {
        recommendations.push(
          `Version ${this.currentVersion} will be sunset on ${versionInfo.sunsetDate}.`,
        );
      }

      if (versionInfo.migrationGuide) {
        recommendations.push(
          `See migration guide: ${versionInfo.migrationGuide}`,
        );
      }

      if (
        versionInfo.breakingChanges &&
        versionInfo.breakingChanges.length > 0
      ) {
        recommendations.push(
          'Breaking changes in this version:',
          ...versionInfo.breakingChanges,
        );
      }

      return recommendations;
    } catch (error) {
      console.warn('Failed to get migration recommendations:', error);
      return [];
    }
  }

  /**
   * Upgrade to latest version
   */
  async upgradeToLatest(): Promise<boolean> {
    try {
      const supportedVersions = await this.getSupportedVersions();
      const latestVersion = supportedVersions[supportedVersions.length - 1];

      if (latestVersion && latestVersion !== this.currentVersion) {
        this.setVersion(latestVersion);
        console.log(`Upgraded to API version ${latestVersion}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to upgrade API version:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiVersioningService = ApiVersioningService.getInstance();
