import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createResponse } from '../_shared/response.ts'
import { withMonitoring } from '../_shared/monitoring.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'
import { withIdempotency } from '../_shared/idempotency.ts'
import { validateApiVersion } from '../_shared/versioning.ts'

// Consolidated API v2 - Handles multiple operations through routing
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract API version and route
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const version = pathParts[1] // api-v2
    const resource = pathParts[2] // courses, assignments, etc.
    const action = pathParts[3] // create, update, delete, etc.

    // Validate API version
    const versionValidation = validateApiVersion(req)
    if (!versionValidation.valid) {
      return createResponse({ error: versionValidation.error }, 400)
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Route to appropriate handler
    const handler = getHandler(resource, action)
    if (!handler) {
      return createResponse({ error: 'Invalid API endpoint' }, 404)
    }

    // Apply middleware
    const wrappedHandler = withMonitoring(
      withRateLimit(
        withIdempotency(handler)
      )
    )

    return await wrappedHandler(req, supabaseClient)

  } catch (error) {
    console.error('API v2 error:', error)
    return createResponse({ error: 'Internal server error' }, 500)
  }
})

// Route handlers
function getHandler(resource: string, action: string) {
  const handlers: Record<string, Record<string, Function>> = {
    'courses': {
      'create': handleCreateCourse,
      'update': handleUpdateCourse,
      'delete': handleDeleteCourse,
      'restore': handleRestoreCourse,
      'list': handleListCourses,
      'get': handleGetCourse
    },
    'assignments': {
      'create': handleCreateAssignment,
      'update': handleUpdateAssignment,
      'delete': handleDeleteAssignment,
      'restore': handleRestoreAssignment,
      'list': handleListAssignments,
      'get': handleGetAssignment
    },
    'lectures': {
      'create': handleCreateLecture,
      'update': handleUpdateLecture,
      'delete': handleDeleteLecture,
      'restore': handleRestoreLecture,
      'list': handleListLectures,
      'get': handleGetLecture
    },
    'study-sessions': {
      'create': handleCreateStudySession,
      'update': handleUpdateStudySession,
      'delete': handleDeleteStudySession,
      'restore': handleRestoreStudySession,
      'list': handleListStudySessions,
      'get': handleGetStudySession
    },
    'users': {
      'profile': handleUserProfile,
      'update': handleUpdateUserProfile,
      'suspend': handleSuspendUser,
      'unsuspend': handleUnsuspendUser,
      'delete': handleDeleteUser
    },
    'notifications': {
      'send': handleSendNotification,
      'schedule': handleScheduleNotification,
      'cancel': handleCancelNotification,
      'process': handleProcessNotifications
    },
    'analytics': {
      'home': handleGetHomeData,
      'calendar': handleGetCalendarData,
      'streak': handleGetStreakInfo,
      'export': handleExportData
    },
    'admin': {
      'export': handleAdminExport,
      'cleanup': handleAdminCleanup,
      'health': handleHealthCheck
    }
  }

  return handlers[resource]?.[action]
}

