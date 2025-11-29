import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAdminHandler,
  AuthenticatedRequest,
} from '../_shared/admin-handler.ts';
import {
  hashMasterKey,
  getTopLevelAdminCount,
  isTopLevelAdmin,
} from '../_shared/master-key.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import {
  AppError,
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_STATUS_CODES,
} from '../_shared/error-codes.ts';
import { z } from 'zod';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const InitiateResetSchema = z.object({
  new_master_key: z
    .string()
    .min(32, 'Master key must be at least 32 characters'),
  reason: z.string().optional(),
});

async function handleInitiateReset(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify top-level admin
  const isTopAdmin = await isTopLevelAdmin(user.id, supabaseAdmin);
  if (!isTopAdmin) {
    throw new AppError(
      'Only top-level admins can initiate master key reset',
      ERROR_STATUS_CODES.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Check if there are at least 2 top-level admins
  const adminCount = await getTopLevelAdminCount(supabaseAdmin);
  if (adminCount < 2) {
    throw new AppError(
      'At least 2 top-level admins required for master key reset',
      ERROR_STATUS_CODES.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Check for existing pending requests
  const { data: pendingRequests } = await supabaseAdmin
    .from('master_key_reset_requests')
    .select('*')
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (pendingRequests && pendingRequests.length > 0) {
    throw new AppError(
      'A pending reset request already exists. Please approve or wait for expiration.',
      ERROR_STATUS_CODES.BAD_REQUEST,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Hash the new master key
  const newKeyHash = await hashMasterKey(body.new_master_key);

  // Create reset request
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 12);

  const { data, error } = await supabaseAdmin
    .from('master_key_reset_requests')
    .insert({
      new_key_hash: newKeyHash,
      initiated_by_admin_id: user.id,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      metadata: { reason: body.reason },
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
    action: 'initiate_master_key_reset',
    reason: body.reason || 'Master key reset initiated',
    admin_notes: `Reset request created. Requires approval from another top-level admin. Expires at ${expiresAt.toISOString()}`,
    metadata: { reset_request_id: data.id },
  });

  await logger.info(
    'Master key reset initiated',
    { admin_id: user.id, reset_request_id: data.id },
    traceContext,
  );

  return {
    success: true,
    reset_request_id: data.id,
    expires_at: data.expires_at,
    message:
      'Reset request created. Requires approval from another top-level admin.',
  };
}

serve(
  createAdminHandler(
    handleInitiateReset,
    'admin-initiate-master-key-reset',
    InitiateResetSchema,
    true,
  ),
);
