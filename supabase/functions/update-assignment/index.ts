import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { UpdateAssignmentSchema } from '../_shared/schemas/assignment.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateAssignment({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { assignment_id, ...updates } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

  console.log(`Verifying ownership for user: ${user.id}, assignment: ${assignment_id}`);

  // SECURITY: Verify ownership before updating
  const { error: checkError } = await supabaseClient
    .from('assignments')
    .select('id')
    .eq('id', assignment_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Assignment not found or access denied.', 404, 'NOT_FOUND');

  // Encrypt fields if they are being updated
  const encryptedUpdates = { ...updates };
  if (updates.title) {
    encryptedUpdates.title = await encrypt(updates.title, encryptionKey);
  }
  if (updates.description) {
    encryptedUpdates.description = await encrypt(updates.description, encryptionKey);
  }

  const { data, error: updateError } = await supabaseClient
    .from('assignments')
    .update({
      ...encryptedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignment_id)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  console.log(`Successfully updated assignment with ID: ${assignment_id}`);
  return data;
}

serve(createAuthenticatedHandler(
  handleUpdateAssignment,
  {
    rateLimitName: 'update-assignment',
    schema: UpdateAssignmentSchema,
  }
));
