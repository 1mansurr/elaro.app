import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit, RateLimitError } from '../_shared/rate-limiter.ts';

interface Course {
  course_name: string;
  course_code: string;
  about_course: string;
}

serve(async (req) => {
  // 1. Create Supabase client with admin privileges
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // 2. Get the user from the authorization header
  const authHeader = req.headers.get('Authorization')!;
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

  if (userError) {
    return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // Apply rate limiting check
  try {
    await checkRateLimit(supabaseClient, user.id, 'complete-onboarding');
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('An unexpected error occurred during rate limit check:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Get the data from the request body
  const { username, university, program, courses } = await req.json();

  // 5. Create the courses, if any
  if (courses && courses.length > 0) {
    const coursesToInsert = courses.map((course: Course) => ({
      user_id: user.id,
      course_name: course.course_name,
      course_code: course.course_code,
      about_course: course.about_course,
    }));

    const { error: coursesError } = await supabaseClient.from('courses').insert(coursesToInsert);

    if (coursesError) {
      console.error('Error creating courses:', coursesError);
      // Even if courses fail, the profile update succeeded, so we don't return a hard error.
      // A more robust solution might use a transaction here.
    }
  }

  // 4. Update the users table with username and onboarding status
  const { error: updateOnboardingError } = await supabaseClient
    .from('users')
    .update({ 
      username: username,
      onboarding_completed: true,
      university: university,
      program: program,
    })
    .eq('id', user.id);

  if (updateOnboardingError) {
    console.error('Error updating onboarding status:', updateOnboardingError);
    return new Response(JSON.stringify({ error: 'Failed to finalize onboarding status' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ message: 'Onboarding completed successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
