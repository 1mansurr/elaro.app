import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { errorTracking } from './errorTracking';

class UpdateService {
  private static instance: UpdateService;

  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  /**
   * Check for updates and auto-install if available
   */
  async checkAndInstallUpdates(): Promise<{
    isAvailable: boolean;
    isDownloaded: boolean;
    manifest?: Updates.Manifest;
  }> {
    // Only check in production builds
    if (__DEV__ || !Updates.isEnabled) {
      return { isAvailable: false, isDownloaded: false };
    }

    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        // Download update in background
        const result = await Updates.fetchUpdateAsync();

        if (result.isNew) {
          // Log update availability
          errorTracking.captureMessage('Update downloaded and ready', 'info');

          // Auto-apply update (as per your preference)
          await Updates.reloadAsync();

          return {
            isAvailable: true,
            isDownloaded: true,
            manifest: result.manifest,
          };
        }
      }

      return { isAvailable: false, isDownloaded: false };
    } catch (error) {
      errorTracking.captureError(error as Error, {
        tags: { type: 'update_check_failed' },
      });
      return { isAvailable: false, isDownloaded: false };
    }
  }

  /**
   * Get current update channel
   */
  getCurrentChannel(): string | null {
    return Updates.channel || null;
  }

  /**
   * Force reload to latest update
   */
  async reloadToLatest(): Promise<void> {
    await Updates.reloadAsync();
  }
}

export const updateService = UpdateService.getInstance();
