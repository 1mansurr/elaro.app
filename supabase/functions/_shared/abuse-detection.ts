/**
 * Abuse Detection System
 *
 * Tracks violations and implements graduated responses (normal → warning → throttled → blocked)
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

export type ViolationType = 'rate_limit' | 'invalid_auth' | 'malformed_request';
export type AbuseStatus = 'normal' | 'warning' | 'throttled' | 'blocked';

export interface AbuseMetrics {
  userId?: string;
  ipAddress: string;
  violationCount: number;
  lastViolation: Date;
  status: AbuseStatus;
}

// Thresholds for graduated responses
const ABUSE_THRESHOLDS = {
  warning: 3, // After 3 violations
  throttled: 10, // After 10 violations
  blocked: 25, // After 25 violations
};

// Time windows for violation counting (in hours)
// const VIOLATION_WINDOW = 24; // Count violations in last 24 hours (unused)

/**
 * Check abuse status for a user/IP combination
 */
export async function checkAbuseStatus(
  supabaseClient: SupabaseClient,
  userId: string | null,
  ipAddress: string,
): Promise<AbuseMetrics> {
  try {
    let query = supabaseClient.from('abuse_tracking').select('*');

    // Query by user_id if available, otherwise by IP
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    query = query.eq('ip_address', ipAddress);

    const { data: records, error } = await query;

    if (error) {
      console.error('Error checking abuse status:', error);
      // Default to normal if we can't check
      return {
        userId: userId || undefined,
        ipAddress,
        violationCount: 0,
        lastViolation: new Date(),
        status: 'normal',
      };
    }

    if (!records || records.length === 0) {
      return {
        userId: userId || undefined,
        ipAddress,
        violationCount: 0,
        lastViolation: new Date(),
        status: 'normal',
      };
    }

    // Aggregate violations across all records for this user/IP
    const totalViolations = records.reduce(
      (sum, record) => sum + record.violation_count,
      0,
    );
    const mostSevereStatus = records.reduce((current, record) => {
      const severity: Record<AbuseStatus, number> = {
        normal: 0,
        warning: 1,
        throttled: 2,
        blocked: 3,
      };
      return severity[record.status as AbuseStatus] >
        severity[current as AbuseStatus]
        ? record.status
        : current;
    }, 'normal' as AbuseStatus);

    const lastViolation = records.reduce((latest, record) => {
      const recordDate = new Date(record.last_violation);
      return recordDate > latest ? recordDate : latest;
    }, new Date(0));

    return {
      userId: userId || undefined,
      ipAddress,
      violationCount: totalViolations,
      lastViolation,
      status: mostSevereStatus,
    };
  } catch (error) {
    console.error('Unexpected error checking abuse status:', error);
    return {
      userId: userId || undefined,
      ipAddress,
      violationCount: 0,
      lastViolation: new Date(),
      status: 'normal',
    };
  }
}

/**
 * Record a violation and update abuse status
 */
export async function recordViolation(
  supabaseClient: SupabaseClient,
  userId: string | null,
  ipAddress: string,
  violationType: ViolationType,
): Promise<void> {
  try {
    // Check existing record
    let query = supabaseClient.from('abuse_tracking').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    query = query
      .eq('ip_address', ipAddress)
      .eq('violation_type', violationType);

    const { data: existing, error: selectError } = await query;

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing abuse record:', selectError);
      return;
    }

    const now = new Date().toISOString();
    const violationCount =
      existing && existing.length > 0 ? existing[0].violation_count + 1 : 1;

    // Determine new status based on violation count
    let newStatus: AbuseStatus = 'normal';
    if (violationCount >= ABUSE_THRESHOLDS.blocked) {
      newStatus = 'blocked';
    } else if (violationCount >= ABUSE_THRESHOLDS.throttled) {
      newStatus = 'throttled';
    } else if (violationCount >= ABUSE_THRESHOLDS.warning) {
      newStatus = 'warning';
    }

    if (existing && existing.length > 0) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from('abuse_tracking')
        .update({
          violation_count: violationCount,
          status: newStatus,
          last_violation: now,
          updated_at: now,
        })
        .eq('id', existing[0].id);

      if (updateError) {
        console.error('Error updating abuse record:', updateError);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabaseClient
        .from('abuse_tracking')
        .insert({
          user_id: userId,
          ip_address: ipAddress,
          violation_type: violationType,
          violation_count: violationCount,
          status: newStatus,
          first_violation: now,
          last_violation: now,
        });

      if (insertError) {
        console.error('Error inserting abuse record:', insertError);
      }
    }

    // Log if status escalated
    if (
      newStatus !== 'normal' &&
      (!existing || existing.length === 0 || existing[0].status !== newStatus)
    ) {
      console.warn(
        `⚠️ Abuse status escalated to ${newStatus} for ${userId || ipAddress} (${violationCount} violations)`,
      );
    }
  } catch (error) {
    console.error('Unexpected error recording violation:', error);
  }
}

/**
 * Check if request should be blocked based on abuse status
 */
export async function shouldBlockRequest(
  supabaseClient: SupabaseClient,
  userId: string | null,
  ipAddress: string,
): Promise<{ blocked: boolean; status?: AbuseStatus; message?: string }> {
  const abuseStatus = await checkAbuseStatus(supabaseClient, userId, ipAddress);

  if (abuseStatus.status === 'blocked') {
    return {
      blocked: true,
      status: 'blocked',
      message:
        'Your account/IP has been temporarily blocked due to repeated violations. Please contact support.',
    };
  }

  return { blocked: false };
}
