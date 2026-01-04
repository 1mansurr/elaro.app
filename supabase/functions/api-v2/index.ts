import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createResponse, errorResponse } from '../_shared/response.ts';
import { validateApiVersion } from '../_shared/versioning.ts';
import {
  AuthenticatedRequest,
  AppError,
  ERROR_CODES,
} from '../_shared/function-handler.ts';
import {
  wrapOldHandler,
  handleDbError,
  extractIdFromUrl,
} from './_handler-utils.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  DeleteCourseSchema,
  RestoreCourseSchema,
} from '../_shared/schemas/course.ts';
import {
  CreateAssignmentSchema,
  UpdateAssignmentSchema,
  DeleteAssignmentSchema,
  RestoreAssignmentSchema,
} from '../_shared/schemas/assignment.ts';
import {
  CreateLectureSchema,
  UpdateLectureSchema,
  DeleteLectureSchema,
  RestoreLectureSchema,
} from '../_shared/schemas/lecture.ts';
import {
  CreateStudySessionSchema,
  UpdateStudySessionSchema,
  DeleteStudySessionSchema,
  RestoreStudySessionSchema,
} from '../_shared/schemas/studySession.ts';
import {
  UpdateUserProfileSchema,
  RegisterDeviceSchema,
} from '../_shared/schemas/user.ts';
import {
  SendNotificationSchema,
  ScheduleNotificationSchema,
  CancelNotificationSchema,
} from '../_shared/schemas/notification.ts';
import {
  generateDeduplicationKey,
  getUserNotificationPreferences,
  canSendNotification,
} from '../_shared/notification-helpers.ts';
import { decrypt } from '../_shared/encryption.ts';
import { sendUnifiedNotification } from '../_shared/unified-notification-sender.ts';
import { logger } from '../_shared/logging.ts';

// Consolidated API v2 - Handles multiple operations through routing
serve(async req => {
  const origin = req.headers.get('Origin');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    // Extract API version and route
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const _version = pathParts[1]; // api-v2
    const resource = pathParts[2]; // courses, assignments, queries, etc.
    const action = pathParts[3]; // create, update, delete, deleted-items, count, etc.

    // Validate API version
    const versionValidation = validateApiVersion(req);
    if (!versionValidation.valid) {
      return createResponse({ error: versionValidation.error }, 400);
    }

    // Route to appropriate handler
    const handler = getHandler(resource, action);
    if (!handler) {
      return errorResponse(
        new AppError('Invalid API endpoint', 404, ERROR_CODES.DB_NOT_FOUND),
      );
    }

    // Handler is already wrapped with createAuthenticatedHandler, just call it
    return await handler(req);
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'API v2 error',
      {
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
      },
      traceContext,
    );
    return errorResponse(
      error instanceof AppError
        ? error
        : new AppError(
            'Internal server error',
            500,
            ERROR_CODES.INTERNAL_ERROR,
          ),
      500,
    );
  }
});

