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

export interface ApiResponse<T = any> {
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
      const response = await fetch(`${this.baseUrl}/functions/v1/api-v2/version`, {
        headers: {
          'X-API-Version': this.currentVersion,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.supportedVersions || this.supportedVersions;
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
      const response = await fetch(`${this.baseUrl}/functions/v1/api-v2/version`, {
        headers: {
          'X-API-Version': version,
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch version info:', error);
    }

    return null;
  }

  /**
   * Make a versioned API request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/functions/v1/${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Version': this.currentVersion,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Check for version-related headers
      const isDeprecated = response.headers.get('X-Deprecated-Version') === 'true';
      const sunsetDate = response.headers.get('X-Sunset-Date');
      const migrationGuide = response.headers.get('X-Migration-Guide');

      if (isDeprecated) {
        console.warn(`API version ${this.currentVersion} is deprecated.`, {
          sunsetDate,
          migrationGuide,
        });
      }

      return {
        ...data,
        deprecationWarning: isDeprecated,
        sunsetDate: sunsetDate || undefined,
        migrationGuide: migrationGuide || undefined,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make a GET request with versioning
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/functions/v1/${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Make a POST request with versioning
   */
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Make a PUT request with versioning
   */
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Make a DELETE request with versioning
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
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
          const daysUntilSunset = Math.ceil((sunset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilSunset <= 30) {
            console.warn(`API version ${this.currentVersion} will be sunset in ${daysUntilSunset} days.`);
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
        recommendations.push(`Version ${this.currentVersion} is deprecated. Please upgrade to ${versionInfo.isLatest ? 'latest' : 'a supported version'}.`);
      }
      
      if (versionInfo.sunsetDate) {
        recommendations.push(`Version ${this.currentVersion} will be sunset on ${versionInfo.sunsetDate}.`);
      }
      
      if (versionInfo.migrationGuide) {
        recommendations.push(`See migration guide: ${versionInfo.migrationGuide}`);
      }
      
      if (versionInfo.breakingChanges && versionInfo.breakingChanges.length > 0) {
        recommendations.push('Breaking changes in this version:', ...versionInfo.breakingChanges);
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
