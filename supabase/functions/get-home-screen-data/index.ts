// FILE: supabase/functions/get-home-screen-data/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { decrypt } from '../_shared/encryption.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

const getSupabaseClient = (req: Request): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! }
      }
    }
  );
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Function started');
    const supabase = getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    console.log('User authenticated:', user?.id);
    if (!user) throw new Error('Unauthorized');

    // Apply rate limiting check
    try {
      await checkRateLimit(supabase, user.id, 'get-home-screen-data');
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 429,
          headers: corsHeaders,
        });
      }
      console.error('An unexpected error occurred during rate limit check:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const now = new Date().toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // --- Run all queries in parallel ---
    console.log('Starting database queries');
    const [
      { data: lectures, error: lecturesError },
      { data: studySessions, error: studySessionsError },
      { data: assignments, error: assignmentsError },
    ] = await Promise.all([
      // Fetch all upcoming lectures
      supabase
        .from('lectures')
        .select('*, courses(course_name)')
        .gt('lecture_date', now),
      // Fetch all upcoming study sessions
      supabase
        .from('study_sessions')
        .select('*, courses(course_name)')
        .gt('session_date', now),
      // Fetch all upcoming assignments
      supabase
        .from('assignments')
        .select('*, courses(course_name)')
        .gt('due_date', now),
    ]);

    console.log('Queries completed');
    console.log('Lectures:', lectures?.length || 0, 'Study Sessions:', studySessions?.length || 0, 'Assignments:', assignments?.length || 0);
    
    if (lecturesError) {
      console.error('Lectures error:', lecturesError);
      throw lecturesError;
    }
    if (studySessionsError) {
      console.error('Study sessions error:', studySessionsError);
      throw studySessionsError;
    }
    if (assignmentsError) {
      console.error('Assignments error:', assignmentsError);
      throw assignmentsError;
    }

    // Calculate weekly task count using rolling 7-day window
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString();

    const weeklyTaskCount = (lectures || []).filter(l => l.created_at >= oneWeekAgoISO).length +
                           (studySessions || []).filter(s => s.created_at >= oneWeekAgoISO).length +
                           (assignments || []).filter(a => a.created_at >= oneWeekAgoISO).length;

    // --- Process the results ---
    // 1. Find the single next upcoming task
    const allTasks = [
      ...(lectures || []).map(t => ({
        ...t,
        type: 'lecture',
        date: t.lecture_date,
        name: t.courses.course_name
      })),
      ...(studySessions || []).map(t => ({
        ...t,
        type: 'study_session',
        date: t.session_date,
        name: t.topic
      })),
      ...(assignments || []).map(t => ({
        ...t,
        type: 'assignment',
        date: t.due_date,
        name: t.title
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nextUpcomingTask = allTasks[0] || null;

    // 2. Get today's overview counts
    const todayOverview = {
      lectures: (lectures || []).filter(t => 
        new Date(t.lecture_date) >= todayStart && 
        new Date(t.lecture_date) <= todayEnd
      ).length,
      study_sessions: (studySessions || []).filter(t => 
        new Date(t.session_date) >= todayStart && 
        new Date(t.session_date) <= todayEnd
      ).length,
      assignments: (assignments || []).filter(t => 
        new Date(t.due_date) >= todayStart && 
        new Date(t.due_date) <= todayEnd
      ).length,
      // You can add reminders/reviews here later
      reviews: 0,
    };

    // Decrypt the upcoming task if present
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
    if (!ENCRYPTION_KEY) {
      return new Response('Encryption key not configured.', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let decryptedTask = null as any;
    if (nextUpcomingTask) {
      const nameField = nextUpcomingTask.lecture_name || nextUpcomingTask.title || nextUpcomingTask.topic || '';
      const descField = nextUpcomingTask.description ?? nextUpcomingTask.notes ?? null;

      const decryptedName = nameField ? await decrypt(nameField, ENCRYPTION_KEY) : nameField;
      const decryptedDescription = descField ? await decrypt(descField, ENCRYPTION_KEY) : null;

      decryptedTask = {
        ...nextUpcomingTask,
        name: decryptedName,
        description: decryptedDescription,
        lecture_name: undefined,
        title: undefined,
        topic: undefined,
        notes: undefined,
      };
    }

    // --- Combine into a single response object ---
    const responseData = {
      nextUpcomingTask: decryptedTask,
      todayOverview,
      weeklyTaskCount,
    };

    console.log('Response data:', JSON.stringify(responseData, null, 2));

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.toString() : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
