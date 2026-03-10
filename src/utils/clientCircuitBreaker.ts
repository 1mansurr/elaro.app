/**
 * @deprecated This file is deprecated. Use @/utils/circuitBreaker instead.
 *
 * This file is kept for backward compatibility but will be removed in a future version.
 * All new code should use CircuitBreaker.getInstance() from @/utils/circuitBreaker.
 *
 * Migration example:
 * ```typescript
 * // Old:
 * import { revenueCatCircuitBreaker } from '@/utils/clientCircuitBreaker';
 * await revenueCatCircuitBreaker.execute(async () => { ... });
 *
 * // New:
 * import { CircuitBreaker } from '@/utils/circuitBreaker';
 * await CircuitBreaker.getInstance('revenuecat', {
 *   failureThreshold: 3,
 *   resetTimeout: 30000,
 * }).execute(async () => { ... });
 * ```
 */

// Import the type for use in this file
import { CircuitBreaker } from '@/utils/circuitBreaker';

// Re-export for backward compatibility
export { CircuitBreaker } from '@/utils/circuitBreaker';

// Deprecated: Use CircuitBreaker.getInstance('revenuecat', { failureThreshold: 3, resetTimeout: 30000 }) instead
export const revenueCatCircuitBreaker = CircuitBreaker.getInstance(
  'revenuecat',
  {
    failureThreshold: 3,
    resetTimeout: 30000,
  },
);
