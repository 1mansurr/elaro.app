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
      // Check if it's a "function not found" error
      const isFunctionError =
        response.code === 'HTTP_404' ||
        response.code === 'NOT_FOUND' ||
        response.message?.includes('not found') ||
        response.message?.includes('Requested function was not found') ||
        response.error?.includes('not found') ||
        response.error?.includes('Requested function was not found');

      if (isFunctionError) {
        if (__DEV__) {
          console.warn(
            '⚠️ Account lockout edge function not available, assuming account is not locked',
          );
        }
      } else {
        // Only log non-function errors in dev mode
        if (__DEV__) {
          console.error('Error checking account lockout:', response.error);
        }
      }
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
    // Only log in dev mode
    if (__DEV__) {
      console.error('Error in checkAccountLockout:', error);
    }
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
      // Check if it's a "function not found" error
      const isFunctionError =
        response.code === 'HTTP_404' ||
        response.code === 'NOT_FOUND' ||
        response.message?.includes('not found') ||
        response.message?.includes('Requested function was not found') ||
        response.error?.includes('not found') ||
        response.error?.includes('Requested function was not found');

      if (isFunctionError) {
        if (__DEV__) {
          console.warn(
            '⚠️ Record failed attempt edge function not available, skipping',
          );
        }
      } else {
        // Only log non-function errors in dev mode
        if (__DEV__) {
          console.error('Error recording failed attempt:', response.error);
        }
      }
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
    // Only log in dev mode
    if (__DEV__) {
      console.error('Error recording failed attempt:', error);
    }
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
      // Check if it's a "function not found" error
      const isFunctionError =
        response.code === 'HTTP_404' ||
        response.code === 'NOT_FOUND' ||
        response.message?.includes('not found') ||
        response.message?.includes('Requested function was not found') ||
        response.error?.includes('not found') ||
        response.error?.includes('Requested function was not found');

      if (isFunctionError) {
        if (__DEV__) {
          console.warn(
            '⚠️ Reset failed attempts edge function not available, skipping',
          );
        }
      } else {
        // Only log non-function errors in dev mode
        if (__DEV__) {
          console.error('Error resetting failed attempts:', response.error);
        }
      }
      return;
    }

    if (response.data?.reset) {
      if (__DEV__) {
        console.log(`Reset failed attempts for ${userIdOrEmail}`);
      }
    }
  } catch (error) {
    // Only log in dev mode
    if (__DEV__) {
      console.error('Error resetting failed attempts:', error);
    }
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
      // Check if it's a "function not found" error
      const isFunctionError =
        response.code === 'HTTP_404' ||
        response.code === 'NOT_FOUND' ||
        response.message?.includes('not found') ||
        response.message?.includes('Requested function was not found') ||
        response.error?.includes('not found') ||
        response.error?.includes('Requested function was not found');

      if (isFunctionError) {
        if (__DEV__) {
          console.warn(
            '⚠️ Record successful login edge function not available, skipping',
          );
        }
      } else {
        // Only log non-function errors in dev mode
        if (__DEV__) {
          console.error('Error recording successful login:', response.error);
        }
      }
      return;
    }

    if (response.data?.recorded) {
      // Reset failed attempts is handled by the Edge Function
      if (__DEV__) {
        console.log(`Successful login recorded for user ${userId}`);
      }
    }
  } catch (error) {
    // Only log in dev mode
    if (__DEV__) {
      console.error('Error recording successful login:', error);
    }
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
