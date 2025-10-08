// Create this new Edge Function. It is a copy of the others but modified for the `study_sessions` table.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { checkTaskLimit } from '../_shared/check-task-limit.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

function getStringDifferencePercent(str1: string, str2: string ): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 0;
  const edits = Array.from(longer).filter((char, i) => char !== shorter[i]).length;
  return (edits / longer.length) * 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(req);
    const { sessionId, updates } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Apply rate limiting check
    try {
      await checkRateLimit(supabase, user.id, 'update-study-session');
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

    const { data: originalSession, error: fetchError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !originalSession) {
      return new Response(JSON.stringify({ error: 'Study session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const createdAt = new Date(originalSession.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const isWithinGracePeriod = minutesSinceCreation <= 5;

    let isSignificantEdit = false;
    if (!isWithinGracePeriod) {
      if (updates.course_id && updates.course_id !== originalSession.course_id) isSignificantEdit = true;
      if (updates.topic && getStringDifferencePercent(updates.topic, originalSession.topic) > 50) isSignificantEdit = true;
      
      // Check for significant changes to the description field
      if (updates.description && getStringDifferencePercent(updates.description, originalSession.description || '') > 70) isSignificantEdit = true;

      const originalSessionTime = new Date(originalSession.session_date).getTime();
      if (updates.session_date && Math.abs(new Date(updates.session_date).getTime() - originalSessionTime) >= 3600000) isSignificantEdit = true;
    }

    if (isSignificantEdit) {
      const limitError = await checkTaskLimit(supabase, user.id);
      if (limitError) return limitError;
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('study_sessions')
      .update({ ...updates, updated_at: now.toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedSession), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
