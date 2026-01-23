// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { UpdateUserProfileSchema } from '../_shared/schemas/user.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateUserProfile(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const updates = body;
  // @ts-expect-error - Deno.env is available at runtime in Deno
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey)
    throw new AppError(
      'Encryption key not configured.',
      500,
      ERROR_CODES.CONFIG_ERROR,
    );

  // We don't need an ownership check here because we are updating the authenticated user's own profile.
  await logger.info(
    'Updating user profile',
    { user_id: user.id },
    traceContext,
  );

  // Encrypt fields if they are being updated
  const encryptedUpdates: Record<string, string> = {};
  if (updates.first_name && typeof updates.first_name === 'string') {
    encryptedUpdates.first_name = await encrypt(
      updates.first_name,
      encryptionKey,
    );
  }
  if (updates.last_name && typeof updates.last_name === 'string') {
    encryptedUpdates.last_name = await encrypt(
      updates.last_name,
      encryptionKey,
    );
  }
  if (updates.university && typeof updates.university === 'string') {
    encryptedUpdates.university = await encrypt(
      updates.university,
      encryptionKey,
    );
  }
  if (updates.program && typeof updates.program === 'string') {
    encryptedUpdates.program = await encrypt(updates.program, encryptionKey);
  }

  // Fields that don't need encryption can be passed through directly
  // Ensure username is included if provided (it shouldn't be encrypted)
  const finalUpdates = {
    ...updates,
    ...encryptedUpdates,
    // Explicitly include username if provided (not encrypted)
    username: updates.username || undefined,
    // Explicitly include country if provided (not encrypted)
    country: updates.country || undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error: updateError } = await supabaseClient
    .from('users')
    .update(finalUpdates)
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) throw handleDbError(updateError);

  await logger.info(
    'Successfully updated user profile',
    { user_id: user.id },
    traceContext,
  );
  return (data || {}) as Record<string, unknown>;
}

serve(
  createAuthenticatedHandler(handleUpdateUserProfile, {
    rateLimitName: 'update-user-profile',
    schema: UpdateUserProfileSchema,
  }),
);
