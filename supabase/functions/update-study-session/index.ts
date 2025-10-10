import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { UpdateStudySessionSchema } from '../_shared/schemas/studySession.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateStudySession({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { session_id, ...updates } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

  console.log(`Verifying ownership for user: ${user.id}, session: ${session_id}`);

  // SECURITY: Verify ownership before updating
  const { error: checkError } = await supabaseClient
    .from('study_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');

  // Encrypt fields if they are being updated
  const encryptedUpdates = { ...updates };
  if (updates.topic) {
    encryptedUpdates.topic = await encrypt(updates.topic, encryptionKey);
  }
  if (updates.notes) {
    encryptedUpdates.notes = await encrypt(updates.notes, encryptionKey);
  }

  const { data, error: updateError } = await supabaseClient
    .from('study_sessions')
    .update({
      ...encryptedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session_id)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  console.log(`Successfully updated study session with ID: ${session_id}`);
  return data;
}

serve(createAuthenticatedHandler(
  handleUpdateStudySession,
  {
    rateLimitName: 'update-study-session',
    schema: UpdateStudySessionSchema,
  }
));
