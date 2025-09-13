// FILE: supabase/functions/get-calendar-data-for-week/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const getSupabaseClient = (req: Request ): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!
        }
      }
    }
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { date } = await req.json();
    if (!date) {
      return new Response(
        JSON.stringify({ error: 'Date parameter is required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const targetDate = new Date(date);

    // Calculate start of the week (Sunday)
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday
    const weekStart = new Date(targetDate);
    weekStart.setUTCDate(targetDate.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);

    // Calculate end of the week (Saturday)
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    // --- Run all queries in parallel ---
    const [
      lecturesPromise,
      studySessionsPromise,
      assignmentsPromise,
    ] = [
      supabase
        .from('lectures')
        .select('*, courses(course_name)')
        .gte('lecture_date', weekStart.toISOString())
        .lte('lecture_date', weekEnd.toISOString()),
      supabase
        .from('study_sessions')
        .select('*, courses(course_name)')
        .gte('session_date', weekStart.toISOString())
        .lte('session_date', weekEnd.toISOString()),
      supabase
        .from('assignments')
        .select('*, courses(course_name)')
        .gte('due_date', weekStart.toISOString())
        .lte('due_date', weekEnd.toISOString()),
    ];

    const [
      { data: lectures, error: lecturesError },
      { data: studySessions, error: studySessionsError },
      { data: assignments, error: assignmentsError },
    ] = await Promise.all([
      lecturesPromise,
      studySessionsPromise,
      assignmentsPromise,
    ]);

    if (lecturesError) throw lecturesError;
    if (studySessionsError) throw studySessionsError;
    if (assignmentsError) throw assignmentsError;

    // --- Process, normalize, and group the results ---
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
    ];

    // Group tasks by date
    const groupedByDay = allTasks.reduce((acc, task) => {
      const taskDate = new Date(task.date).toISOString().split('T')[0]; // Get YYYY-MM-DD
      if (!acc[taskDate]) {
        acc[taskDate] = [];
      }
      acc[taskDate].push(task);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort tasks within each day
    for (const day in groupedByDay) {
      groupedByDay[day].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return new Response(
      JSON.stringify(groupedByDay),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