// Route handlers - Course handlers are wrapped with createAuthenticatedHandler
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(resource: string, action: string) {
  const handlers: Record<string, Record<string, HandlerFunction>> = {
    courses: {
      create: wrapOldHandler(
        handleCreateCourse,
        'api-v2-courses-create',
        CreateCourseSchema,
        true,
      ),
      update: wrapOldHandler(
        handleUpdateCourse,
        'api-v2-courses-update',
        UpdateCourseSchema,
        true,
      ),
      delete: wrapOldHandler(
        handleDeleteCourse,
        'api-v2-courses-delete',
        DeleteCourseSchema,
        true,
      ),
      restore: wrapOldHandler(
        handleRestoreCourse,
        'api-v2-courses-restore',
        RestoreCourseSchema,
        true,
      ),
      list: wrapOldHandler(
        handleListCourses,
        'api-v2-courses-list',
        undefined,
        false,
      ),
      get: wrapOldHandler(
        handleGetCourse,
        'api-v2-courses-get',
        undefined,
        false,
      ),
    },
    assignments: {
      create: wrapOldHandler(
        handleCreateAssignment,
        'api-v2-assignments-create',
        CreateAssignmentSchema,
        true,
      ),
      update: wrapOldHandler(
        handleUpdateAssignment,
        'api-v2-assignments-update',
        UpdateAssignmentSchema,
        true,
      ),
      delete: wrapOldHandler(
        handleDeleteAssignment,
        'api-v2-assignments-delete',
        DeleteAssignmentSchema,
        true,
      ),
      restore: wrapOldHandler(
        handleRestoreAssignment,
        'api-v2-assignments-restore',
        RestoreAssignmentSchema,
        true,
      ),
      list: wrapOldHandler(
        handleListAssignments,
        'api-v2-assignments-list',
        undefined,
        false,
      ),
      get: wrapOldHandler(
        handleGetAssignment,
        'api-v2-assignments-get',
        undefined,
        false,
      ),
    },
    lectures: {
      create: wrapOldHandler(
        handleCreateLecture,
        'api-v2-lectures-create',
        CreateLectureSchema,
        true,
      ),
      update: wrapOldHandler(
        handleUpdateLecture,
        'api-v2-lectures-update',
        UpdateLectureSchema,
        true,
      ),
      delete: wrapOldHandler(
        handleDeleteLecture,
        'api-v2-lectures-delete',
        DeleteLectureSchema,
        true,
      ),
      restore: wrapOldHandler(
        handleRestoreLecture,
        'api-v2-lectures-restore',
        RestoreLectureSchema,
        true,
      ),
      list: wrapOldHandler(
        handleListLectures,
        'api-v2-lectures-list',
        undefined,
        false,
      ),
      get: wrapOldHandler(
        handleGetLecture,
        'api-v2-lectures-get',
        undefined,
        false,
      ),
    },
    'study-sessions': {
      create: wrapOldHandler(
        handleCreateStudySession,
        'api-v2-study-sessions-create',
        CreateStudySessionSchema,
        true,
      ),
      update: wrapOldHandler(
        handleUpdateStudySession,
        'api-v2-study-sessions-update',
        UpdateStudySessionSchema,
        true,
      ),
      delete: wrapOldHandler(
        handleDeleteStudySession,
        'api-v2-study-sessions-delete',
        DeleteStudySessionSchema,
        true,
      ),
      restore: wrapOldHandler(
        handleRestoreStudySession,
        'api-v2-study-sessions-restore',
        RestoreStudySessionSchema,
        true,
      ),
      list: wrapOldHandler(
        handleListStudySessions,
        'api-v2-study-sessions-list',
        undefined,
        false,
      ),
      get: wrapOldHandler(
        handleGetStudySession,
        'api-v2-study-sessions-get',
        undefined,
        false,
      ),
    },
    users: {
      profile: wrapOldHandler(
        handleUserProfile,
        'api-v2-users-profile',
        undefined,
        false,
      ),
      update: wrapOldHandler(
        handleUpdateUserProfile,
        'api-v2-users-update',
        UpdateUserProfileSchema,
        true,
      ),
      devices: wrapOldHandler(
        handleUserDevices,
        'api-v2-users-devices',
        RegisterDeviceSchema, // Schema for POST requests (GET has no body so won't validate)
        true, // Require idempotency for POST
      ),
      // Note: suspend, unsuspend, delete are admin operations - removed from api-v2
      // They are available in admin-system only
    },
    notifications: {
      send: wrapOldHandler(
        handleSendNotification,
        'api-v2-notifications-send',
        SendNotificationSchema,
        true,
      ),
      schedule: wrapOldHandler(
        handleScheduleNotification,
        'api-v2-notifications-schedule',
        ScheduleNotificationSchema,
        true,
      ),
      cancel: wrapOldHandler(
        handleCancelNotification,
        'api-v2-notifications-cancel',
        CancelNotificationSchema,
        true,
      ),
      process: wrapOldHandler(
        handleProcessNotifications,
        'api-v2-notifications-process',
        undefined,
        false,
      ),
    },
    analytics: {
      home: wrapOldHandler(
        handleGetHomeData,
        'api-v2-analytics-home',
        undefined,
        false,
      ),
      calendar: wrapOldHandler(
        handleGetCalendarData,
        'api-v2-analytics-calendar',
        undefined,
        false,
      ),
      streak: wrapOldHandler(
        handleGetStreakInfo,
        'api-v2-analytics-streak',
        undefined,
        false,
      ),
      export: wrapOldHandler(
        handleExportData,
        'api-v2-analytics-export',
        undefined,
        false,
      ),
    },
    queries: {
      'deleted-items': wrapOldHandler(
        handleGetDeletedItems,
        'api-v2-queries-deleted-items',
        undefined,
        false,
      ),
      count: wrapOldHandler(
        handleGetCount,
        'api-v2-queries-count',
        undefined,
        false,
      ),
    },
    // Admin routes removed from api-v2 - use admin-system instead
    // 'admin': { ... }
  };

  return handlers[resource]?.[action];
}

