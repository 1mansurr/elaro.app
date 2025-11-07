/**
 * Deterministic Jitter Utilities
 *
 * Provides both deterministic (seed-based) and random jitter functions.
 * Deterministic jitter ensures the same inputs produce the same jittered time,
 * which is useful for testing and consistency.
 */

/**
 * Generate a deterministic "random" value based on a seed string
 * Uses a simple hash function to convert string seed to number
 */
function seededRandom(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Map to range [-max, max]
  return (Math.abs(hash) % (max * 2 + 1)) - max;
}

/**
 * Add deterministic jitter to a date based on a seed
 * Same seed will always produce the same jitter value
 *
 * @param date - Base date to add jitter to
 * @param maxMinutes - Maximum minutes to jitter (±maxMinutes)
 * @param seed - Seed string for deterministic generation (e.g., "sessionId-interval")
 * @returns New date with jitter applied
 */
export function addDeterministicJitter(
  date: Date,
  maxMinutes: number,
  seed: string,
): Date {
  const jitterValue = seededRandom(seed, maxMinutes);
  return new Date(date.getTime() + jitterValue * 60000);
}

/**
 * Add random jitter to a date (non-deterministic)
 * Useful when you need true randomness
 *
 * @param date - Base date to add jitter to
 * @param maxMinutes - Maximum minutes to jitter (±maxMinutes)
 * @returns New date with jitter applied
 */
export function addRandomJitter(date: Date, maxMinutes: number): Date {
  const jitterMinutes =
    Math.floor(Math.random() * (maxMinutes * 2 + 1)) - maxMinutes;
  return new Date(date.getTime() + jitterMinutes * 60000);
}
