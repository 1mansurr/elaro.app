// Create this new Edge Function. It is a copy of `update-lecture` but modified for the `assignments` table.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createSupabaseClient } from '../_shared/supabase-client.ts';
import { checkTaskLimit } from '../_shared/check-task-limit.ts';
import { corsHeaders } from '../_shared/cors.ts';

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
    const { assignmentId, updates } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: originalAssignment, error: fetchError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !originalAssignment) {
      return new Response(JSON.stringify({ error: 'Assignment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const createdAt = new Date(originalAssignment.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const isWithinGracePeriod = minutesSinceCreation <= 5;

    let isSignificantEdit = false;
    if (!isWithinGracePeriod) {
      if (updates.course_id && updates.course_id !== originalAssignment.course_id) isSignificantEdit = true;
      if (updates.title && getStringDifferencePercent(updates.title, originalAssignment.title) > 50) isSignificantEdit = true;
      
      // Check for significant changes to the description field
      if (updates.description && getStringDifferencePercent(updates.description, originalAssignment.description || '') > 70) isSignificantEdit = true;
      
      const originalDueTime = new Date(originalAssignment.due_date).getTime();
      if (updates.due_date && Math.abs(new Date(updates.due_date).getTime() - originalDueTime) >= 3600000) isSignificantEdit = true;
    }

    if (isSignificantEdit) {
      const limitError = await checkTaskLimit(supabase, user.id);
      if (limitError) return limitError;
    }

    const { data: updatedAssignment, error: updateError } = await supabase
      .from('assignments')
      .update({ ...updates, updated_at: now.toISOString() })
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedAssignment), {
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
