/**
 * Storage Monitoring Service
 *
 * Monitors Supabase storage usage against Free Plan limits:
 * - Database size: 500 MB
 * - File storage: 1 GB
 * - File upload size: 50 MB per file
 * - Bandwidth: 10 GB/month (5 GB cached + 5 GB uncached)
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { logger } from './logging.ts';

// Supabase Free Plan limits (in bytes)
export const STORAGE_LIMITS = {
  database: 500 * 1024 * 1024, // 500 MB
  file_storage: 1024 * 1024 * 1024, // 1 GB
  file_upload_size: 50 * 1024 * 1024, // 50 MB per file
  bandwidth_cached: 5 * 1024 * 1024 * 1024, // 5 GB/month
  bandwidth_uncached: 5 * 1024 * 1024 * 1024, // 5 GB/month
  bandwidth_total: 10 * 1024 * 1024 * 1024, // 10 GB/month
} as const;

export interface StorageQuotaStatus {
  storageType: string;
  usageBytes: number;
  quotaLimitBytes: number;
  usagePercentage: number;
  remainingBytes: number;
  usageReadable: string;
  limitReadable: string;
  remainingReadable: string;
}

/**
 * Get current database size
 * Note: This requires a database function to be created
 */
async function getDatabaseSize(
  supabaseClient: SupabaseClient,
): Promise<number> {
  try {
    // Use a database function to get database size
    // This function should be created in a migration
    const { data, error } = await supabaseClient.rpc('get_database_size');

    if (error) {
      await logger.error('Failed to get database size', {
        error: error.message,
      });
      return 0;
    }

    return data || 0;
  } catch (error) {
    await logger.error('Exception getting database size', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Get current file storage size for a bucket
 */
async function getBucketSize(
  supabaseClient: SupabaseClient,
  bucketName: string,
): Promise<number> {
  try {
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .list('', { limit: 10000, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      await logger.error('Failed to get bucket size', {
        error: error.message,
        bucket: bucketName,
      });
      return 0;
    }

    // Calculate total size
    let totalSize = 0;
    if (data) {
      for (const file of data) {
        totalSize += file.metadata?.size || 0;
      }
    }

    return totalSize;
  } catch (error) {
    await logger.error('Exception getting bucket size', {
      error: error instanceof Error ? error.message : String(error),
      bucket: bucketName,
    });
    return 0;
  }
}

/**
 * Track storage quota usage
 */
export async function trackStorageQuota(
  supabaseClient: SupabaseClient,
  storageType: keyof typeof STORAGE_LIMITS,
  usageBytes?: number,
): Promise<StorageQuotaStatus | null> {
  try {
    let actualUsage = usageBytes;

    // If usage not provided, fetch it
    if (!actualUsage) {
      if (storageType === 'database') {
        actualUsage = await getDatabaseSize(supabaseClient);
      } else if (storageType === 'file_storage') {
        // Get size of logs bucket (currently the only bucket)
        actualUsage = await getBucketSize(supabaseClient, 'logs');
      } else {
        await logger.warn('Cannot auto-fetch usage for storage type', {
          storage_type: storageType,
        });
        return null;
      }
    }

    const quotaLimit = STORAGE_LIMITS[storageType];

    // Track in database
    const { error } = await supabaseClient.rpc('track_storage_quota', {
      p_storage_type: storageType,
      p_usage_bytes: actualUsage,
      p_quota_limit_bytes: quotaLimit,
    });

    if (error) {
      await logger.error('Failed to track storage quota', {
        error: error.message,
        storage_type: storageType,
      });
      return null;
    }

    const percentage = (actualUsage / quotaLimit) * 100;
    const remaining = Math.max(0, quotaLimit - actualUsage);

    return {
      storageType,
      usageBytes: actualUsage,
      quotaLimitBytes: quotaLimit,
      usagePercentage: percentage,
      remainingBytes: remaining,
      usageReadable: formatBytes(actualUsage),
      limitReadable: formatBytes(quotaLimit),
      remainingReadable: formatBytes(remaining),
    };
  } catch (error) {
    await logger.error('Exception tracking storage quota', {
      error: error instanceof Error ? error.message : String(error),
      storage_type: storageType,
    });
    return null;
  }
}

/**
 * Get current storage quota status
 */
export async function getStorageQuotaStatus(
  supabaseClient: SupabaseClient,
  storageType: keyof typeof STORAGE_LIMITS,
): Promise<StorageQuotaStatus | null> {
  try {
    const { data, error } = await supabaseClient.rpc(
      'get_storage_quota_status',
      {
        p_storage_type: storageType,
      },
    );

    if (error) {
      await logger.warn('Failed to get storage quota status', {
        error: error.message,
        storage_type: storageType,
      });
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const status = data[0];
    return {
      storageType: status.storage_type,
      usageBytes: status.usage_bytes,
      quotaLimitBytes: status.quota_limit_bytes,
      usagePercentage: Number(status.usage_percentage),
      remainingBytes: status.remaining_bytes,
      usageReadable: status.usage_readable,
      limitReadable: status.limit_readable,
      remainingReadable: status.remaining_readable,
    };
  } catch (error) {
    await logger.error('Exception getting storage quota status', {
      error: error instanceof Error ? error.message : String(error),
      storage_type: storageType,
    });
    return null;
  }
}

/**
 * Check all storage quotas (for scheduled monitoring)
 */
export async function checkAllStorageQuotas(
  supabaseClient: SupabaseClient,
): Promise<StorageQuotaStatus[]> {
  const results: StorageQuotaStatus[] = [];

  // Check database size
  const dbStatus = await trackStorageQuota(supabaseClient, 'database');
  if (dbStatus) results.push(dbStatus);

  // Check file storage (logs bucket)
  const fileStatus = await trackStorageQuota(supabaseClient, 'file_storage');
  if (fileStatus) results.push(fileStatus);

  return results;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
