import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { UpdateLectureSchema } from '../_shared/schemas/lecture.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateLecture({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { lecture_id, ...updates } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

  console.log(`Verifying ownership for user: ${user.id}, lecture: ${lecture_id}`);

  // SECURITY: Verify ownership before updating
  const { error: checkError } = await supabaseClient
    .from('lectures')
    .select('id')
    .eq('id', lecture_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Lecture not found or access denied.', 404, 'NOT_FOUND');

  // Encrypt fields if they are being updated
  const encryptedUpdates = { ...updates };
  if (updates.lecture_name) {
    encryptedUpdates.lecture_name = await encrypt(updates.lecture_name, encryptionKey);
  }
  if (updates.description) {
    encryptedUpdates.description = await encrypt(updates.description, encryptionKey);
  }

  const { data, error: updateError } = await supabaseClient
    .from('lectures')
    .update({
      ...encryptedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lecture_id)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  console.log(`Successfully updated lecture with ID: ${lecture_id}`);
  return data;
}

serve(createAuthenticatedHandler(
  handleUpdateLecture,
  {
    rateLimitName: 'update-lecture',
    schema: UpdateLectureSchema,
  }
));
