import { VersionedApiClient } from '@/services/VersionedApiClient';

const MAX_ATTEMPTS = 5;

export interface LockoutStatus {
  isLocked: boolean;
  attemptsRemaining?: number;
  lockedUntil?: Date;
  minutesRemaining?: number;
}

const versionedApiClient = VersionedApiClient.getInstance();

/**
 * Checks if an account is currently locked
 * @param email - User's email address
 * @returns Lockout status information
 */
export async function checkAccountLockout(
  email: string,
): Promise<LockoutStatus> {
  try {
    const response = await versionedApiClient.checkAccountLockout(email);

    if (response.error) {
      console.error('Error checking account lockout:', response.error);
      // On error, assume account is not locked to allow login to proceed
      return { isLocked: false };
    }

    if (!response.data) {
      return { isLocked: false };
    }

    const data = response.data;

    // If account is locked, return lockout status
    if (data.isLocked && data.lockedUntil) {
      return {
        isLocked: true,
        lockedUntil: new Date(data.lockedUntil),
        minutesRemaining: data.minutesRemaining,
      };
    }

    // Account is not locked
    return {
      isLocked: false,
      attemptsRemaining: data.attemptsRemaining,
    };
  } catch (error) {
    console.error('Error in checkAccountLockout:', error);
    // On error, assume account is not locked to allow login to proceed
    return { isLocked: false };
  }
}

/**
 * Records a failed login attempt and locks account if threshold reached
 * @param email - User's email address
 * @param reason - Reason for failure
 */
export async function recordFailedAttempt(
  email: string,
  reason: string = 'invalid_credentials',
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    const response = await versionedApiClient.recordFailedAttempt({
      email,
      reason,
      ipAddress,
      userAgent,
    });

    if (response.error) {
      console.error('Error recording failed attempt:', response.error);
      return;
    }

    if (response.data) {
      const { attempts, isLocked } = response.data;
      if (isLocked) {
        console.log(
          `Account locked for ${email} (${attempts}/${MAX_ATTEMPTS} attempts)`,
        );
      } else {
        console.log(`Failed attempt ${attempts}/${MAX_ATTEMPTS} for ${email}`);
      }
    }
  } catch (error) {
    console.error('Error recording failed attempt:', error);
  }
}

/**
 * Resets failed login attempts after successful login
 * @param userIdOrEmail - User's ID or email
 */
export async function resetFailedAttempts(
  userIdOrEmail: string,
): Promise<void> {
  try {
    const response =
      await versionedApiClient.resetFailedAttempts(userIdOrEmail);

    if (response.error) {
      console.error('Error resetting failed attempts:', response.error);
      return;
    }

    if (response.data?.reset) {
      console.log(`Reset failed attempts for ${userIdOrEmail}`);
    }
  } catch (error) {
    console.error('Error resetting failed attempts:', error);
  }
}

/**
 * Records a successful login
 * @param userId - User's ID
 * @param method - Authentication method used
 * @param deviceInfo - Device information
 */
export async function recordSuccessfulLogin(
  userId: string,
  method: string = 'email',
  deviceInfo?: {
    platform?: string;
    version?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {
  try {
    const response = await versionedApiClient.recordSuccessfulLogin({
      userId,
      method,
      deviceInfo,
    });

    if (response.error) {
      console.error('Error recording successful login:', response.error);
      return;
    }

    if (response.data?.recorded) {
      // Reset failed attempts is handled by the Edge Function
      console.log(`Successful login recorded for user ${userId}`);
    }
  } catch (error) {
    console.error('Error recording successful login:', error);
  }
}

/**
 * Gets the lockout error message
 * @param minutesRemaining - Minutes until unlock
 */
export function getLockoutMessage(minutesRemaining: number): string {
  if (minutesRemaining > 60) {
    const hours = Math.ceil(minutesRemaining / 60);
    return `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${hours} hour${hours > 1 ? 's' : ''}.`;
  }
  return `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`;
}
