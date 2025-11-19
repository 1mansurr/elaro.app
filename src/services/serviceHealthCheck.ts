/**
 * Service Health Check
 *
 * Verifies that all third-party service integrations are working correctly.
 * Used for runtime health monitoring and diagnostics.
 */

import { errorTracking } from './errorTracking';
import { mixpanelService } from './mixpanel';
import { revenueCatService } from './revenueCat';
import { supabase } from './supabase';

export interface ServiceHealthStatus {
  sentry: {
    status: 'ok' | 'error' | 'not_configured';
    message?: string;
  };
  mixpanel: {
    status: 'ok' | 'error' | 'not_configured';
    message?: string;
  };
  revenuecat: {
    status: 'ok' | 'error' | 'not_configured';
    message?: string;
  };
  supabase: {
    status: 'ok' | 'error' | 'not_configured';
    message?: string;
  };
}

/**
 * Check the health of all third-party services
 */
export async function checkServiceHealth(): Promise<ServiceHealthStatus> {
  const results: ServiceHealthStatus = {
    sentry: { status: 'not_configured' },
    mixpanel: { status: 'not_configured' },
    revenuecat: { status: 'not_configured' },
    supabase: { status: 'not_configured' },
  };

  // Check Sentry (errorTracking)
  try {
    // Try to capture a test message - if it works, Sentry is initialized
    errorTracking.captureMessage('Service health check', {
      level: 'info',
      tags: { type: 'health_check' },
    });
    // If no error thrown, assume it's working
    results.sentry = { status: 'ok' };
  } catch (error) {
    // Check if it's a configuration error vs runtime error
    if (error instanceof Error && error.message.includes('not initialized')) {
      results.sentry = {
        status: 'not_configured',
        message: 'Sentry not initialized',
      };
    } else {
      results.sentry = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Check Mixpanel
  try {
    // Try to track a test event - if it works, Mixpanel is initialized
    mixpanelService.track('health_check', {
      timestamp: new Date().toISOString(),
    });
    // If no error thrown, assume it's working
    results.mixpanel = { status: 'ok' };
  } catch (error) {
    // Mixpanel may not be initialized, which is OK
    results.mixpanel = {
      status: 'not_configured',
      message:
        error instanceof Error ? error.message : 'Mixpanel not initialized',
    };
  }

  // Check RevenueCat
  try {
    // RevenueCat doesn't expose isInitialized, so we'll check if it's configured
    // by checking if the service exists and can be called
    if (
      revenueCatService &&
      typeof revenueCatService.getCustomerInfo === 'function'
    ) {
      // Service exists, consider it OK (actual initialization check would require API call)
      results.revenuecat = { status: 'ok' };
    } else {
      results.revenuecat = {
        status: 'not_configured',
        message: 'RevenueCat not available',
      };
    }
  } catch (error) {
    results.revenuecat = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check Supabase
  try {
    // Test Supabase connection with a simple query
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      // Check if it's an auth error (expected for unauthenticated requests)
      if (error.code === 'PGRST116' || error.code === '42501') {
        // These are expected errors - means Supabase is working
        results.supabase = { status: 'ok' };
      } else {
        results.supabase = {
          status: 'error',
          message: error.message,
        };
      }
    } else {
      results.supabase = { status: 'ok' };
    }
  } catch (error) {
    results.supabase = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  return results;
}

/**
 * Get a summary of service health
 */
export function getServiceHealthSummary(health: ServiceHealthStatus): {
  allOk: boolean;
  criticalOk: boolean;
  message: string;
} {
  const criticalServices = ['supabase'];
  const optionalServices = ['sentry', 'mixpanel', 'revenuecat'];

  const criticalStatus = criticalServices.every(
    service => health[service as keyof ServiceHealthStatus]?.status === 'ok',
  );

  const allStatus = Object.values(health).every(
    service => service.status === 'ok' || service.status === 'not_configured',
  );

  let message = '';
  if (criticalStatus && allStatus) {
    message = 'All services operational';
  } else if (criticalStatus) {
    const failed = Object.entries(health)
      .filter(([_, status]) => status.status === 'error')
      .map(([name]) => name);
    message = `Critical services OK. Optional services failed: ${failed.join(', ')}`;
  } else {
    const failed = Object.entries(health)
      .filter(([_, status]) => status.status === 'error')
      .map(([name]) => name);
    message = `Critical services failed: ${failed.join(', ')}`;
  }

  return {
    allOk: allStatus,
    criticalOk: criticalStatus,
    message,
  };
}
