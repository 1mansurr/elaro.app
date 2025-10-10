import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { DeleteCourseSchema } from '../_shared/schemas/course.ts';

async function handleDeleteCourse({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { course_id } = body;

  console.log(`Verifying ownership for user: ${user.id}, course: ${course_id}`);

  // SECURITY: Verify ownership before deleting
  const { error: checkError } = await supabaseClient
    .from('courses')
    .select('id')
    .eq('id', course_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Course not found or access denied.', 404, 'NOT_FOUND');

  // Perform the soft delete by setting the deleted_at timestamp
  const { error: deleteError } = await supabaseClient
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', course_id);

  if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
  
  console.log(`Soft deleted course with ID: ${course_id} for user: ${user.id}`);
  
  return { success: true, message: 'Course deleted successfully.' };
}

serve(createAuthenticatedHandler(
  handleDeleteCourse,
  {
    rateLimitName: 'delete-course',
    schema: DeleteCourseSchema,
  }
));
