import { supabase } from '@/services/supabase';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export interface LockoutStatus {
  isLocked: boolean;
  attemptsRemaining?: number;
  lockedUntil?: Date;
  minutesRemaining?: number;
}

/**
 * Checks if an account is currently locked
 * @param email - User's email address
 * @returns Lockout status information
 */
export async function checkAccountLockout(
  email: string,
): Promise<LockoutStatus> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('locked_until, failed_login_attempts')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error checking account lockout:', error);
      return { isLocked: false };
    }

    if (!user) {
      return { isLocked: false };
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesRemaining = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000,
      );

      return {
        isLocked: true,
        lockedUntil: new Date(user.locked_until),
        minutesRemaining,
      };
    }

    // If lockout expired, auto-unlock
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await resetFailedAttempts(email);
      return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS };
    }

    // Calculate attempts remaining
    const attemptsRemaining = MAX_ATTEMPTS - (user.failed_login_attempts || 0);

    return {
      isLocked: false,
      attemptsRemaining,
    };
  } catch (error) {
    console.error('Error in checkAccountLockout:', error);
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
    // Get current failed attempts count
    const { data: user } = await supabase
      .from('users')
      .select('id, failed_login_attempts')
      .eq('email', email)
      .single();

    if (!user) return;

    const attempts = (user.failed_login_attempts || 0) + 1;

    // Record login attempt in login_attempts table
    await supabase.from('login_attempts').insert({
      email,
      user_id: user.id,
      success: false,
      ip_address: ipAddress,
      user_agent: userAgent,
      failure_reason: reason,
    });

    // Lock account if max attempts reached
    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);

      await supabase
        .from('users')
        .update({
          failed_login_attempts: attempts,
          locked_until: lockedUntil.toISOString(),
        })
        .eq('email', email);

      console.log(`Account locked for ${email} until ${lockedUntil}`);
    } else {
      // Just increment failed attempts
      await supabase
        .from('users')
        .update({ failed_login_attempts: attempts })
        .eq('email', email);

      console.log(`Failed attempt ${attempts}/${MAX_ATTEMPTS} for ${email}`);
    }
  } catch (error) {
    console.error('Error recording failed attempt:', error);
  }
}

/**
 * Resets failed login attempts after successful login
 * @param userId - User's ID or email
 */
export async function resetFailedAttempts(
  userIdOrEmail: string,
): Promise<void> {
  try {
    // Check if it's an email or UUID
    const isEmail = userIdOrEmail.includes('@');

    const updateQuery = supabase.from('users').update({
      failed_login_attempts: 0,
      locked_until: null,
    });

    if (isEmail) {
      await updateQuery.eq('email', userIdOrEmail);
    } else {
      await updateQuery.eq('id', userIdOrEmail);
    }

    console.log(`Reset failed attempts for ${userIdOrEmail}`);
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
    // Get user email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user) return;

    // Record in login_attempts
    await supabase.from('login_attempts').insert({
      email: user.email,
      user_id: userId,
      success: true,
      ip_address: deviceInfo?.ipAddress,
      user_agent: deviceInfo?.userAgent,
      device_info: deviceInfo
        ? {
            platform: deviceInfo.platform,
            version: deviceInfo.version,
          }
        : null,
    });

    // Record in login_history
    await supabase.from('login_history').insert({
      user_id: userId,
      success: true,
      method,
      ip_address: deviceInfo?.ipAddress,
      user_agent: deviceInfo?.userAgent,
      device_info: deviceInfo
        ? {
            platform: deviceInfo.platform,
            version: deviceInfo.version,
          }
        : null,
    });

    // Reset failed attempts
    await resetFailedAttempts(userId);
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
