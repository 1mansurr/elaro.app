// FILE: supabase/functions/create-assignment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { checkTaskLimit } from '../_shared/check-task-limit.ts';
import { encrypt } from '../_shared/encryption.ts';

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
    const supabase = getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Check unified task limit
    const limitError = await checkTaskLimit(supabase, user.id);
    if (limitError) return limitError;

    const { course_id, title, description, submission_method, submission_link, due_date } = await req.json();

    if (!course_id || !title || !due_date) {
      return new Response(
        JSON.stringify({ error: 'Course, title, and due date are required.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Encryption key from environment
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
    if (!ENCRYPTION_KEY) {
      return new Response('Encryption key not configured.', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Encrypt sensitive fields
    const encryptedTitle = await encrypt(title, ENCRYPTION_KEY);
    const encryptedDescription = description ? await encrypt(description, ENCRYPTION_KEY) : null;

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        user_id: user.id,
        course_id,
        title: encryptedTitle,
        description: encryptedDescription,
        submission_method,
        submission_link,
        due_date,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
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
