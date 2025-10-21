import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AppError } from '../_shared/function-handler.ts';
import { CreateCourseSchema } from '../_shared/schemas/course.ts';

const COURSE_LIMITS: { [key: string]: number } = {
  free: 2,
  oddity: 7,
};

serve(createAuthenticatedHandler(
  async ({ user, supabaseClient, body }) => {
    // Validation is now handled automatically by the handler using CreateCourseSchema
    
    // 1. Get validated data from the request body
    const { course_name, course_code, about_course } = body;

    // 2. TIER-SPECIFIC LIMIT LOGIC
    // Get the user's subscription tier to apply the correct limit
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new AppError('Failed to retrieve user profile.', 500, 'PROFILE_FETCH_ERROR');
    }

    const userTier = userProfile?.subscription_tier || 'free';
    const courseLimit = COURSE_LIMITS[userTier] || COURSE_LIMITS.free;

    // Check if the user has reached their course limit
    const { count, error: countError } = await supabaseClient
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      throw new AppError('Failed to count existing courses.', 500, 'COUNT_ERROR');
    }

    if (count !== null && count >= courseLimit) {
      throw new AppError(
        `You have reached the course limit of ${courseLimit} for the '${userTier}' plan.`,
        403,
        'COURSE_LIMIT_EXCEEDED'
      );
    }

    // 3. Create the course
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
      throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
    }

    // 4. Return the result
    return newCourse;
  },
  {
    rateLimitName: 'create-course',
    schema: CreateCourseSchema,
  }
));
