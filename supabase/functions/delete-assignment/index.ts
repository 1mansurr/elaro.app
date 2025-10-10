import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { DeleteAssignmentSchema } from '../_shared/schemas/assignment.ts';

async function handleDeleteAssignment({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { assignment_id } = body;

  console.log(`Verifying ownership for user: ${user.id}, assignment: ${assignment_id}`);

  // SECURITY: Verify ownership before deleting
  const { error: checkError } = await supabaseClient
    .from('assignments')
    .select('id')
    .eq('id', assignment_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Assignment not found or access denied.', 404, 'NOT_FOUND');

  // Perform soft delete
  const { error: deleteError } = await supabaseClient
    .from('assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assignment_id);

  if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
  
  console.log(`Soft deleted assignment with ID: ${assignment_id} for user: ${user.id}`);
  
  return { success: true, message: 'Assignment deleted successfully.' };
}

serve(createAuthenticatedHandler(
  handleDeleteAssignment,
  {
    rateLimitName: 'delete-assignment',
    schema: DeleteAssignmentSchema,
  }
));
