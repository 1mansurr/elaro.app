// Create this new Edge Function to handle lecture updates with our custom business logic.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { checkTaskLimit } from '../_shared/check-task-limit.ts';
import { corsHeaders } from '../_shared/cors.ts';

// A function to calculate the difference between two strings (e.g., Levenshtein distance )
// For simplicity, we'll use a basic percentage difference calculation here.
function getStringDifferencePercent(str1: string, str2: string): number {
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
    const { lectureId, updates } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch the original lecture to compare against
    const { data: originalLecture, error: fetchError } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !originalLecture) {
      return new Response(JSON.stringify({ error: 'Lecture not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Check the Grace Period
    const createdAt = new Date(originalLecture.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const isWithinGracePeriod = minutesSinceCreation <= 5;

    let isSignificantEdit = false;
    if (!isWithinGracePeriod) {
      // 3. Check for Significant Edits
      if (updates.course_id && updates.course_id !== originalLecture.course_id) isSignificantEdit = true;
      if (updates.title && getStringDifferencePercent(updates.title, originalLecture.title) > 50) isSignificantEdit = true;
      
      // Check for significant changes to the description field
      if (updates.description && getStringDifferencePercent(updates.description, originalLecture.description || '') > 70) isSignificantEdit = true;
      
      const originalStartTime = new Date(originalLecture.start_time).getTime();
      const originalEndTime = new Date(originalLecture.end_time).getTime();
      if (updates.start_time && Math.abs(new Date(updates.start_time).getTime() - originalStartTime) >= 3600000) isSignificantEdit = true;
      if (updates.end_time && Math.abs(new Date(updates.end_time).getTime() - originalEndTime) >= 3600000) isSignificantEdit = true;
    }

    // 4. If it's a significant edit, check the task limit
    if (isSignificantEdit) {
      const limitError = await checkTaskLimit(supabase, user.id);
      if (limitError) return limitError; // Returns a 403 Forbidden response
    }

    // 5. Proceed with the update
    const { data: updatedLecture, error: updateError } = await supabase
      .from('lectures')
      .update({ ...updates, updated_at: now.toISOString() })
      .eq('id', lectureId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedLecture), {
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
