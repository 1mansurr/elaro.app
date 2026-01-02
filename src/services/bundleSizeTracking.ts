/**
 * Bundle Size Tracking Service
 *
 * Tracks bundle sizes in production and reports to analytics.
 * Integrates with build process to monitor bundle size changes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { mixpanelService } from './mixpanel';

const BUNDLE_SIZE_KEY = '@elaro_bundle_size';
const BUNDLE_SIZE_HISTORY_KEY = '@elaro_bundle_size_history';

interface BundleSizeMetrics {
  platform: 'ios' | 'android' | 'web';
  jsBundleSize: number;
  totalSize: number;
  timestamp: number;
  version: string;
}

interface BundleSizeHistory {
  entries: BundleSizeMetrics[];
  lastUpdated: number;
}

/**
 * Track bundle size metrics
 * Called during app initialization to track current bundle size
 */
export async function trackBundleSize(): Promise<void> {
  try {
    // Get app version
    const version = require('../../app.json').version || '1.0.0';

    // Get platform
    const platform = require('react-native').Platform.OS as 'ios' | 'android';

    // Estimate bundle size (in production, this would be actual bundle size)
    // For now, we'll track based on available metrics
    const metrics: BundleSizeMetrics = {
      platform,
      jsBundleSize: 0, // Would be populated from actual bundle in production
      totalSize: 0,
      timestamp: Date.now(),
      version,
    };

    // Load history
    const historyData = await AsyncStorage.getItem(BUNDLE_SIZE_HISTORY_KEY);
    if (
      !historyData ||
      !historyData.trim() ||
      historyData === 'undefined' ||
      historyData === 'null'
    ) {
      return { entries: [], lastUpdated: 0 };
    }
    
    let history: BundleSizeHistory;
    try {
      history = JSON.parse(historyData);
    } catch {
      return { entries: [], lastUpdated: 0 };
    }

    // Add current metrics
    history.entries.push(metrics);

    // Keep only last 10 entries
    if (history.entries.length > 10) {
      history.entries.shift();
    }

    history.lastUpdated = Date.now();

    // Save history
    await AsyncStorage.setItem(
      BUNDLE_SIZE_HISTORY_KEY,
      JSON.stringify(history),
    );

    // Track to analytics
    mixpanelService.trackEvent('bundle_size_tracked', {
      platform,
      version,
      timestamp: metrics.timestamp,
    });

    // Compare with previous version
    if (history.entries.length > 1) {
      const previous = history.entries[history.entries.length - 2];
      const sizeChange = metrics.jsBundleSize - previous.jsBundleSize;
      const percentageChange =
        previous.jsBundleSize > 0
          ? (sizeChange / previous.jsBundleSize) * 100
          : 0;

      if (Math.abs(percentageChange) > 5) {
        // Significant change detected
        mixpanelService.trackEvent('bundle_size_change', {
          platform,
          version,
          previousVersion: previous.version,
          sizeChange,
          percentageChange,
          timestamp: metrics.timestamp,
        });
      }
    }
  } catch (error) {
    console.error('Failed to track bundle size:', error);
  }
}

/**
 * Get bundle size history
 */
export async function getBundleSizeHistory(): Promise<BundleSizeMetrics[]> {
  try {
    const historyData = await AsyncStorage.getItem(BUNDLE_SIZE_HISTORY_KEY);
    if (!historyData) {
      return [];
    }

    // Guard: Only parse if historyData is valid
    if (
      !historyData ||
      !historyData.trim() ||
      historyData === 'undefined' ||
      historyData === 'null'
    ) {
      return [];
    }
    
    let history: BundleSizeHistory;
    try {
      history = JSON.parse(historyData);
      return history.entries;
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Failed to get bundle size history:', error);
    return [];
  }
}

/**
 * Check if bundle size exceeds budget
 */
export async function checkBundleSizeBudget(
  size: number,
  budget: number = 2 * 1024 * 1024, // 2MB default
): Promise<boolean> {
  const exceedsBudget = size > budget;

  if (exceedsBudget) {
    mixpanelService.trackEvent('bundle_size_budget_exceeded', {
      size,
      budget,
      difference: size - budget,
      percentage: (size / budget) * 100,
    });
  }

  return !exceedsBudget;
}
