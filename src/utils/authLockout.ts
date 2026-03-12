// Offline MVP stub — lockout edge functions not available

export interface LockoutStatus {
  isLocked: boolean;
  attemptsRemaining?: number;
  lockedUntil?: Date;
  minutesRemaining?: number;
}

export async function checkAccountLockout(
  _email: string,
): Promise<LockoutStatus> {
  return { isLocked: false };
}

export async function recordFailedAttempt(
  _email: string,
  _reason: string = 'invalid_credentials',
  _ipAddress?: string,
  _userAgent?: string,
): Promise<void> {}

export async function resetFailedAttempts(
  _userIdOrEmail: string,
): Promise<void> {}

export async function recordSuccessfulLogin(
  _userId: string,
  _method: string = 'email',
  _deviceInfo?: {
    platform?: string;
    version?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {}

export function getLockoutMessage(minutesRemaining: number): string {
  if (minutesRemaining > 60) {
    const hours = Math.ceil(minutesRemaining / 60);
    return `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${hours} hour${hours > 1 ? 's' : ''}.`;
  }
  return `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`;
}
