import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createResponse } from '../_shared/response.ts'
import { withMonitoring } from '../_shared/monitoring.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'

// Consolidated Notification System - Handles all notification operations
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

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
    switch (action) {
      case 'send':
        return await handleSendNotification(req, supabaseClient)
      case 'schedule':
        return await handleScheduleNotification(req, supabaseClient)
      case 'cancel':
        return await handleCancelNotification(req, supabaseClient)
      case 'process':
        return await handleProcessNotifications(req, supabaseClient)
      case 'daily-summary':
        return await handleDailySummary(req, supabaseClient)
      case 'evening-capture':
        return await handleEveningCapture(req, supabaseClient)
      case 'welcome':
        return await handleWelcomeNotification(req, supabaseClient)
      case 'reminder':
        return await handleReminderNotification(req, supabaseClient)
      default:
        return createResponse({ error: 'Invalid notification action' }, 404)
    }

  } catch (error) {
    console.error('Notification system error:', error)
    return createResponse({ error: 'Internal server error' }, 500)
  }
})

async function handleSendNotification(req: Request, supabase: any) {
  const { user_id, title, body, type, data } = await req.json()
  
  // Create notification record
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id,
      title,
      body,
      type,
      data,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error

  // Send push notification
  await sendPushNotification(user_id, title, body, data)

  return createResponse({ data: notification })
}

async function handleScheduleNotification(req: Request, supabase: any) {
  const { user_id, title, body, reminder_time, type, data } = await req.json()
  
  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      user_id,
      title,
      body,
      reminder_time,
      type,
      data,
      completed: false
    })
    .select()
    .single()

  if (error) throw error
  return createResponse({ data: reminder })
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
  // Get pending reminders
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('completed', false)
    .lte('reminder_time', new Date().toISOString())

  if (error) throw error

  // Process each reminder
  const results = []
  for (const reminder of reminders) {
    try {
      await sendPushNotification(reminder.user_id, reminder.title, reminder.body, reminder.data)
      
      // Mark as completed
      await supabase
        .from('reminders')
        .update({ completed: true, processed_at: new Date().toISOString() })
        .eq('id', reminder.id)

      results.push({ success: true, reminder_id: reminder.id })
    } catch (error) {
      results.push({ success: false, reminder_id: reminder.id, error: error.message })
    }
  }

  return createResponse({ data: results })
}

async function handleDailySummary(req: Request, supabase: any) {
  const { user_id } = await req.json()
  
  // Get user's data for the day
  const today = new Date().toISOString().split('T')[0]
  
  const [assignments, lectures, studySessions] = await Promise.all([
    supabase.from('assignments').select('*').eq('user_id', user_id).gte('due_date', today).lt('due_date', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('lectures').select('*').eq('user_id', user_id).gte('start_time', today).lt('start_time', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('study_sessions').select('*').eq('user_id', user_id).gte('session_date', today).lt('session_date', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString())
  ])

  const summary = {
    assignments: assignments.data?.length || 0,
    lectures: lectures.data?.length || 0,
    studySessions: studySessions.data?.length || 0
  }

  const title = "Daily Summary"
  const body = `You have ${summary.assignments} assignments, ${summary.lectures} lectures, and completed ${summary.studySessions} study sessions today.`

  await sendPushNotification(user_id, title, body, summary)
  
  return createResponse({ data: summary })
}

async function handleEveningCapture(req: Request, supabase: any) {
  const { user_id } = await req.json()
  
  const title = "Evening Reflection"
  const body = "How did your study session go today? Take a moment to reflect on your progress."

  await sendPushNotification(user_id, title, body, { type: 'evening_capture' })
  
  return createResponse({ data: { sent: true } })
}

async function handleWelcomeNotification(req: Request, supabase: any) {
  const { user_id, user_name } = await req.json()
  
  const title = `Welcome to ELARO, ${user_name}!`
  const body = "Get started by creating your first course and assignment. We're here to help you succeed!"

  await sendPushNotification(user_id, title, body, { type: 'welcome' })
  
  return createResponse({ data: { sent: true } })
}

async function handleReminderNotification(req: Request, supabase: any) {
  const { user_id, assignment_id, lecture_id } = await req.json()
  
  let title = "Reminder"
  let body = "You have an upcoming task"
  
  if (assignment_id) {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('title, due_date')
      .eq('id', assignment_id)
      .single()
    
    if (assignment) {
      title = "Assignment Reminder"
      body = `Don't forget: ${assignment.title} is due soon!`
    }
  }
  
  if (lecture_id) {
    const { data: lecture } = await supabase
      .from('lectures')
      .select('lecture_name, start_time')
      .eq('id', lecture_id)
      .single()
    
    if (lecture) {
      title = "Lecture Reminder"
      body = `Upcoming: ${lecture.lecture_name} starts soon!`
    }
  }

  await sendPushNotification(user_id, title, body, { assignment_id, lecture_id })
  
  return createResponse({ data: { sent: true } })
}

async function sendPushNotification(userId: string, title: string, body: string, data: any) {
  // Implementation for sending push notifications
  // This would integrate with your push notification service
  console.log(`Sending notification to ${userId}: ${title} - ${body}`)
  
  // Here you would implement the actual push notification logic
  // using services like Expo Push Notifications, Firebase, etc.
}
