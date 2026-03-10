// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminHandler } from '../_shared/admin-handler.ts';
import { AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { isTopLevelAdmin } from '../_shared/master-key.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { ERROR_CODES, ERROR_STATUS_CODES } from '../_shared/error-codes.ts';
import { z } from 'zod';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ApproveResetSchema = z.object({
  reset_request_id: z.string().uuid(),
  reason: z.string().optional(),
});

async function handleApproveReset(req: AuthenticatedRequest) {
  const { user, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify top-level admin
  const isTopAdmin = await isTopLevelAdmin(user.id, supabaseAdmin);
  if (!isTopAdmin) {
    throw new AppError(
      'Only top-level admins can approve master key reset',
      ERROR_STATUS_CODES.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Get reset request
  const { data: resetRequest, error: fetchError } = await supabaseAdmin
    .from('master_key_reset_requests')
    .select('*')
    .eq('id', body.reset_request_id)
    .single();

  if (fetchError || !resetRequest) {
    throw new AppError(
      'Reset request not found',
      ERROR_STATUS_CODES.NOT_FOUND,
      ERROR_CODES.DB_NOT_FOUND,
    );
  }

  // Check if already approved
  if (resetRequest.status !== 'pending') {
    throw new AppError(
      `Reset request is already ${resetRequest.status}`,
      ERROR_STATUS_CODES.INVALID_INPUT,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Check if expired
  if (new Date(resetRequest.expires_at) < new Date()) {
    // Update status to expired
    await supabaseAdmin
      .from('master_key_reset_requests')
      .update({ status: 'expired' })
      .eq('id', body.reset_request_id);

    throw new AppError(
      'Reset request has expired',
      ERROR_STATUS_CODES.INVALID_INPUT,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Check if same admin trying to approve their own request
  if (resetRequest.initiated_by_admin_id === user.id) {
    throw new AppError(
      'Cannot approve your own reset request',
      ERROR_STATUS_CODES.INVALID_INPUT,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Deactivate old master key
  await supabaseAdmin
    .from('master_decryption_keys')
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      deactivated_by_admin_id: user.id,
    })
    .eq('is_active', true);

  // Create new master key
  const { data: newKey, error: createError } = await supabaseAdmin
    .from('master_decryption_keys')
    .insert({
      key_hash: resetRequest.new_key_hash,
      is_active: true,
      created_by_admin_id: user.id,
    })
    .select()
    .single();

  if (createError) {
    throw handleDbError(createError);
  }

  // Update reset request status
  await supabaseAdmin
    .from('master_key_reset_requests')
    .update({
      status: 'approved',
      approved_by_admin_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', body.reset_request_id);

  // Log the action
  await supabaseAdmin.from('admin_actions').insert({
    admin_id: user.id,
    target_user_id: resetRequest.initiated_by_admin_id,
    action: 'approve_master_key_reset',
    reason: body.reason || 'Master key reset approved',
    admin_notes: `Approved reset request initiated by admin ${resetRequest.initiated_by_admin_id}`,
    metadata: {
      reset_request_id: body.reset_request_id,
      new_master_key_id: newKey.id,
    },
  });

  await logger.info(
    'Master key reset approved and completed',
    {
      admin_id: user.id,
      reset_request_id: body.reset_request_id,
      new_master_key_id: newKey.id,
    },
    traceContext,
  );

  return {
    success: true,
    message: 'Master key reset approved and completed',
    new_master_key_id: newKey.id,
    created_at: newKey.created_at,
  };
}

serve(
  createAdminHandler(
    handleApproveReset,
    'admin-approve-master-key-reset',
    ApproveResetSchema,
    true,
  ),
);