// Course handlers
async function handleCreateCourse(req: Request, supabase: any) {
  const { course_name, course_code, about_course } = await req.json()
  
  const { data, error } = await supabase
    .from('courses')
    .insert({
      course_name,
      course_code,
      about_course
    })
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleUpdateCourse(req: Request, supabase: any) {
  const url = new URL(req.url)
  const courseId = url.pathname.split('/').pop()
  const updates = await req.json()
  
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleDeleteCourse(req: Request, supabase: any) {
  const url = new URL(req.url)
  const courseId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', courseId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleRestoreCourse(req: Request, supabase: any) {
  const url = new URL(req.url)
  const courseId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('courses')
    .update({ deleted_at: null })
    .eq('id', courseId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleListCourses(req: Request, supabase: any) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return createResponse({ data })
}

async function handleGetCourse(req: Request, supabase: any) {
  const url = new URL(req.url)
  const courseId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return createResponse({ data })
}

// Assignment handlers
async function handleCreateAssignment(req: Request, supabase: any) {
  const assignmentData = await req.json()
  
  const { data, error } = await supabase
    .from('assignments')
    .insert(assignmentData)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleUpdateAssignment(req: Request, supabase: any) {
  const url = new URL(req.url)
  const assignmentId = url.pathname.split('/').pop()
  const updates = await req.json()
  
  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleDeleteAssignment(req: Request, supabase: any) {
  const url = new URL(req.url)
  const assignmentId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleRestoreAssignment(req: Request, supabase: any) {
  const url = new URL(req.url)
  const assignmentId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('assignments')
    .update({ deleted_at: null })
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleListAssignments(req: Request, supabase: any) {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  if (error) throw error
  return createResponse({ data })
}

async function handleGetAssignment(req: Request, supabase: any) {
  const url = new URL(req.url)
  const assignmentId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return createResponse({ data })
}

// Lecture handlers (similar pattern)
async function handleCreateLecture(req: Request, supabase: any) {
  const lectureData = await req.json()
  
  const { data, error } = await supabase
    .from('lectures')
    .insert(lectureData)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleUpdateLecture(req: Request, supabase: any) {
  const url = new URL(req.url)
  const lectureId = url.pathname.split('/').pop()
  const updates = await req.json()
  
  const { data, error } = await supabase
    .from('lectures')
    .update(updates)
    .eq('id', lectureId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleDeleteLecture(req: Request, supabase: any) {
  const url = new URL(req.url)
  const lectureId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('lectures')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lectureId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleRestoreLecture(req: Request, supabase: any) {
  const url = new URL(req.url)
  const lectureId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('lectures')
    .update({ deleted_at: null })
    .eq('id', lectureId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleListLectures(req: Request, supabase: any) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .is('deleted_at', null)
    .order('start_time', { ascending: true })

  if (error) throw error
  return createResponse({ data })
}

async function handleGetLecture(req: Request, supabase: any) {
  const url = new URL(req.url)
  const lectureId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .eq('id', lectureId)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return createResponse({ data })
}

// Study session handlers (similar pattern)
async function handleCreateStudySession(req: Request, supabase: any) {
  const sessionData = await req.json()
  
  const { data, error } = await supabase
    .from('study_sessions')
    .insert(sessionData)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleUpdateStudySession(req: Request, supabase: any) {
  const url = new URL(req.url)
  const sessionId = url.pathname.split('/').pop()
  const updates = await req.json()
  
  const { data, error } = await supabase
    .from('study_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleDeleteStudySession(req: Request, supabase: any) {
  const url = new URL(req.url)
  const sessionId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('study_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleRestoreStudySession(req: Request, supabase: any) {
  const url = new URL(req.url)
  const sessionId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('study_sessions')
    .update({ deleted_at: null })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleListStudySessions(req: Request, supabase: any) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .is('deleted_at', null)
    .order('session_date', { ascending: false })

  if (error) throw error
  return createResponse({ data })
}

async function handleGetStudySession(req: Request, supabase: any) {
  const url = new URL(req.url)
  const sessionId = url.pathname.split('/').pop()
  
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('id', sessionId)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return createResponse({ data })
}

// User handlers
async function handleUserProfile(req: Request, supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleUpdateUserProfile(req: Request, supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  const updates = await req.json()
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleSuspendUser(req: Request, supabase: any) {
  const { user_id } = await req.json()
  
  const { data, error } = await supabase
    .from('users')
    .update({ account_status: 'suspended' })
    .eq('id', user_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleUnsuspendUser(req: Request, supabase: any) {
  const { user_id } = await req.json()
  
  const { data, error } = await supabase
    .from('users')
    .update({ account_status: 'active' })
    .eq('id', user_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleDeleteUser(req: Request, supabase: any) {
  const { user_id } = await req.json()
  
  const { data, error } = await supabase
    .from('users')
    .update({ 
      account_status: 'deleted',
      deleted_at: new Date().toISOString()
    })
    .eq('id', user_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

// Notification handlers
async function handleSendNotification(req: Request, supabase: any) {
  const notificationData = await req.json()
  
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleScheduleNotification(req: Request, supabase: any) {
  const reminderData = await req.json()
  
  const { data, error } = await supabase
    .from('reminders')
    .insert(reminderData)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleCancelNotification(req: Request, supabase: any) {
  const { reminder_id } = await req.json()
  
  const { data, error } = await supabase
    .from('reminders')
    .update({ completed: true })
    .eq('id', reminder_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleProcessNotifications(req: Request, supabase: any) {
  // Process pending notifications
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('completed', false)
    .lte('reminder_time', new Date().toISOString())

  if (error) throw error
  return createResponse({ data })
}

// Analytics handlers
async function handleGetHomeData(req: Request, supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get recent assignments, lectures, and study sessions
  const [assignments, lectures, studySessions] = await Promise.all([
    supabase.from('assignments').select('*').eq('user_id', user.id).is('deleted_at', null).order('due_date', { ascending: true }).limit(5),
    supabase.from('lectures').select('*').eq('user_id', user.id).is('deleted_at', null).order('start_time', { ascending: true }).limit(5),
    supabase.from('study_sessions').select('*').eq('user_id', user.id).is('deleted_at', null).order('session_date', { ascending: false }).limit(5)
  ])

  return createResponse({ 
    data: {
      assignments: assignments.data,
      lectures: lectures.data,
      studySessions: studySessions.data
    }
  })
}

async function handleGetCalendarData(req: Request, supabase: any) {
  const url = new URL(req.url)
  const weekStart = url.searchParams.get('week_start')
  
  const { data, error } = await supabase
    .from('lectures')
    .select('*')
    .gte('start_time', weekStart)
    .lt('start_time', new Date(new Date(weekStart!).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
    .is('deleted_at', null)

  if (error) throw error
  return createResponse({ data })
}

async function handleGetStreakInfo(req: Request, supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('study_sessions')
    .select('session_date')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('session_date', { ascending: false })

  if (error) throw error
  return createResponse({ data })
}

async function handleExportData(req: Request, supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  
  // Export all user data
  const [courses, assignments, lectures, studySessions] = await Promise.all([
    supabase.from('courses').select('*').eq('user_id', user.id),
    supabase.from('assignments').select('*').eq('user_id', user.id),
    supabase.from('lectures').select('*').eq('user_id', user.id),
    supabase.from('study_sessions').select('*').eq('user_id', user.id)
  ])

  return createResponse({ 
    data: {
      courses: courses.data,
      assignments: assignments.data,
      lectures: lectures.data,
      studySessions: studySessions.data
    }
  })
}

// Admin handlers
async function handleAdminExport(req: Request, supabase: any) {
  // Admin-only data export
  const { data, error } = await supabase
    .from('users')
    .select('*')

  if (error) throw error
  return createResponse({ data })
}

async function handleAdminCleanup(req: Request, supabase: any) {
  // Cleanup old data
  const { data, error } = await supabase
    .from('rate_limits')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (error) throw error
  return createResponse({ data })
}

async function handleHealthCheck(req: Request, supabase: any) {
  return createResponse({ 
    data: { 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    } 
  })
}
