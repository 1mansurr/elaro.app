import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { DeleteStudySessionSchema } from '../_shared/schemas/studySession.ts';

async function handleDeleteStudySession({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { session_id } = body;

  console.log(`Verifying ownership for user: ${user.id}, session: ${session_id}`);

  // SECURITY: Verify ownership before deleting
  const { error: checkError } = await supabaseClient
    .from('study_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');

  // Perform soft delete
  const { error: deleteError } = await supabaseClient
    .from('study_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', session_id);

  if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
  
  console.log(`Soft deleted study session with ID: ${session_id} for user: ${user.id}`);
  
  return { success: true, message: 'Study session deleted successfully.' };
}

serve(createAuthenticatedHandler(
  handleDeleteStudySession,
  {
    rateLimitName: 'delete-study-session',
    schema: DeleteStudySessionSchema,
  }
));
