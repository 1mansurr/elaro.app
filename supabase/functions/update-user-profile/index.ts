import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { UpdateUserProfileSchema } from '../_shared/schemas/user.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateUserProfile({ user, supabaseClient, body }: AuthenticatedRequest) {
  const updates = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

  // We don't need an ownership check here because we are updating the authenticated user's own profile.
  console.log(`Updating profile for user: ${user.id}`);

  // Encrypt fields if they are being updated
  const encryptedUpdates: Record<string, any> = {};
  if (updates.first_name) {
    encryptedUpdates.first_name = await encrypt(updates.first_name, encryptionKey);
  }
  if (updates.last_name) {
    encryptedUpdates.last_name = await encrypt(updates.last_name, encryptionKey);
  }
  if (updates.university) {
    encryptedUpdates.university = await encrypt(updates.university, encryptionKey);
  }
  if (updates.program) {
    encryptedUpdates.program = await encrypt(updates.program, encryptionKey);
  }
  
  // Fields that don't need encryption can be passed through directly
  const finalUpdates = { 
    ...updates, 
    ...encryptedUpdates,
    updated_at: new Date().toISOString(),
  };

  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update(finalUpdates)
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  console.log(`Successfully updated profile for user: ${user.id}`);
  return data;
}

serve(createAuthenticatedHandler(
  handleUpdateUserProfile,
  {
    rateLimitName: 'update-user-profile',
    schema: UpdateUserProfileSchema,
  }
));
