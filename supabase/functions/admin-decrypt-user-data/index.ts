import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAdminHandler,
  AuthenticatedRequest,
} from '../_shared/admin-handler.ts';
import { decrypt } from '../_shared/encryption.ts';
import {
  verifyMasterKey,
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

// Schema for single field decryption
const SingleFieldDecryptSchema = z.object({
  encrypted_text: z.string(),
  master_key: z.string(),
  reason: z.string().optional(),
});

// Schema for bulk decryption
const BulkDecryptSchema = z.object({
  record_type: z.enum(['assignment', 'lecture', 'study_session', 'course']),
  record_id: z.string().uuid(),
  fields: z.array(z.string()),
  master_key: z.string(),
  reason: z.string().optional(),
});

const DecryptSchema = z.union([SingleFieldDecryptSchema, BulkDecryptSchema]);

async function logDecryptionAttempt(
  supabaseAdmin: any,
  adminId: string,
  targetUserId: string | null,
  action: string,
  reason: string,
  metadata: any,
) {
  await supabaseAdmin.from('admin_actions').insert({
    admin_id: adminId,
    target_user_id: targetUserId || adminId, // Use admin_id if no target
    action,
    reason,
    admin_notes: `Decryption attempt: ${JSON.stringify(metadata)}`,
    metadata,
  });
}

async function handleDecrypt(req: AuthenticatedRequest) {
  const { user, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify top-level admin
  const isTopAdmin = await isTopLevelAdmin(user.id, supabaseAdmin);
  if (!isTopAdmin) {
    throw new AppError(
      'Only top-level admins can decrypt user data',
      ERROR_STATUS_CODES.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Verify master key
  const masterKey = body.master_key;
  const isValidKey = await verifyMasterKey(masterKey);
  if (!isValidKey) {
    // Log failed attempt
    await logDecryptionAttempt(
      supabaseAdmin,
      user.id,
      null,
      'decrypt_user_data',
      'Failed: Invalid master key',
      { attempt_type: body.encrypted_text ? 'single_field' : 'bulk' },
    );

    throw new AppError(
      'Invalid master key',
      ERROR_STATUS_CODES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  }

  // Handle single field decryption
  if (body.encrypted_text) {
    const decrypted = await decrypt(body.encrypted_text, masterKey);

    await logDecryptionAttempt(
      supabaseAdmin,
      user.id,
      null,
      'decrypt_user_data',
      body.reason || 'Single field decryption',
      {
        attempt_type: 'single_field',
        field_length: body.encrypted_text.length,
      },
    );

    await logger.info(
      'User data decrypted (single field)',
      { admin_id: user.id },
      traceContext,
    );

    return { decrypted_text: decrypted };
  }

  // Handle bulk decryption
  if (body.record_type && body.record_id && body.fields) {
    const { record_type, record_id, fields } = body;

    // Get the record
    const tableName =
      record_type === 'study_session' ? 'study_sessions' : `${record_type}s`;
    const { data: record, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('id', record_id)
      .single();

    if (error || !record) {
      throw new AppError(
        'Record not found',
        ERROR_STATUS_CODES.NOT_FOUND,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Decrypt requested fields
    const decryptedRecord: any = { ...record };
    for (const field of fields) {
      if (record[field] && typeof record[field] === 'string') {
        try {
          decryptedRecord[field] = await decrypt(record[field], masterKey);
        } catch (error) {
          // Field might not be encrypted, keep original
          console.warn(`Failed to decrypt field ${field}:`, error);
        }
      }
    }

    await logDecryptionAttempt(
      supabaseAdmin,
      user.id,
      record.user_id,
      'decrypt_user_data',
      body.reason || 'Bulk field decryption',
      {
        attempt_type: 'bulk',
        record_type,
        record_id,
        fields_decrypted: fields,
      },
    );

    await logger.info(
      'User data decrypted (bulk)',
      {
        admin_id: user.id,
        record_type,
        record_id,
        target_user_id: record.user_id,
      },
      traceContext,
    );

    return { decrypted_record: decryptedRecord };
  }

  throw new AppError(
    'Invalid request format',
    ERROR_STATUS_CODES.BAD_REQUEST,
    ERROR_CODES.INVALID_INPUT,
  );
}

serve(
  createAdminHandler(
    handleDecrypt,
    'admin-decrypt-user-data',
    DecryptSchema,
    false,
  ),
);

