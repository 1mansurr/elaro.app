// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminHandler } from '../_shared/admin-handler.ts';
import { AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import {
  hashMasterKey,
  getActiveMasterKeyHash,
  isTopLevelAdmin,
} from '../_shared/master-key.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { ERROR_CODES, ERROR_STATUS_CODES } from '../_shared/error-codes.ts';
import { z } from 'zod';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SetupMasterKeySchema = z.object({
  master_key: z.string().min(32, 'Master key must be at least 32 characters'),
});

async function handleSetupMasterKey(req: AuthenticatedRequest) {
  const { user, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify top-level admin
  const isTopAdmin = await isTopLevelAdmin(user.id, supabaseAdmin);
  if (!isTopAdmin) {
    throw new AppError(
      'Only top-level admins can set up master key',
      ERROR_STATUS_CODES.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Check if master key already exists
  const existingKey = await getActiveMasterKeyHash();
  if (existingKey) {
    throw new AppError(
      'Master key already exists. Use reset function to change it.',
      ERROR_STATUS_CODES.INVALID_INPUT,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Hash the master key
  const masterKey = typeof body.master_key === 'string' ? body.master_key : '';
  if (!masterKey) {
    throw new AppError(
      'Master key is required',
      ERROR_STATUS_CODES.INVALID_INPUT,
      ERROR_CODES.INVALID_INPUT,
    );
  }
  const keyHash = await hashMasterKey(masterKey);

  // Store in database
  const { data, error } = await supabaseAdmin
    .from('master_decryption_keys')
    .insert({
      key_hash: keyHash,
      is_active: true,
      created_by_admin_id: user.id,
    })
    .select()
    .single();

  if (error) {
    throw handleDbError(error);
  }

  // Log the action
  await supabaseAdmin.from('admin_actions').insert({
    admin_id: user.id,
    target_user_id: user.id,
    action: 'setup_master_key',
    reason: 'Initial master key setup',
    admin_notes: 'Master key has been set up',
    metadata: { master_key_id: data.id },
  });

  await logger.info(
    'Master key set up successfully',
    { admin_id: user.id },
    traceContext,
  );

  return {
    success: true,
    message: 'Master key set up successfully',
    created_at: data.created_at,
  };
}

serve(
  createAdminHandler(
    handleSetupMasterKey,
    'admin-setup-master-key',
    SetupMasterKeySchema,
    true, // Require idempotency
  ),
);
