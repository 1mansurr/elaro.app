// FILE: supabase/functions/get-calendar-data-for-week/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { decrypt } from '../_shared/encryption.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

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

    // Apply rate limiting check
    try {
      await checkRateLimit(supabase, user.id, 'get-calendar-data-for-week');
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

    // Encryption key from environment for decryption
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
    if (!ENCRYPTION_KEY) {
      return new Response('Encryption key not configured.', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // --- Process and normalize results (without setting conflicting name fields) ---
    const allTasks = [
      ...(lectures || []).map(t => ({
        ...t,
        type: 'lecture',
        date: t.lecture_date,
      })),
      ...(studySessions || []).map(t => ({
        ...t,
        type: 'study_session',
        date: t.session_date,
      })),
      ...(assignments || []).map(t => ({
        ...t,
        type: 'assignment',
        date: t.due_date,
      })),
    ];

    // Decrypt sensitive fields and standardize to { name, description }
    async function decryptTask(task: any) {
      const nameField = task.lecture_name || task.title || task.topic || '';
      const descField = task.description ?? task.notes ?? null;

      const decryptedName = nameField ? await decrypt(nameField, ENCRYPTION_KEY) : nameField;
      const decryptedDescription = descField ? await decrypt(descField, ENCRYPTION_KEY) : null;

      return {
        ...task,
        name: decryptedName,
        description: decryptedDescription,
        lecture_name: undefined,
        title: undefined,
        topic: undefined,
        notes: undefined,
      };
    }

    const decryptedTasks = await Promise.all(allTasks.map(decryptTask));

    // Group tasks by date
    const groupedByDay = decryptedTasks.reduce((acc: Record<string, any[]>, task: any) => {
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
