import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { DeleteLectureSchema } from '../_shared/schemas/lecture.ts';

async function handleDeleteLecture({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { lecture_id } = body;

  console.log(`Verifying ownership for user: ${user.id}, lecture: ${lecture_id}`);

  // SECURITY: Verify ownership before deleting
  const { error: checkError } = await supabaseClient
    .from('lectures')
    .select('id')
    .eq('id', lecture_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Lecture not found or access denied.', 404, 'NOT_FOUND');

  // Perform soft delete
  const { error: deleteError } = await supabaseClient
    .from('lectures')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lecture_id);

  if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
  
  console.log(`Soft deleted lecture with ID: ${lecture_id} for user: ${user.id}`);
  
  return { success: true, message: 'Lecture deleted successfully.' };
}

serve(createAuthenticatedHandler(
  handleDeleteLecture,
  {
    rateLimitName: 'delete-lecture',
    schema: DeleteLectureSchema,
  }
));