// Course handlers - Migrated to use AuthenticatedRequest
async function handleCreateCourse({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { course_name, course_code, about_course } = body;

  const { data, error } = await supabaseClient
    .from('courses')
    .insert({
      user_id: user.id, // Add user_id for ownership
      course_name,
      course_code,
      about_course,
    })
    .select()
    .single();

  if (error) handleDbError(error);
  return data; // Handler will wrap in successResponse
}

async function handleUpdateCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  // Extract course_id from body (preferred) or URL
  const courseId = body.course_id || extractIdFromUrl(req.url);
  if (!courseId) {
    throw new AppError(
      'Course ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { course_name, course_code, about_course } = body;
  const updates: Record<string, unknown> = {};
  if (course_name !== undefined) updates.course_name = course_name;
  if (course_code !== undefined) updates.course_code = course_code;
  if (about_course !== undefined) updates.about_course = about_course;

  const { data, error } = await supabaseClient
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleDeleteCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  // Extract course_id from body or URL
  const courseId = body.course_id || extractIdFromUrl(req.url);
  if (!courseId) {
    throw new AppError(
      'Course ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', courseId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleRestoreCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  // Extract course_id from body or URL
  const courseId = body.course_id || extractIdFromUrl(req.url);
  if (!courseId) {
    throw new AppError(
      'Course ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('courses')
    .update({ deleted_at: null })
    .eq('id', courseId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleListCourses({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('courses')
    .select('*')
    .eq('user_id', user.id) // Filter by user
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) handleDbError(error);
  return data;
}

async function handleGetCourse(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const courseId = extractIdFromUrl(req.url);
  if (!courseId) {
    throw new AppError(
      'Course ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('user_id', user.id) // Ensure ownership
    .is('deleted_at', null)
    .single();

  if (error) handleDbError(error);
  return data;
}

// Assignment handlers - Migrated
async function handleCreateAssignment({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('assignments')
    .insert({
      ...body,
      user_id: user.id, // Add user_id for ownership
    })
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleUpdateAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const assignmentId = body.assignment_id || extractIdFromUrl(req.url);
  if (!assignmentId) {
    throw new AppError(
      'Assignment ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { assignment_id: _assignment_id, ...updates } = body;
  const { data, error } = await supabaseClient
    .from('assignments')
    .update(updates)
    .eq('id', assignmentId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleDeleteAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const assignmentId = body.assignment_id || extractIdFromUrl(req.url);
  if (!assignmentId) {
    throw new AppError(
      'Assignment ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleRestoreAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const assignmentId = body.assignment_id || extractIdFromUrl(req.url);
  if (!assignmentId) {
    throw new AppError(
      'Assignment ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('assignments')
    .update({ deleted_at: null })
    .eq('id', assignmentId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleListAssignments({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('assignments')
    .select('*')
    .eq('user_id', user.id) // Filter by user
    .is('deleted_at', null)
    .order('due_date', { ascending: true });

  if (error) handleDbError(error);
  return data;
}

async function handleGetAssignment(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const assignmentId = extractIdFromUrl(req.url);
  if (!assignmentId) {
    throw new AppError(
      'Assignment ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('assignments')
    .select(
      `
      *,
      courses (
        id,
        course_name,
        course_code
      )
    `,
    )
    .eq('id', assignmentId)
    .eq('user_id', user.id) // Ensure ownership
    .is('deleted_at', null)
    .single();

  if (error) handleDbError(error);
  return data;
}

// Lecture handlers - Migrated
async function handleCreateLecture({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('lectures')
    .insert({
      ...body,
      user_id: user.id, // Add user_id for ownership
    })
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleUpdateLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const lectureId = body.lecture_id || extractIdFromUrl(req.url);
  if (!lectureId) {
    throw new AppError(
      'Lecture ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { lecture_id: _lecture_id, ...updates } = body;
  const { data, error } = await supabaseClient
    .from('lectures')
    .update(updates)
    .eq('id', lectureId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleDeleteLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const lectureId = body.lecture_id || extractIdFromUrl(req.url);
  if (!lectureId) {
    throw new AppError(
      'Lecture ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('lectures')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lectureId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleRestoreLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const lectureId = body.lecture_id || extractIdFromUrl(req.url);
  if (!lectureId) {
    throw new AppError(
      'Lecture ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('lectures')
    .update({ deleted_at: null })
    .eq('id', lectureId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleListLectures({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('lectures')
    .select('*')
    .eq('user_id', user.id) // Filter by user
    .is('deleted_at', null)
    .order('start_time', { ascending: true });

  if (error) handleDbError(error);
  return data;
}

async function handleGetLecture(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const lectureId = extractIdFromUrl(req.url);
  if (!lectureId) {
    throw new AppError(
      'Lecture ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('lectures')
    .select(
      `
      *,
      courses (
        id,
        course_name,
        course_code
      )
    `,
    )
    .eq('id', lectureId)
    .eq('user_id', user.id) // Ensure ownership
    .is('deleted_at', null)
    .single();

  if (error) handleDbError(error);
  return data;
}

// Study session handlers - Migrated
async function handleCreateStudySession({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('study_sessions')
    .insert({
      ...body,
      user_id: user.id, // Add user_id for ownership
    })
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleUpdateStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const sessionId = body.study_session_id || extractIdFromUrl(req.url);
  if (!sessionId) {
    throw new AppError(
      'Study session ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { study_session_id: _study_session_id, ...updates } = body;
  const { data, error } = await supabaseClient
    .from('study_sessions')
    .update(updates)
    .eq('id', sessionId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleDeleteStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const sessionId = body.study_session_id || extractIdFromUrl(req.url);
  if (!sessionId) {
    throw new AppError(
      'Study session ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('study_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleRestoreStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const sessionId = body.study_session_id || extractIdFromUrl(req.url);
  if (!sessionId) {
    throw new AppError(
      'Study session ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('study_sessions')
    .update({ deleted_at: null })
    .eq('id', sessionId)
    .eq('user_id', user.id) // Ensure ownership
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleListStudySessions({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('study_sessions')
    .select('*')
    .eq('user_id', user.id) // Filter by user
    .is('deleted_at', null)
    .order('session_date', { ascending: false });

  if (error) handleDbError(error);
  return data;
}

async function handleGetStudySession(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const sessionId = extractIdFromUrl(req.url);
  if (!sessionId) {
    throw new AppError(
      'Study session ID is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('study_sessions')
    .select(
      `
      *,
      courses (
        id,
        course_name,
        course_code
      )
    `,
    )
    .eq('id', sessionId)
    .eq('user_id', user.id) // Ensure ownership
    .is('deleted_at', null)
    .single();

  if (error) handleDbError(error);
  return data;
}

// User handlers - Migrated
async function handleUserProfile({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) handleDbError(error);

  // Decrypt sensitive fields (first_name, last_name, university, and program) before returning
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (encryptionKey && data) {
    const decryptedData = { ...data };

    // Decrypt first_name if it exists and appears to be encrypted
    if (
      decryptedData.first_name &&
      typeof decryptedData.first_name === 'string'
    ) {
      try {
        // Only attempt decryption if the string looks like base64-encoded encrypted data
        if (decryptedData.first_name.length > 20) {
          decryptedData.first_name = await decrypt(
            decryptedData.first_name,
            encryptionKey,
          );
        }
      } catch (decryptError) {
        // If decryption fails, the data might not be encrypted (legacy data)
        // or might be corrupted - log warning but don't fail the request
        console.warn(
          `Failed to decrypt first_name for user ${user.id}:`,
          decryptError,
        );
        // Keep the original value if decryption fails
      }
    }

    // Decrypt last_name if it exists and appears to be encrypted
    if (
      decryptedData.last_name &&
      typeof decryptedData.last_name === 'string'
    ) {
      try {
        // Only attempt decryption if the string looks like base64-encoded encrypted data
        if (decryptedData.last_name.length > 20) {
          decryptedData.last_name = await decrypt(
            decryptedData.last_name,
            encryptionKey,
          );
        }
      } catch (decryptError) {
        // If decryption fails, the data might not be encrypted (legacy data)
        // or might be corrupted - log warning but don't fail the request
        console.warn(
          `Failed to decrypt last_name for user ${user.id}:`,
          decryptError,
        );
        // Keep the original value if decryption fails
      }
    }

    // Decrypt university if it exists and appears to be encrypted
    if (
      decryptedData.university &&
      typeof decryptedData.university === 'string'
    ) {
      try {
        // Only attempt decryption if the string looks like base64-encoded encrypted data
        if (decryptedData.university.length > 20) {
          decryptedData.university = await decrypt(
            decryptedData.university,
            encryptionKey,
          );
        }
      } catch (decryptError) {
        // If decryption fails, the data might not be encrypted (legacy data)
        // or might be corrupted - log warning but don't fail the request
        console.warn(
          `Failed to decrypt university for user ${user.id}:`,
          decryptError,
        );
        // Keep the original value if decryption fails
      }
    }

    // Decrypt program if it exists and appears to be encrypted
    if (decryptedData.program && typeof decryptedData.program === 'string') {
      try {
        // Only attempt decryption if the string looks like base64-encoded encrypted data
        if (decryptedData.program.length > 20) {
          decryptedData.program = await decrypt(
            decryptedData.program,
            encryptionKey,
          );
        }
      } catch (decryptError) {
        // If decryption fails, the data might not be encrypted (legacy data)
        // or might be corrupted - log warning but don't fail the request
        console.warn(
          `Failed to decrypt program for user ${user.id}:`,
          decryptError,
        );
        // Keep the original value if decryption fails
      }
    }

    return decryptedData;
  }

  return data;
}

async function handleUpdateUserProfile({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  // Users can only update their own profile
  const { data, error } = await supabaseClient
    .from('users')
    .update(body)
    .eq('id', user.id)
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

// Device handlers - handles both GET and POST based on request method
async function handleUserDevices(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const method = req.method;

  if (method === 'GET') {
    const { data, error } = await supabaseClient
      .from('user_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) handleDbError(error);
    return data || [];
  }

  if (method === 'POST') {
    // PASS 1: Use safeParse to prevent ZodError from crashing worker
    const validationResult = RegisterDeviceSchema.safeParse(body);
    if (!validationResult.success) {
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      throw new AppError(
        'Validation failed',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        {
          message: 'Request body validation failed',
          errors: flattened.fieldErrors,
          formErrors: flattened.formErrors,
        },
      );
    }
    const validatedData = validationResult.data;
    const { push_token, platform, updated_at } = validatedData;

    const { data, error } = await supabaseClient
      .from('user_devices')
      .upsert(
        {
          user_id: user.id,
          push_token,
          platform,
          updated_at: updated_at || new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' },
      )
      .select()
      .single();

    if (error) handleDbError(error);
    return data;
  }

  throw new AppError('Method not allowed', 405, ERROR_CODES.VALIDATION_ERROR);
}

// Note: suspend, unsuspend, delete user handlers removed from api-v2
// These are admin operations and should only be accessed through admin-system

// Notification handlers - Migrated to match notification-system behavior
async function handleSendNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  // PASS 2: Validate body is object before destructuring
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // PASS 2: Extract and validate user_id (never trust client-provided IDs)
  const bodyUser_id = body.user_id;
  if (bodyUser_id !== undefined && bodyUser_id !== null) {
    // Validate format if provided
    if (typeof bodyUser_id !== 'string') {
      throw new AppError(
        'user_id must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a string type' },
      );
    }
    // Validate UUID format if provided
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyUser_id,
      )
    ) {
      throw new AppError(
        'Invalid user_id format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a valid UUID' },
      );
    }
    // CRITICAL: Never trust client-provided user_id - must match authenticated user
    if (bodyUser_id !== user.id) {
      throw new AppError(
        'You can only send notifications to yourself',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
  // Use authenticated user.id (never use client-provided user_id)
  const user_id = user.id;

  const { title, body: notificationBody, type, data, ...otherData } = body;

  // Generate deduplication key and check for duplicates
  const itemId = data?.itemId || data?.assignment_id || data?.lecture_id;
  const _dedupKey = generateDeduplicationKey(user_id, type || 'custom', itemId);

  // Check if notification was recently sent (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentDelivery } = await supabaseClient
    .from('notification_deliveries')
    .select('id')
    .eq('user_id', user_id)
    .eq('notification_type', type || 'custom')
    .gte('sent_at', oneHourAgo)
    .limit(1)
    .single();

  if (recentDelivery) {
    // Check if metadata matches (same itemId if present)
    const { data: deliveryDetails } = await supabaseClient
      .from('notification_deliveries')
      .select('metadata, title, body')
      .eq('id', recentDelivery.id)
      .single();

    // If same itemId and same type, likely a duplicate
    if (
      deliveryDetails?.metadata?.itemId === itemId ||
      (deliveryDetails?.title === title &&
        deliveryDetails?.body === notificationBody)
    ) {
      return {
        id: recentDelivery.id,
        message: 'Notification already sent recently',
        duplicate: true,
      };
    }
  }

  // Create notification record
  const { data: notification, error } = await supabaseClient
    .from('notifications')
    .insert({
      user_id,
      title,
      body: notificationBody,
      type,
      data,
      sent_at: new Date().toISOString(),
      ...otherData,
    })
    .select()
    .single();

  if (error) handleDbError(error);

  // Check preferences before sending
  const prefs = await getUserNotificationPreferences(supabaseClient, user_id);
  if (!prefs || !canSendNotification(prefs, type || 'custom')) {
    return {
      id: notification.id,
      message: 'Notification blocked by user preferences or quiet hours',
      blocked: true,
    };
  }

  // Send via unified sender (respects preferences and supports email)
  // Pass preferences to avoid refetch in unified sender
  const result = await sendUnifiedNotification(supabaseClient, {
    userId: user_id,
    notificationType: type || 'custom',
    title,
    body: notificationBody,
    emailSubject: title,
    emailContent: `<h2>${title}</h2><p>${notificationBody}</p>`,
    data,
    options: {
      priority: 'high',
    },
    preferences: prefs, // Pass to avoid refetch
  });

  if (!result.pushSent && !result.emailSent) {
    return {
      id: notification.id,
      message: 'Notification blocked by preferences',
      blocked: true,
    };
  }

  return notification;
}

async function handleScheduleNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  // PASS 2: Validate body is object before destructuring
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'Request body must be an object',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // PASS 2: Extract and validate user_id (never trust client-provided IDs)
  const bodyUser_id = body.user_id;
  if (bodyUser_id !== undefined && bodyUser_id !== null) {
    // Validate format if provided
    if (typeof bodyUser_id !== 'string') {
      throw new AppError(
        'user_id must be a string',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a string type' },
      );
    }
    // Validate UUID format if provided
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bodyUser_id,
      )
    ) {
      throw new AppError(
        'Invalid user_id format',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { field: 'user_id', message: 'user_id must be a valid UUID' },
      );
    }
    // CRITICAL: Never trust client-provided user_id - must match authenticated user
    if (bodyUser_id !== user.id) {
      throw new AppError(
        'You can only schedule notifications for yourself',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }
  }
  // Use authenticated user.id (never use client-provided user_id)
  const user_id = user.id;
  const { ...reminderData } = body;

  const { data, error } = await supabaseClient
    .from('reminders')
    .insert({
      ...reminderData,
      user_id: user_id || user.id,
    })
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleCancelNotification({
  user,
  supabaseClient,
  body,
}: AuthenticatedRequest) {
  const { reminder_id } = body;

  // Verify user owns this reminder
  const { data: existingReminder, error: checkError } = await supabaseClient
    .from('reminders')
    .select('user_id')
    .eq('id', reminder_id)
    .single();

  if (checkError) handleDbError(checkError);
  if (existingReminder.user_id !== user.id) {
    throw new AppError(
      'You can only cancel your own reminders',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const { data, error } = await supabaseClient
    .from('reminders')
    .update({ completed: true })
    .eq('id', reminder_id)
    .select()
    .single();

  if (error) handleDbError(error);
  return data;
}

async function handleProcessNotifications({
  supabaseClient,
}: AuthenticatedRequest) {
  // Process pending notifications - typically a scheduled job
  const { data, error } = await supabaseClient
    .from('reminders')
    .select('*')
    .eq('completed', false)
    .lte('reminder_time', new Date().toISOString());

  if (error) handleDbError(error);
  return data;
}

// Analytics handlers - Migrated
async function handleGetHomeData({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  // Get recent assignments, lectures, and study sessions
  const [assignmentsRes, lecturesRes, studySessionsRes] = await Promise.all([
    supabaseClient
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(5),
    supabaseClient
      .from('lectures')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('start_time', { ascending: true })
      .limit(5),
    supabaseClient
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('session_date', { ascending: false })
      .limit(5),
  ]);

  // Check for errors
  if (assignmentsRes.error) handleDbError(assignmentsRes.error);
  if (lecturesRes.error) handleDbError(lecturesRes.error);
  if (studySessionsRes.error) handleDbError(studySessionsRes.error);

  return {
    assignments: assignmentsRes.data,
    lectures: lecturesRes.data,
    studySessions: studySessionsRes.data,
  };
}

async function handleGetCalendarData(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const url = new URL(req.url);
  const weekStart = url.searchParams.get('week_start');

  if (!weekStart) {
    throw new AppError(
      'week_start query parameter is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  const { data, error } = await supabaseClient
    .from('lectures')
    .select('*')
    .eq('user_id', user.id) // Ensure ownership
    .gte('start_time', weekStart)
    .lt(
      'start_time',
      new Date(
        new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    )
    .is('deleted_at', null);

  if (error) handleDbError(error);
  return data;
}

async function handleGetStreakInfo({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  const { data, error } = await supabaseClient
    .from('study_sessions')
    .select('session_date')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('session_date', { ascending: false });

  if (error) handleDbError(error);
  return data;
}

async function handleExportData({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  // Export all user data
  const [coursesRes, assignmentsRes, lecturesRes, studySessionsRes] =
    await Promise.all([
      supabaseClient.from('courses').select('*').eq('user_id', user.id),
      supabaseClient.from('assignments').select('*').eq('user_id', user.id),
      supabaseClient.from('lectures').select('*').eq('user_id', user.id),
      supabaseClient.from('study_sessions').select('*').eq('user_id', user.id),
    ]);

  // Check for errors
  if (coursesRes.error) handleDbError(coursesRes.error);
  if (assignmentsRes.error) handleDbError(assignmentsRes.error);
  if (lecturesRes.error) handleDbError(lecturesRes.error);
  if (studySessionsRes.error) handleDbError(studySessionsRes.error);

  return {
    courses: coursesRes.data,
    assignments: assignmentsRes.data,
    lectures: lecturesRes.data,
    studySessions: studySessionsRes.data,
  };
}

// Query handlers
async function handleGetDeletedItems({
  user,
  supabaseClient,
}: AuthenticatedRequest) {
  const [courses, assignments, lectures, studySessions] = await Promise.all([
    supabaseClient
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null),
    supabaseClient
      .from('assignments')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null),
    supabaseClient
      .from('lectures')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null),
    supabaseClient
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null),
  ]);

  if (courses.error) handleDbError(courses.error);
  if (assignments.error) handleDbError(assignments.error);
  if (lectures.error) handleDbError(lectures.error);
  if (studySessions.error) handleDbError(studySessions.error);

  const allItems = [
    ...(courses.data || []).map(item => ({ ...item, type: 'course' })),
    ...(assignments.data || []).map(item => ({ ...item, type: 'assignment' })),
    ...(lectures.data || []).map(item => ({ ...item, type: 'lecture' })),
    ...(studySessions.data || []).map(item => ({
      ...item,
      type: 'study_session',
    })),
  ].sort(
    (a, b) =>
      new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime(),
  );

  return allItems;
}

async function handleGetCount({
  user,
  supabaseClient,
  url,
}: AuthenticatedRequest) {
  const urlObj = new URL(url);
  const table = urlObj.searchParams.get('table');
  const filters = urlObj.searchParams.get('filters'); // JSON string of filters

  if (!table) {
    throw new AppError(
      'Table parameter is required',
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD,
    );
  }

  let query = supabaseClient
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Apply filters if provided
  if (filters) {
    // PASS 1: Crash safety - JSON.parse already in try/catch, but ensure it returns Response on error
    try {
      const filterObj = JSON.parse(filters);
      if (
        !filterObj ||
        typeof filterObj !== 'object' ||
        Array.isArray(filterObj)
      ) {
        throw new AppError(
          'Invalid filters format: must be an object',
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      }
      Object.entries(filterObj).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'object' && 'operator' in value) {
            // Support operators like { operator: 'gte', value: '2024-01-01' }
            const { operator, value: filterValue } = value as {
              operator: string;
              value: unknown;
            };
            if (operator === 'gte') {
              query = query.gte(key, filterValue);
            } else if (operator === 'lte') {
              query = query.lte(key, filterValue);
            } else if (operator === 'eq') {
              query = query.eq(key, filterValue);
            }
          } else {
            query = query.eq(key, value);
          }
        }
      });
    } catch (_e) {
      throw new AppError(
        'Invalid filters parameter',
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }
  }

  const { count, error } = await query;

  if (error) handleDbError(error);
  return { count: count || 0 };
}

// Admin handlers removed from api-v2 - use admin-system instead
