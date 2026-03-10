/**
 * Circuit Breaker Monitoring Utility
 *
 * Provides monitoring and alerting for circuit breaker states
 */

import { getSupabaseCircuitBreakerStats } from './supabaseQueryWrapper';

let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Monitor circuit breakers and alert on failures
 */
export function monitorCircuitBreakers() {
  try {
    const stats = getSupabaseCircuitBreakerStats();

    // Alert if circuit breaker is open
    if (stats.state === 'open') {
      console.warn(
        `⚠️ Supabase circuit breaker is OPEN after ${stats.failures} failures`,
      );
    }

    // Log half-open state for monitoring
    if (stats.state === 'half-open') {
      console.warn(
        '⚠️ Supabase circuit breaker is HALF-OPEN (testing recovery)',
      );
    }

    return stats;
  } catch (error) {
    console.error('Error monitoring circuit breakers:', error);
    return null;
  }
}

/**
 * Start monitoring circuit breakers periodically
 */
export function startCircuitBreakerMonitoring(intervalMs: number = 30000) {
  if (monitoringInterval) {
    stopCircuitBreakerMonitoring();
  }

  monitoringInterval = setInterval(() => {
    monitorCircuitBreakers();
  }, intervalMs);

  console.log(
    `✅ Circuit breaker monitoring started (interval: ${intervalMs}ms)`,
  );
}

/**
 * Stop monitoring circuit breakers
 */
export function stopCircuitBreakerMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('🛑 Circuit breaker monitoring stopped');
  }
}

/**
 * Initialize monitoring on module load
 */
if (typeof setInterval !== 'undefined') {
  // Start monitoring after a short delay to allow app initialization
  setTimeout(() => {
    startCircuitBreakerMonitoring(30000); // Check every 30 seconds
  }, 5000); // Wait 5 seconds after app load
}
