import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createResponse } from '../_shared/response.ts'
import { withMonitoring } from '../_shared/monitoring.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'
import { isAdmin } from '../_shared/permissions.ts'

// Consolidated Admin System - Handles all admin operations
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify admin access
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return createResponse({ error: 'Unauthorized' }, 401)
    }

    // Check if user is admin
    const { data: userData } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_status')
      .eq('id', user.id)
      .single()

    if (!userData || !isAdmin(userData.subscription_tier)) {
      return createResponse({ error: 'Admin access required' }, 403)
    }

    // Route to appropriate handler
    switch (action) {
      case 'export':
        return await handleExportData(req, supabaseClient)
      case 'cleanup':
        return await handleCleanupData(req, supabaseClient)
      case 'health':
        return await handleHealthCheck(req, supabaseClient)
      case 'suspend':
        return await handleSuspendUser(req, supabaseClient)
      case 'unsuspend':
        return await handleUnsuspendUser(req, supabaseClient)
      case 'delete':
        return await handleDeleteUser(req, supabaseClient)
      case 'restore':
        return await handleRestoreUser(req, supabaseClient)
      case 'grant-premium':
        return await handleGrantPremium(req, supabaseClient)
      case 'start-trial':
        return await handleStartTrial(req, supabaseClient)
      case 'metrics':
        return await handleGetMetrics(req, supabaseClient)
      case 'auto-unsuspend':
        return await handleAutoUnsuspend(req, supabaseClient)
      default:
        return createResponse({ error: 'Invalid admin action' }, 404)
    }

  } catch (error) {
    console.error('Admin system error:', error)
    return createResponse({ error: 'Internal server error' }, 500)
  }
})

async function handleExportData(req: Request, supabase: any) {
  const { user_id, format } = await req.json()
  
  if (user_id) {
    // Export specific user's data
    const [courses, assignments, lectures, studySessions, reminders] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', user_id),
      supabase.from('assignments').select('*').eq('user_id', user_id),
      supabase.from('lectures').select('*').eq('user_id', user_id),
      supabase.from('study_sessions').select('*').eq('user_id', user_id),
      supabase.from('reminders').select('*').eq('user_id', user_id)
    ])

    return createResponse({
      data: {
        user_id,
        courses: courses.data,
        assignments: assignments.data,
        lectures: lectures.data,
        studySessions: studySessions.data,
        reminders: reminders.data
      }
    })
  } else {
    // Export all data (admin only)
    const [users, courses, assignments, lectures, studySessions] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('courses').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('lectures').select('*'),
      supabase.from('study_sessions').select('*')
    ])

    return createResponse({
      data: {
        users: users.data,
        courses: courses.data,
        assignments: assignments.data,
        lectures: lectures.data,
        studySessions: studySessions.data
      }
    })
  }
}

async function handleCleanupData(req: Request, supabase: any) {
  const { type, older_than_days = 30 } = await req.json()
  
  const cutoffDate = new Date(Date.now() - older_than_days * 24 * 60 * 60 * 1000).toISOString()
  
  let results = {}
  
  switch (type) {
    case 'rate_limits':
      const { data: rateLimits } = await supabase
        .from('rate_limits')
        .delete()
        .lt('created_at', cutoffDate)
      results.rateLimits = rateLimits
      break
      
    case 'idempotency_keys':
      const { data: idempotencyKeys } = await supabase
        .from('idempotency_keys')
        .delete()
        .lt('created_at', cutoffDate)
      results.idempotencyKeys = idempotencyKeys
      break
      
    case 'old_reminders':
      const { data: oldReminders } = await supabase
        .from('reminders')
        .delete()
        .eq('completed', true)
        .lt('processed_at', cutoffDate)
      results.oldReminders = oldReminders
      break
      
    case 'deleted_items':
      // Permanently delete items that have been soft-deleted for more than 30 days
      const tables = ['courses', 'assignments', 'lectures', 'study_sessions']
      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .delete()
          .not('deleted_at', 'is', null)
          .lt('deleted_at', cutoffDate)
        results[table] = data
      }
      break
      
    default:
      return createResponse({ error: 'Invalid cleanup type' }, 400)
  }
  
  return createResponse({ data: results })
}

async function handleHealthCheck(req: Request, supabase: any) {
  // Check database connectivity
  const { data, error } = await supabase.from('users').select('count').limit(1)
  
  if (error) {
    return createResponse({ 
      data: { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      } 
    }, 500)
  }
  
  return createResponse({ 
    data: { 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    } 
  })
}

async function handleSuspendUser(req: Request, supabase: any) {
  const { user_id, reason } = await req.json()
  
  const { data, error } = await supabase
    .from('users')
    .update({ 
      account_status: 'suspended',
      suspension_reason: reason,
      suspended_at: new Date().toISOString()
    })
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
    .update({ 
      account_status: 'active',
      suspension_reason: null,
      suspended_at: null
    })
    .eq('id', user_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleDeleteUser(req: Request, supabase: any) {
  const { user_id, permanent = false } = await req.json()
  
  if (permanent) {
    // Permanently delete user and all associated data
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', user_id)

    if (error) throw error
    return createResponse({ data: { deleted: true } })
  } else {
    // Soft delete user
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
}

async function handleRestoreUser(req: Request, supabase: any) {
  const { user_id } = await req.json()
  
  const { data, error } = await supabase
    .from('users')
    .update({ 
      account_status: 'active',
      deleted_at: null
    })
    .eq('id', user_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleGrantPremium(req: Request, supabase: any) {
  const { user_id, subscription_tier = 'oddity' } = await req.json()
  
  const { data, error } = await supabase
    .from('users')
    .update({ subscription_tier })
    .eq('id', user_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleStartTrial(req: Request, supabase: any) {
  const { user_id, trial_days = 7 } = await req.json()
  
  const trialEndDate = new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('users')
    .update({ 
      subscription_tier: 'trial',
      trial_ends_at: trialEndDate
    })
    .eq('id', user_id)
    .select()
    .single()

  if (error) throw error
  return createResponse({ data })
}

async function handleGetMetrics(req: Request, supabase: any) {
  const { period = '30d' } = await req.json()
  
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  
  const [users, courses, assignments, lectures, studySessions] = await Promise.all([
    supabase.from('users').select('count').gte('created_at', startDate),
    supabase.from('courses').select('count').gte('created_at', startDate),
    supabase.from('assignments').select('count').gte('created_at', startDate),
    supabase.from('lectures').select('count').gte('created_at', startDate),
    supabase.from('study_sessions').select('count').gte('created_at', startDate)
  ])

  return createResponse({
    data: {
      period,
      users: users.count,
      courses: courses.count,
      assignments: assignments.count,
      lectures: lectures.count,
      studySessions: studySessions.count
    }
  })
}

async function handleAutoUnsuspend(req: Request, supabase: any) {
  // Find users who should be auto-unsuspended
  const { data: suspendedUsers } = await supabase
    .from('users')
    .select('*')
    .eq('account_status', 'suspended')
    .not('suspended_at', 'is', null)
    .lt('suspended_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const results = []
  for (const user of suspendedUsers || []) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          account_status: 'active',
          suspension_reason: null,
          suspended_at: null
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      results.push({ success: true, user_id: user.id })
    } catch (error) {
      results.push({ success: false, user_id: user.id, error: error.message })
    }
  }

  return createResponse({ data: results })
}
