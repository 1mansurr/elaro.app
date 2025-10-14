import { serveWithSentry } from '../_shared/sentry-wrapper.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

const COURSE_LIMITS: { [key: string]: number } = {
  free: 2,
  oddity: 7,
};

serveWithSentry(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! }
      }
    }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
    );
  }

  // Apply rate limiting check
  try {
    await checkRateLimit(supabaseClient, user.id, 'create-course');
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

  const { course_name, course_code, about_course } = await req.json();

  if (!course_name) {
    return new Response(
      JSON.stringify({ error: 'Course name is required.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }

  // --- TIER-SPECIFIC LIMIT LOGIC ---
  // Get the user's subscription tier to apply the correct limit
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve user profile.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }

  const userTier = userProfile?.subscription_tier || 'free';
  const courseLimit = COURSE_LIMITS[userTier] || COURSE_LIMITS.free;

  // Check if the user has reached their course limit
  const { count, error: countError } = await supabaseClient
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (countError) {
    return new Response(
      JSON.stringify({ error: 'Failed to count existing courses.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }

  if (count !== null && count >= courseLimit) {
    return new Response(
      JSON.stringify({ error: `You have reached the course limit of ${courseLimit} for the '${userTier}' plan.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      }
    );
  }
  // --- END OF TIER-SPECIFIC LIMIT LOGIC ---

  const { data: newCourse, error: insertError } = await supabaseClient
    .from('courses')
    .insert({
      user_id: user.id,
      course_name,
      course_code,
      about_course,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return new Response(
    JSON.stringify(newCourse),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    }
  );
});
