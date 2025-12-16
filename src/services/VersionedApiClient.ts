/**
 * Versioned API Client
 *
 * Provides a versioned interface to the ELARO API with automatic
 * version management and compatibility checking.
 */

import { apiVersioningService, ApiResponse } from './ApiVersioningService';

export interface Course {
  id: string;
  course_name: string;
  course_code?: string;
  about_course?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description?: string;
  due_date: string;
  submission_method?: string;
  submission_link?: string;
  created_at: string;
  deleted_at?: string;
}

export interface Lecture {
  id: string;
  user_id: string;
  course_id: string;
  lecture_name: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  is_recurring: boolean;
  recurring_pattern?: string;
  created_at: string;
  deleted_at?: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  course_id: string;
  topic: string;
  description?: string;
  session_date: string;
  duration_minutes?: number;
  has_spaced_repetition: boolean;
  created_at: string;
  deleted_at?: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription_tier: string;
  account_status: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export class VersionedApiClient {
  private static instance: VersionedApiClient;

  private constructor() {}

  static getInstance(): VersionedApiClient {
    if (!VersionedApiClient.instance) {
      VersionedApiClient.instance = new VersionedApiClient();
    }
    return VersionedApiClient.instance;
  }

  /**
   * Initialize the API client and check compatibility
   */
  async initialize(): Promise<void> {
    await apiVersioningService.checkCompatibility();
  }

  // ============================================================================
  // COURSE OPERATIONS
  // ============================================================================

  async getCourses(): Promise<ApiResponse<Course[]>> {
    return apiVersioningService.get<Course[]>('api-v2/courses/list');
  }

  async getCourse(courseId: string): Promise<ApiResponse<Course>> {
    return apiVersioningService.get<Course>(`api-v2/courses/get/${courseId}`);
  }

  async createCourse(
    courseData: Omit<Course, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<ApiResponse<Course>> {
    return apiVersioningService.post<Course>(
      'api-v2/courses/create',
      courseData,
    );
  }

  async updateCourse(
    courseId: string,
    updates: Partial<Course>,
  ): Promise<ApiResponse<Course>> {
    return apiVersioningService.put<Course>(
      `api-v2/courses/update/${courseId}`,
      updates,
    );
  }

  async deleteCourse(courseId: string): Promise<ApiResponse<Course>> {
    return apiVersioningService.delete<Course>(
      `api-v2/courses/delete/${courseId}`,
    );
  }

  async restoreCourse(courseId: string): Promise<ApiResponse<Course>> {
    return apiVersioningService.post<Course>(
      `api-v2/courses/restore/${courseId}`,
    );
  }

  // ============================================================================
  // ASSIGNMENT OPERATIONS
  // ============================================================================

  async getAssignments(): Promise<ApiResponse<Assignment[]>> {
    return apiVersioningService.get<Assignment[]>('api-v2/assignments/list');
  }

  async getAssignment(assignmentId: string): Promise<ApiResponse<Assignment>> {
    return apiVersioningService.get<Assignment>(
      `api-v2/assignments/get/${assignmentId}`,
    );
  }

  async createAssignment(
    assignmentData: Omit<Assignment, 'id' | 'created_at'>,
  ): Promise<ApiResponse<Assignment>> {
    return apiVersioningService.post<Assignment>(
      'api-v2/assignments/create',
      assignmentData,
    );
  }

  async updateAssignment(
    assignmentId: string,
    updates: Partial<Assignment>,
  ): Promise<ApiResponse<Assignment>> {
    return apiVersioningService.put<Assignment>(
      `api-v2/assignments/update/${assignmentId}`,
      updates,
    );
  }

  async deleteAssignment(
    assignmentId: string,
  ): Promise<ApiResponse<Assignment>> {
    return apiVersioningService.delete<Assignment>(
      `api-v2/assignments/delete/${assignmentId}`,
    );
  }

  async restoreAssignment(
    assignmentId: string,
  ): Promise<ApiResponse<Assignment>> {
    return apiVersioningService.post<Assignment>(
      `api-v2/assignments/restore/${assignmentId}`,
    );
  }

  // ============================================================================
  // LECTURE OPERATIONS
  // ============================================================================

  async getLectures(): Promise<ApiResponse<Lecture[]>> {
    return apiVersioningService.get<Lecture[]>('api-v2/lectures/list');
  }

  async getLecture(lectureId: string): Promise<ApiResponse<Lecture>> {
    return apiVersioningService.get<Lecture>(
      `api-v2/lectures/get/${lectureId}`,
    );
  }

  async createLecture(
    lectureData: Omit<Lecture, 'id' | 'created_at'>,
  ): Promise<ApiResponse<Lecture>> {
    return apiVersioningService.post<Lecture>(
      'api-v2/lectures/create',
      lectureData,
    );
  }

  async updateLecture(
    lectureId: string,
    updates: Partial<Lecture>,
  ): Promise<ApiResponse<Lecture>> {
    return apiVersioningService.put<Lecture>(
      `api-v2/lectures/update/${lectureId}`,
      updates,
    );
  }

  async deleteLecture(lectureId: string): Promise<ApiResponse<Lecture>> {
    return apiVersioningService.delete<Lecture>(
      `api-v2/lectures/delete/${lectureId}`,
    );
  }

  async restoreLecture(lectureId: string): Promise<ApiResponse<Lecture>> {
    return apiVersioningService.post<Lecture>(
      `api-v2/lectures/restore/${lectureId}`,
    );
  }

  // ============================================================================
  // STUDY SESSION OPERATIONS
  // ============================================================================

  async getStudySessions(): Promise<ApiResponse<StudySession[]>> {
    return apiVersioningService.get<StudySession[]>(
      'api-v2/study-sessions/list',
    );
  }

  async getStudySession(sessionId: string): Promise<ApiResponse<StudySession>> {
    return apiVersioningService.get<StudySession>(
      `api-v2/study-sessions/get/${sessionId}`,
    );
  }

  async createStudySession(
    sessionData: Omit<StudySession, 'id' | 'created_at'>,
  ): Promise<ApiResponse<StudySession>> {
    return apiVersioningService.post<StudySession>(
      'api-v2/study-sessions/create',
      sessionData,
    );
  }

  async updateStudySession(
    sessionId: string,
    updates: Partial<StudySession>,
  ): Promise<ApiResponse<StudySession>> {
    return apiVersioningService.put<StudySession>(
      `api-v2/study-sessions/update/${sessionId}`,
      updates,
    );
  }

  async deleteStudySession(
    sessionId: string,
  ): Promise<ApiResponse<StudySession>> {
    return apiVersioningService.delete<StudySession>(
      `api-v2/study-sessions/delete/${sessionId}`,
    );
  }

  async restoreStudySession(
    sessionId: string,
  ): Promise<ApiResponse<StudySession>> {
    return apiVersioningService.post<StudySession>(
      `api-v2/study-sessions/restore/${sessionId}`,
    );
  }

  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async getUserProfile(): Promise<ApiResponse<User>> {
    return apiVersioningService.get<User>('api-v2/users/profile');
  }

  async updateUserProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    return apiVersioningService.put<User>('api-v2/users/update', updates);
  }

  // New user endpoints for Phase 4 migration

  async getUserDevices(): Promise<ApiResponse<any[]>> {
    return apiVersioningService.get<any[]>('users/devices');
  }

  async registerDevice(deviceData: {
    push_token: string;
    platform: string;
    updated_at?: string;
  }): Promise<ApiResponse<any>> {
    return apiVersioningService.post<any>('users/devices', deviceData);
  }

  async deleteDevice(
    deviceId: string,
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiVersioningService.delete<{ success: boolean; message: string }>(
      `users/devices/${deviceId}`,
    );
  }

  async getLoginHistory(limit?: number): Promise<ApiResponse<any[]>> {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    return apiVersioningService.get<any[]>(
      `users/login-history${Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''}`,
    );
  }

  async getSubscription(): Promise<
    ApiResponse<{
      tier: string;
      status: string;
      expiresAt: string | null;
      accountStatus: string;
      hasActiveSubscription: boolean;
    }>
  > {
    return apiVersioningService.get('users/subscription');
  }

  // ============================================================================
  // NOTIFICATION OPERATIONS
  // ============================================================================

  async sendNotification(notificationData: {
    user_id: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, unknown>;
  }): Promise<ApiResponse<{ success: boolean; notification_id?: string }>> {
    return apiVersioningService.post(
      'notification-system/send',
      notificationData,
    );
  }

  async scheduleNotification(reminderData: {
    user_id: string;
    title: string;
    body: string;
    reminder_time: string;
    type: string;
    data?: Record<string, unknown>;
  }): Promise<ApiResponse<{ success: boolean; reminder_id?: string }>> {
    return apiVersioningService.post(
      'notification-system/schedule',
      reminderData,
    );
  }

  async cancelNotification(
    reminderId: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiVersioningService.post('notification-system/cancel', {
      reminder_id: reminderId,
    });
  }

  // New notification endpoints for Phase 2 migration

  async getNotificationPreferences(): Promise<
    ApiResponse<Record<string, any>>
  > {
    return apiVersioningService.get('notification-system/preferences');
  }

  async updateNotificationPreferences(
    preferences: Record<string, any>,
  ): Promise<ApiResponse<Record<string, any>>> {
    return apiVersioningService.put(
      'notification-system/preferences',
      preferences,
    );
  }

  async getNotificationHistory(options?: {
    limit?: number;
    offset?: number;
    filter?: string;
    includeRead?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.filter) params.filter = options.filter;
    if (options?.includeRead !== undefined)
      params.includeRead = String(options.includeRead);

    return apiVersioningService.get(
      `notification-system/history${Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''}`,
    );
  }

  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
    return apiVersioningService.get('notification-system/unread-count');
  }

