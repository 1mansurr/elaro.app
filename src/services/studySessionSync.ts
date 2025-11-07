/**
 * Study Session Synchronization Service
 *
 * Manages synchronization between:
 * - Active session progress (local state)
 * - Session completion (Supabase)
 * - SRS performance records (local queue → Supabase)
 *
 * Features:
 * - Track ongoing session progress locally
 * - Resume partially completed sessions
 * - Sync SRS results when connection restores
 * - Handle offline/online transitions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import { syncManager } from '@/services/syncManager';
import { SRSPerformance } from '@/types/entities';

// Storage keys
const ACTIVE_SESSION_KEY = '@elaro_active_session_v1';
const SRS_QUEUE_KEY = '@elaro_srs_queue_v1';
const SESSION_PROGRESS_KEY = '@elaro_session_progress_v1';

interface ActiveSession {
  sessionId: string;
  userId: string;
  startedAt: number;
  lastUpdatedAt: number;
  timeSpentSeconds: number;
  notes?: string;
  difficultyRating?: number;
  confidenceLevel?: number;
  status: 'in_progress' | 'paused' | 'completed';
}

interface SessionProgress {
  sessionId: string;
  userId: string;
  timeSpentMinutes: number;
  notes?: string;
  difficultyRating?: number;
  confidenceLevel?: number;
  updatedAt: number;
}

interface PendingSRSPerformance {
  id: string;
  sessionId: string;
  userId: string;
  reminderId?: string;
  qualityRating: number;
  responseTimeSeconds?: number;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * StudySessionSyncService - Centralized study session synchronization
 */
class StudySessionSyncService {
  private activeSession: ActiveSession | null = null;
  private progressInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(session: ActiveSession | null) => void> = new Set();

  /**
   * Start tracking an active session
   */
  async startSession(
    sessionId: string,
    userId: string,
    initialNotes?: string,
  ): Promise<void> {
    try {
      const now = Date.now();

      this.activeSession = {
        sessionId,
        userId,
        startedAt: now,
        lastUpdatedAt: now,
        timeSpentSeconds: 0,
        notes: initialNotes,
        status: 'in_progress',
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify(this.activeSession),
      );

      // Start progress tracking interval (update every 10 seconds)
      this.startProgressTracking();

      console.log('📚 StudySessionSync: Session started', { sessionId });
      this.notifyListeners(this.activeSession);
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to start session:', error);
    }
  }

  /**
   * Update session progress (time, notes, ratings)
   */
  async updateSessionProgress(
    sessionId: string,
    updates: {
      timeSpentSeconds?: number;
      notes?: string;
      difficultyRating?: number;
      confidenceLevel?: number;
    },
  ): Promise<void> {
    try {
      if (!this.activeSession || this.activeSession.sessionId !== sessionId) {
        // Try to load from storage
        await this.loadActiveSession();
      }

      if (!this.activeSession || this.activeSession.sessionId !== sessionId) {
        console.warn('⚠️ StudySessionSync: No active session found for update');
        return;
      }

      // Update session
      this.activeSession = {
        ...this.activeSession,
        ...updates,
        lastUpdatedAt: Date.now(),
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify(this.activeSession),
      );

      // Save progress snapshot
      await this.saveProgressSnapshot(sessionId, this.activeSession.userId);

      this.notifyListeners(this.activeSession);
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to update progress:', error);
    }
  }

  /**
   * Pause active session
   */
  async pauseSession(): Promise<void> {
    try {
      if (!this.activeSession) {
        await this.loadActiveSession();
      }

      if (!this.activeSession) return;

      this.activeSession = {
        ...this.activeSession,
        status: 'paused',
        lastUpdatedAt: Date.now(),
      };

      await AsyncStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify(this.activeSession),
      );

      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }

      console.log('⏸️ StudySessionSync: Session paused', {
        sessionId: this.activeSession.sessionId,
      });
      this.notifyListeners(this.activeSession);
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to pause session:', error);
    }
  }

  /**
   * Resume paused session
   */
  async resumeSession(): Promise<void> {
    try {
      if (!this.activeSession) {
        await this.loadActiveSession();
      }

      if (!this.activeSession || this.activeSession.status !== 'paused') {
        return;
      }

      this.activeSession = {
        ...this.activeSession,
        status: 'in_progress',
        lastUpdatedAt: Date.now(),
      };

      await AsyncStorage.setItem(
        ACTIVE_SESSION_KEY,
        JSON.stringify(this.activeSession),
      );
      this.startProgressTracking();

      console.log('▶️ StudySessionSync: Session resumed', {
        sessionId: this.activeSession.sessionId,
      });
      this.notifyListeners(this.activeSession);
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to resume session:', error);
    }
  }

  /**
   * Complete session and sync to Supabase
   */
  async completeSession(
    sessionId: string,
    finalData: {
      timeSpentMinutes: number;
      notes?: string;
      difficultyRating?: number;
      confidenceLevel?: number;
    },
  ): Promise<void> {
    try {
      if (!this.activeSession || this.activeSession.sessionId !== sessionId) {
        await this.loadActiveSession();
      }

      // Save final progress snapshot
      await this.saveProgressSnapshot(
        sessionId,
        this.activeSession?.userId || '',
      );

      // Update session in Supabase
      try {
        const { error } = await supabase
          .from('study_sessions')
          .update({
            duration_minutes: finalData.timeSpentMinutes,
            notes: finalData.notes || null,
            difficulty_rating: finalData.difficultyRating || null,
            confidence_level: finalData.confidenceLevel || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (error) throw error;

        console.log('✅ StudySessionSync: Session completed and synced', {
          sessionId,
        });
      } catch (error) {
        console.error(
          '❌ StudySessionSync: Failed to sync completion, adding to queue:',
          error,
        );
        // Add to sync queue for offline handling
        if (this.activeSession?.userId) {
          await syncManager.addToQueue(
            'UPDATE',
            'study_session',
            {
              type: 'UPDATE',
              id: sessionId,
              data: finalData,
            },
            this.activeSession.userId,
            { syncImmediately: false },
          );
        }
      }

      // Clear active session
      await this.clearActiveSession();
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to complete session:', error);
    }
  }

  /**
   * Get active session (if any)
   */
  async getActiveSession(): Promise<ActiveSession | null> {
    if (this.activeSession) {
      return this.activeSession;
    }

    await this.loadActiveSession();
    return this.activeSession;
  }

  /**
   * Load active session from storage
   */
  private async loadActiveSession(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      if (!stored) {
        this.activeSession = null;
        return;
      }

      const session: ActiveSession = JSON.parse(stored);

      // Check if session is too old (more than 24 hours)
      const age = Date.now() - session.lastUpdatedAt;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age > maxAge) {
        console.log('⏰ StudySessionSync: Active session is too old, clearing');
        await this.clearActiveSession();
        return;
      }

      this.activeSession = session;

      // Resume progress tracking if session is in progress
      if (session.status === 'in_progress') {
        this.startProgressTracking();
      }

      console.log('📚 StudySessionSync: Active session loaded', {
        sessionId: session.sessionId,
        status: session.status,
        timeSpent: Math.floor(session.timeSpentSeconds / 60),
      });
    } catch (error) {
      console.error(
        '❌ StudySessionSync: Failed to load active session:',
        error,
      );
      this.activeSession = null;
    }
  }

  /**
   * Clear active session
   */
  async clearActiveSession(): Promise<void> {
    try {
      this.activeSession = null;

      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }

      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      await AsyncStorage.removeItem(SESSION_PROGRESS_KEY);

      console.log('🗑️ StudySessionSync: Active session cleared');
      this.notifyListeners(null);
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to clear session:', error);
    }
  }

  /**
   * Start progress tracking interval
   */
  private startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(async () => {
      if (!this.activeSession || this.activeSession.status !== 'in_progress') {
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
        return;
      }

      // Update time spent
      const now = Date.now();
      const elapsed = Math.floor(
        (now - this.activeSession.lastUpdatedAt) / 1000,
      );

      await this.updateSessionProgress(this.activeSession.sessionId, {
        timeSpentSeconds: this.activeSession.timeSpentSeconds + elapsed,
      });
    }, 10000); // Update every 10 seconds
  }

  /**
   * Save progress snapshot for resume capability
   */
  private async saveProgressSnapshot(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    try {
      if (!this.activeSession) return;

      const progress: SessionProgress = {
        sessionId,
        userId,
        timeSpentMinutes: Math.floor(this.activeSession.timeSpentSeconds / 60),
        notes: this.activeSession.notes,
        difficultyRating: this.activeSession.difficultyRating,
        confidenceLevel: this.activeSession.confidenceLevel,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem(
        SESSION_PROGRESS_KEY,
        JSON.stringify(progress),
      );
    } catch (error) {
      console.error(
        '❌ StudySessionSync: Failed to save progress snapshot:',
        error,
      );
    }
  }

  /**
   * Get progress snapshot for a session
   */
  async getProgressSnapshot(
    sessionId: string,
  ): Promise<SessionProgress | null> {
    try {
      const stored = await AsyncStorage.getItem(SESSION_PROGRESS_KEY);
      if (!stored) return null;

      const progress: SessionProgress = JSON.parse(stored);

      // Only return if it matches the requested session
      if (progress.sessionId !== sessionId) {
        return null;
      }

      return progress;
    } catch (error) {
      console.error(
        '❌ StudySessionSync: Failed to get progress snapshot:',
        error,
      );
      return null;
    }
  }

  /**
   * Record SRS performance (queue for sync if offline)
   */
  async recordSRSPerformance(
    sessionId: string,
    userId: string,
    performance: {
      reminderId?: string;
      qualityRating: number;
      responseTimeSeconds?: number;
      scheduleNext?: boolean;
    },
  ): Promise<void> {
    try {
      const pendingRecord: PendingSRSPerformance = {
        id: `srs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        userId,
        reminderId: performance.reminderId,
        qualityRating: performance.qualityRating,
        responseTimeSeconds: performance.responseTimeSeconds,
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Try to sync immediately
      try {
        const { error } = await supabase.functions.invoke(
          'record-srs-performance',
          {
            body: {
              session_id: sessionId,
              reminder_id: performance.reminderId,
              quality_rating: performance.qualityRating,
              response_time_seconds: performance.responseTimeSeconds,
              schedule_next: performance.scheduleNext ?? true,
            },
          },
        );

        if (error) throw error;

        console.log('✅ StudySessionSync: SRS performance synced', {
          sessionId,
        });
        return;
      } catch (error) {
        console.log(
          '📴 StudySessionSync: Offline or sync failed, queueing SRS performance',
          { sessionId },
        );
      }

      // Queue for later sync
      await this.queueSRSPerformance(pendingRecord);
    } catch (error) {
      console.error(
        '❌ StudySessionSync: Failed to record SRS performance:',
        error,
      );
    }
  }

  /**
   * Queue SRS performance for later sync
   */
  private async queueSRSPerformance(
    record: PendingSRSPerformance,
  ): Promise<void> {
    try {
      const queue = await this.getSRSQueue();
      queue.push(record);
      await AsyncStorage.setItem(SRS_QUEUE_KEY, JSON.stringify(queue));
      console.log('📝 StudySessionSync: SRS performance queued', {
        queueLength: queue.length,
      });
    } catch (error) {
      console.error(
        '❌ StudySessionSync: Failed to queue SRS performance:',
        error,
      );
    }
  }

  /**
   * Get SRS performance queue
   */
  private async getSRSQueue(): Promise<PendingSRSPerformance[]> {
    try {
      const stored = await AsyncStorage.getItem(SRS_QUEUE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to get SRS queue:', error);
      return [];
    }
  }

  /**
   * Sync queued SRS performance records
   */
  async syncSRSQueue(): Promise<{ synced: number; failed: number }> {
    try {
      const queue = await this.getSRSQueue();
      if (queue.length === 0) {
        return { synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;
      const remaining: PendingSRSPerformance[] = [];

      for (const record of queue) {
        try {
          const { error } = await supabase.functions.invoke(
            'record-srs-performance',
            {
              body: {
                session_id: record.sessionId,
                reminder_id: record.reminderId,
                quality_rating: record.qualityRating,
                response_time_seconds: record.responseTimeSeconds,
                schedule_next: true,
              },
            },
          );

          if (error) throw error;

          synced++;
          console.log('✅ StudySessionSync: Queued SRS performance synced', {
            id: record.id,
          });
        } catch (error) {
          record.retryCount++;

          if (record.retryCount >= record.maxRetries) {
            failed++;
            console.error(
              '❌ StudySessionSync: SRS performance failed after max retries',
              { id: record.id },
            );
          } else {
            remaining.push(record);
            console.log(
              `⏳ StudySessionSync: SRS performance will retry (${record.retryCount}/${record.maxRetries})`,
              { id: record.id },
            );
          }
        }
      }

      // Save remaining queue
      await AsyncStorage.setItem(SRS_QUEUE_KEY, JSON.stringify(remaining));

      console.log('🔄 StudySessionSync: SRS queue sync complete', {
        synced,
        failed,
        remaining: remaining.length,
      });
      return { synced, failed };
    } catch (error) {
      console.error('❌ StudySessionSync: Failed to sync SRS queue:', error);
      return { synced: 0, failed: 0 };
    }
  }

  /**
   * Subscribe to active session changes
   */
  onSessionChange(
    callback: (session: ActiveSession | null) => void,
  ): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(session: ActiveSession | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(session);
      } catch (error) {
        console.error('❌ StudySessionSync: Listener error:', error);
      }
    });
  }
}

export const studySessionSyncService = new StudySessionSyncService();
