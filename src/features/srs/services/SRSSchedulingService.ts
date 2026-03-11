import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as SQLite from 'expo-sqlite';

import { getDatabase } from '@/services/database';
import { getOrCreateDeviceId } from '@/utils/deviceId';
import { generateUUID } from '@/utils/uuid';

// Fixed SRS intervals (days) — no subscription-tier branching
const SRS_INTERVALS = [1, 3, 7, 14, 30];

const PREFERENCES_KEY = 'srs_user_preferences';

// ─────────────────────────────────────────────────────────────
// Public interfaces (kept compatible with useSRSScheduling.ts)
// ─────────────────────────────────────────────────────────────

export interface SRSUserPreferences {
  preferredStudyTimes: TimeSlot[];
  difficultyAdjustment: 'conservative' | 'moderate' | 'aggressive';
  reminderFrequency: 'minimal' | 'standard' | 'frequent';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  customIntervals: number[];
  timezone: string;
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface SRSConfiguration {
  intervals: number[];
  jitterMinutes: number;
  preferredHour: number;
}

export interface ScheduledReminder {
  id: string;
  session_id: string;
  reminder_time: string;
  reminder_type: 'spaced_repetition';
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SRSItem {
  id: string;
  user_id: string;
  task_id: string | null;
  topic: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  last_quality_rating: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// SM-2 Algorithm (pure JS)
// ─────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateNextInterval(
  item: SRSItem,
  qualityRating: 1 | 2 | 3 | 4 | 5,
): SRSItem {
  const newItem = { ...item };
  if (qualityRating < 3) {
    newItem.repetitions = 0;
    newItem.interval_days = 1;
  } else {
    newItem.repetitions += 1;
    newItem.interval_days =
      newItem.repetitions === 1
        ? 1
        : newItem.repetitions === 2
          ? 6
          : Math.round(newItem.interval_days * newItem.ease_factor);
    newItem.ease_factor = Math.max(
      1.3,
      newItem.ease_factor +
        0.1 -
        (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02),
    );
  }
  newItem.last_quality_rating = qualityRating;
  newItem.last_reviewed_at = new Date().toISOString();
  newItem.next_review_date = addDays(
    new Date(),
    newItem.interval_days,
  ).toISOString();
  return newItem;
}

// ─────────────────────────────────────────────────────────────
// Local notification helper
// ─────────────────────────────────────────────────────────────

async function scheduleLocalNotification(
  db: SQLite.SQLiteDatabase,
  reminder: { id: string; title: string; body: string; scheduled_time: string },
): Promise<void> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body,
      data: { reminderId: reminder.id },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(reminder.scheduled_time),
    },
  });
  await db.runAsync(
    'UPDATE reminders SET expo_notification_id = ? WHERE id = ?',
    [notificationId, reminder.id],
  );
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export class SRSSchedulingService {
  private static instance: SRSSchedulingService;

  public static getInstance(): SRSSchedulingService {
    if (!SRSSchedulingService.instance) {
      SRSSchedulingService.instance = new SRSSchedulingService();
    }
    return SRSSchedulingService.instance;
  }

  /**
   * Schedule SRS reminders for a study session.
   * sessionId is treated as the task_id for the study session row.
   */
  async scheduleReminders(
    sessionId: string,
    _userId: string,
    sessionDate: Date,
    topic: string,
    preferences?: Partial<SRSUserPreferences>,
  ): Promise<ScheduledReminder[]> {
    const config = this.buildConfig(preferences);
    const intervals = this.resolveIntervals(config, preferences);
    return this.createReminders(
      sessionId,
      sessionDate,
      topic,
      intervals,
      config,
    );
  }

  /**
   * Record a review result for an SRS item (SM-2 update + reschedule).
   */
  async recordReview(
    srsItemId: string,
    qualityRating: 1 | 2 | 3 | 4 | 5,
    topic: string,
    preferences?: Partial<SRSUserPreferences>,
  ): Promise<void> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    const now = new Date().toISOString();

    const row = await db.getFirstAsync<SRSItem>(
      'SELECT * FROM srs_items WHERE id = ?',
      [srsItemId],
    );
    if (!row) throw new Error(`SRS item not found: ${srsItemId}`);

    const updated = calculateNextInterval(row, qualityRating);

    await db.runAsync(
      `UPDATE srs_items
       SET interval_days = ?, ease_factor = ?, repetitions = ?,
           next_review_date = ?, last_reviewed_at = ?, last_quality_rating = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        updated.interval_days,
        updated.ease_factor,
        updated.repetitions,
        updated.next_review_date,
        updated.last_reviewed_at,
        updated.last_quality_rating,
        now,
        srsItemId,
      ],
    );

    // Cancel existing unfired reminders for this SRS item
    const existing = await db.getAllAsync<{
      id: string;
      expo_notification_id: string | null;
    }>(
      `SELECT id, expo_notification_id FROM reminders
       WHERE srs_item_id = ? AND is_cancelled = 0 AND fired_at IS NULL`,
      [srsItemId],
    );
    for (const r of existing) {
      if (r.expo_notification_id) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            r.expo_notification_id,
          );
        } catch {
          // ignore if already fired
        }
      }
    }
    if (existing.length > 0) {
      await db.runAsync(
        `UPDATE reminders SET is_cancelled = 1, updated_at = ?
         WHERE srs_item_id = ? AND is_cancelled = 0`,
        [now, srsItemId],
      );
    }

    // Schedule next review reminder
    const config = this.buildConfig(preferences);
    const nextDate = new Date(updated.next_review_date);
    nextDate.setHours(config.preferredHour, 0, 0, 0);
    const jittered = this.addDeterministicJitter(
      nextDate,
      config.jitterMinutes,
      `${srsItemId}-${updated.interval_days}`,
    );

    const reminderId = generateUUID();
    const title = `Review: ${topic}`;
    const body = `Time to review "${topic}" to reinforce your memory.`;

    await db.runAsync(
      `INSERT INTO reminders
         (id, user_id, srs_item_id, title, body, scheduled_time, reminder_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'srs_review', ?, ?)`,
      [
        reminderId,
        deviceId,
        srsItemId,
        title,
        body,
        jittered.toISOString(),
        now,
        now,
      ],
    );

    await scheduleLocalNotification(db, {
      id: reminderId,
      title,
      body,
      scheduled_time: jittered.toISOString(),
    });
  }

  /**
   * Create or retrieve the SRS item for a completed study session.
   */
  async createOrUpdateSRSItem(taskId: string, topic: string): Promise<SRSItem> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    const now = new Date().toISOString();
    const tomorrow = addDays(new Date(), 1).toISOString();

    const existing = await db.getFirstAsync<SRSItem>(
      'SELECT * FROM srs_items WHERE task_id = ? AND user_id = ?',
      [taskId, deviceId],
    );
    if (existing) return existing;

    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO srs_items
         (id, user_id, task_id, topic, interval_days, ease_factor, repetitions,
          next_review_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 2.5, 0, ?, 1, ?, ?)`,
      [id, deviceId, taskId, topic, tomorrow, now, now],
    );

    return (await db.getFirstAsync<SRSItem>(
      'SELECT * FROM srs_items WHERE id = ?',
      [id],
    ))!;
  }

  /**
   * Persist updated SRS preferences to AsyncStorage.
   */
  async updateUserPreferences(
    _userId: string,
    preferences: Partial<SRSUserPreferences>,
  ): Promise<void> {
    const current = await this.getUserPreferences(_userId);
    const merged = { ...(current ?? {}), ...preferences };
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(merged));
  }

  /**
   * Retrieve SRS preferences from AsyncStorage.
   */
  async getUserPreferences(
    _userId: string,
  ): Promise<SRSUserPreferences | null> {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SRSUserPreferences;
    } catch {
      return null;
    }
  }

  // ─── Private helpers ──────────────────────────────────────

  private buildConfig(
    preferences?: Partial<SRSUserPreferences>,
  ): SRSConfiguration {
    return {
      intervals: SRS_INTERVALS,
      jitterMinutes: preferences?.reminderFrequency === 'minimal' ? 60 : 30,
      preferredHour: this.getPreferredHour(preferences),
    };
  }

  private resolveIntervals(
    config: SRSConfiguration,
    preferences?: Partial<SRSUserPreferences>,
  ): number[] {
    let intervals =
      preferences?.customIntervals && preferences.customIntervals.length > 0
        ? preferences.customIntervals
        : [...config.intervals];

    if (preferences?.difficultyAdjustment) {
      intervals = this.adjustIntervalsForDifficulty(
        intervals,
        preferences.difficultyAdjustment,
      );
    }

    return intervals;
  }

  private async createReminders(
    sessionId: string,
    sessionDate: Date,
    topic: string,
    intervals: number[],
    config: SRSConfiguration,
  ): Promise<ScheduledReminder[]> {
    const db = await getDatabase();
    const deviceId = await getOrCreateDeviceId();
    const now = new Date().toISOString();

    // Cancel existing unfired srs_review reminders for this session
    const existing = await db.getAllAsync<{
      id: string;
      expo_notification_id: string | null;
    }>(
      `SELECT id, expo_notification_id FROM reminders
       WHERE task_id = ? AND reminder_type = 'srs_review'
         AND is_cancelled = 0 AND fired_at IS NULL`,
      [sessionId],
    );
    for (const r of existing) {
      if (r.expo_notification_id) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            r.expo_notification_id,
          );
        } catch {
          // ignore
        }
      }
    }
    if (existing.length > 0) {
      await db.runAsync(
        `UPDATE reminders SET is_cancelled = 1, updated_at = ?
         WHERE task_id = ? AND reminder_type = 'srs_review' AND is_cancelled = 0`,
        [now, sessionId],
      );
    }

    const results: ScheduledReminder[] = [];

    for (const days of intervals) {
      const reminderDate = addDays(sessionDate, days);
      reminderDate.setHours(config.preferredHour, 0, 0, 0);
      const jittered = this.addDeterministicJitter(
        reminderDate,
        config.jitterMinutes,
        `${sessionId}-${days}`,
      );

      const title = `Spaced Repetition: Review "${topic}"`;
      const body = `It's time to review your study session on "${topic}" to strengthen your memory.`;
      const reminderId = generateUUID();

      await db.runAsync(
        `INSERT INTO reminders
           (id, user_id, task_id, title, body, scheduled_time, reminder_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'srs_review', ?, ?)`,
        [
          reminderId,
          deviceId,
          sessionId,
          title,
          body,
          jittered.toISOString(),
          now,
          now,
        ],
      );

      await scheduleLocalNotification(db, {
        id: reminderId,
        title,
        body,
        scheduled_time: jittered.toISOString(),
      });

      results.push({
        id: reminderId,
        session_id: sessionId,
        reminder_time: jittered.toISOString(),
        reminder_type: 'spaced_repetition',
        title,
        body,
        priority: 'medium',
      });
    }

    return results;
  }

  private adjustIntervalsForDifficulty(
    intervals: number[],
    difficulty: string,
  ): number[] {
    switch (difficulty) {
      case 'conservative':
        return intervals.map(i => Math.max(1, Math.floor(i * 0.8)));
      case 'aggressive':
        return intervals.map(i => Math.floor(i * 1.3));
      default:
        return intervals;
    }
  }

  private getPreferredHour(preferences?: Partial<SRSUserPreferences>): number {
    if (preferences?.preferredStudyTimes?.length) {
      return parseInt(
        preferences.preferredStudyTimes[0].start.split(':')[0],
        10,
      );
    }
    return 10; // Default to 10 AM
  }

  private seededRandom(seed: string, max: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return (Math.abs(hash) % (max * 2 + 1)) - max;
  }

  private addDeterministicJitter(
    date: Date,
    maxMinutes: number,
    seed: string,
  ): Date {
    const jitterValue = this.seededRandom(seed, maxMinutes);
    return new Date(date.getTime() + jitterValue * 60000);
  }
}