  async markNotificationAsRead(
    notificationId: string,
  ): Promise<ApiResponse<any>> {
    return apiVersioningService.post('notification-system/mark-read', {
      notification_id: notificationId,
    });
  }

  async getNotificationQueue(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<ApiResponse<any[]>> {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.status) params.status = options.status;

    return apiVersioningService.get(
      `notification-system/queue${Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''}`,
    );
  }

  async addToNotificationQueue(queueData: {
    notification_type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    scheduled_for: string;
    priority?: number;
  }): Promise<ApiResponse<any>> {
    return apiVersioningService.post('notification-system/queue', queueData);
  }

  async removeFromNotificationQueue(
    queueId: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiVersioningService.delete(`notification-system/queue/${queueId}`);
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  async getHomeData(): Promise<ApiResponse<Record<string, unknown>>> {
    return apiVersioningService.get('api-v2/analytics/home');
  }

  async getCalendarData(
    weekStart: string,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return apiVersioningService.get(
      `api-v2/analytics/calendar?week_start=${weekStart}`,
    );
  }

  async getStreakInfo(): Promise<
    ApiResponse<{ streak: number; lastActivity?: string }>
  > {
    return apiVersioningService.get('api-v2/analytics/streak');
  }

  async exportData(): Promise<ApiResponse<Record<string, unknown>>> {
    return apiVersioningService.get('api-v2/analytics/export');
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  async getDeletedItems(): Promise<
    ApiResponse<
      Array<
        (Course | Assignment | Lecture | StudySession) & {
          type: 'course' | 'assignment' | 'lecture' | 'study_session';
        }
      >
    >
  > {
    return apiVersioningService.get<
      Array<
        (Course | Assignment | Lecture | StudySession) & {
          type: 'course' | 'assignment' | 'lecture' | 'study_session';
        }
      >
    >('api-v2/queries/deleted-items');
  }

  async getCount(
    table: string,
    filters?: Record<string, unknown>,
  ): Promise<ApiResponse<{ count: number }>> {
    const queryParams = new URLSearchParams({ table });
    if (filters) {
      queryParams.append('filters', JSON.stringify(filters));
    }
    return apiVersioningService.get<{ count: number }>(
      `api-v2/queries/count?${queryParams.toString()}`,
    );
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async batchOperations(
    operations: Array<{
      type: string;
      table: string;
      action: string;
      data?: Record<string, unknown>;
      filters?: Record<string, unknown>;
    }>,
  ): Promise<
    ApiResponse<{ processed: number; successful: number; failed: number }>
  > {
    return apiVersioningService.post('batch-operations', { operations });
  }

  // ============================================================================
  // AUTHENTICATION OPERATIONS
  // ============================================================================

  async signUp(credentials: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    name?: string;
  }): Promise<ApiResponse<{ user: any; session: any }>> {
    return apiVersioningService.post<{ user: any; session: any }>(
      'auth/signup',
      {
        email: credentials.email,
        password: credentials.password,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        name: credentials.name,
      },
      false, // Auth endpoints don't require authentication
    );
  }

  async signIn(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: any; session: any }>> {
    return apiVersioningService.post<{ user: any; session: any }>(
      'auth/signin',
      {
        email: credentials.email,
        password: credentials.password,
      },
      false, // Auth endpoints don't require authentication
    );
  }

  async signOut(): Promise<ApiResponse<{ success: boolean }>> {
    return apiVersioningService.post<{ success: boolean }>(
      'auth/signout',
      {},
      true, // Signout requires authentication
    );
  }

  async getSession(): Promise<ApiResponse<{ session: any; user: any | null }>> {
    return apiVersioningService.get<{ session: any; user: any | null }>(
      'auth/session',
      undefined,
      true, // Get session requires authentication (but returns null if invalid)
    );
  }

  async getUser(): Promise<ApiResponse<{ user: any }>> {
    // Use session endpoint to get user
    const sessionResponse = await this.getSession();
    if (sessionResponse.data?.user) {
      return {
        ...sessionResponse,
        data: { user: sessionResponse.data.user },
      };
    }
    return {
      ...sessionResponse,
      data: { user: null },
      error: 'User not authenticated',
    };
  }

  async resetPassword(data: {
    email: string;
    redirectTo?: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiVersioningService.post<{ message: string }>(
      'auth/reset-password',
      {
        email: data.email,
        redirectTo: data.redirectTo,
      },
      false, // Password reset doesn't require authentication
    );
  }

  async verifyEmail(data: {
    token: string;
    type?: 'signup' | 'email_change';
  }): Promise<ApiResponse<{ user: any; session: any }>> {
    return apiVersioningService.post<{ user: any; session: any }>(
      'auth/verify-email',
      {
        token: data.token,
        type: data.type,
      },
      false, // Email verification doesn't require authentication
    );
  }

  async updateProfile(updates: {
    first_name?: string;
    last_name?: string;
    name?: string;
    password?: string;
  }): Promise<ApiResponse<{ user: any }>> {
    return apiVersioningService.post<{ user: any }>(
      'auth/update-profile',
      updates,
      true, // Update profile requires authentication
    );
  }

  // ============================================================================
  // VERSION MANAGEMENT
  // ============================================================================

  async checkCompatibility(): Promise<void> {
    await apiVersioningService.checkCompatibility();
  }

  async getMigrationRecommendations(): Promise<string[]> {
    return apiVersioningService.getMigrationRecommendations();
  }

  async upgradeToLatest(): Promise<boolean> {
    return apiVersioningService.upgradeToLatest();
  }

  getCurrentVersion(): string {
    return apiVersioningService.getCurrentVersion();
  }

  setVersion(version: string): void {
    apiVersioningService.setVersion(version);
  }
}

// Export singleton instance
export const versionedApiClient = VersionedApiClient.getInstance();
