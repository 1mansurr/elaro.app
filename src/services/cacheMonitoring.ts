/**
 * Cache Monitoring Service
 *
 * Monitors cache hit rates and alerts when hit rate drops below 80% for more than 30 minutes
 */

import { cache } from '@/utils/cache';
import { errorTracking } from '@/services/errorTracking';
import { supabase } from '@/services/supabase';

const HIT_RATE_THRESHOLD = 80; // Alert if hit rate < 80%
const MONITORING_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

class CacheMonitoringService {
  private static instance: CacheMonitoringService;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastAlertTime: number = 0;
  private lowHitRateStartTime: number | null = null;

  static getInstance(): CacheMonitoringService {
    if (!CacheMonitoringService.instance) {
      CacheMonitoringService.instance = new CacheMonitoringService();
    }
    return CacheMonitoringService.instance;
  }

  /**
   * Start monitoring cache hit rates
   */
  start(): void {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    // Check immediately
    this.checkHitRate();

    // Then check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkHitRate();
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check cache hit rate and create alerts if needed
   */
  private async checkHitRate(): Promise<void> {
    try {
      const stats = await cache.getHitRate();
      const now = Date.now();

      // Check if hit rate is below threshold
      if (stats.hitRate < HIT_RATE_THRESHOLD) {
        // Track when low hit rate started
        if (this.lowHitRateStartTime === null) {
          this.lowHitRateStartTime = now;
        }

        // Check if low hit rate has persisted for > 30 minutes
        const durationLow = now - this.lowHitRateStartTime;
        if (durationLow > MONITORING_WINDOW_MS) {
          // Only alert once per 30-minute window
          if (now - this.lastAlertTime > MONITORING_WINDOW_MS) {
            await this.alertLowHitRate({
              ...stats,
              windowStart: this.lowHitRateStartTime,
            });
            this.lastAlertTime = now;
          }
        }
      } else {
        // Hit rate is good, reset tracking
        this.lowHitRateStartTime = null;
      }

      // Log to Supabase logs (via error tracking with appropriate level)
      if (stats.hitRate < HIT_RATE_THRESHOLD) {
        console.warn(
          `⚠️ Cache hit rate below threshold: ${stats.hitRate.toFixed(2)}% (${stats.hits}/${stats.totalRequests} hits)`,
        );
      }
    } catch (error) {
      console.error('Error checking cache hit rate:', error);
    }
  }

  /**
   * Alert when cache hit rate is low
   */
  private async alertLowHitRate(stats: {
    hitRate: number;
    hits: number;
    misses: number;
    totalRequests: number;
    windowStart: number;
  }): Promise<void> {
    const durationMinutes = Math.floor(MONITORING_WINDOW_MS / (60 * 1000));
    const message = `Cache hit rate is ${stats.hitRate.toFixed(2)}% (below ${HIT_RATE_THRESHOLD}% threshold). Hits: ${stats.hits}, Misses: ${stats.misses}, Total: ${stats.totalRequests}`;

    // Record in database (async, don't await)
    try {
      await supabase.rpc('record_cache_metrics', {
        p_hit_rate: stats.hitRate,
        p_hits: stats.hits,
        p_misses: stats.misses,
        p_total_requests: stats.totalRequests,
        p_window_start: new Date(stats.windowStart).toISOString(),
      });

      await supabase.rpc('create_cache_alert', {
        p_hit_rate: stats.hitRate,
        p_hits: stats.hits,
        p_misses: stats.misses,
        p_total_requests: stats.totalRequests,
        p_duration_minutes: durationMinutes,
      });
    } catch (error) {
      console.error('Failed to record cache metrics:', error);
    }

    // Send to Sentry
    errorTracking.captureError(new Error(message), {
      tags: {
        category: 'cache_monitoring',
        alert_type: 'low_hit_rate',
      },
      extra: {
        hitRate: stats.hitRate,
        hits: stats.hits,
        misses: stats.misses,
        totalRequests: stats.totalRequests,
        threshold: HIT_RATE_THRESHOLD,
        duration: MONITORING_WINDOW_MS,
        durationMinutes,
      },
      level: 'warning',
    });

    // Log to console (will be picked up by Supabase logs if configured)
    console.error(`🚨 Cache Performance Alert: ${message}`);
  }

  /**
   * Get current cache monitoring status
   */
  async getStatus(): Promise<{
    hitRate: number;
    hits: number;
    misses: number;
    totalRequests: number;
    isHealthy: boolean;
    lowHitRateDuration: number | null;
  }> {
    const stats = await cache.getHitRate();
    const now = Date.now();
    const lowHitRateDuration =
      this.lowHitRateStartTime !== null ? now - this.lowHitRateStartTime : null;

    return {
      ...stats,
      isHealthy: stats.hitRate >= HIT_RATE_THRESHOLD,
      lowHitRateDuration,
    };
  }
}

export const cacheMonitoring = CacheMonitoringService.getInstance();
