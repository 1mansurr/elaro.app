// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encrypt, decrypt } from '../_shared/encryption.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Check if a string appears to be base64-encoded encrypted data
 */
function isBase64Encrypted(str: string): boolean {
  if (!str || typeof str !== 'string' || str.length <= 20) {
    return false;
  }
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(str) && str.length >= 20;
}

/**
 * Check if a field is plaintext and needs encryption
 */
function needsEncryption(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return false; // Skip empty values
  }
  return !isBase64Encrypted(value);
}

interface MigrationResult {
  userId: string;
  email: string;
  fieldsEncrypted: string[];
  errors: string[];
}

interface MigrationSummary {
  totalUsersProcessed: number;
  totalUsersUpdated: number;
  totalFieldsEncrypted: number;
  results: MigrationResult[];
  errors: string[];
  dryRun: boolean;
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    // Parse request body
    let body: {
      dryRun?: boolean;
      userId?: string; // Optional: migrate specific user only
      batchSize?: number; // Optional: process in batches
    } = {};

    try {
      if (req.method === 'POST') {
        body = await req.json();
      }
    } catch {
      // If no body, use defaults
      body = {};
    }

    const dryRun = body.dryRun !== false; // Default to true for safety
    const specificUserId = body.userId;
    const batchSize = body.batchSize || 100;

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing Supabase configuration',
          message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
        }),
        {
          status: 500,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        },
      );
    }

    if (!encryptionKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing encryption key',
          message: 'ENCRYPTION_KEY is required',
        }),
        {
          status: 500,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        },
      );
    }

    // Create Supabase admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log(
      `🔧 Starting migration${dryRun ? ' (DRY RUN - no changes will be made)' : ''}`,
    );

    // Test encryption/decryption before proceeding
    console.log('🧪 Testing encryption/decryption...');
    const testValue = 'test-encryption-value';
    try {
      const encrypted = await encrypt(testValue, encryptionKey);
      const decrypted = await decrypt(encrypted, encryptionKey);
      if (decrypted !== testValue) {
        throw new Error('Encryption/decryption test failed - values do not match');
      }
      console.log('✅ Encryption/decryption test passed');
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Encryption test failed',
          message: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        },
      );
    }

    // Query users with plaintext data
    let query = supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, country')
      .order('created_at', { ascending: true });

    // If specific user ID provided, filter to that user
    if (specificUserId) {
      query = query.eq('id', specificUserId);
      console.log(`📋 Processing specific user: ${specificUserId}`);
    } else {
      console.log('📋 Processing all users...');
    }

    const { data: users, error: queryError } = await query;

    if (queryError) {
      console.error('❌ Error querying users:', queryError);
      return new Response(
        JSON.stringify({
          error: 'Failed to query users',
          message: queryError.message,
        }),
        {
          status: 500,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        },
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No users found',
          summary: {
            totalUsersProcessed: 0,
            totalUsersUpdated: 0,
            totalFieldsEncrypted: 0,
            results: [],
            errors: [],
            dryRun,
          },
        }),
        {
          status: 200,
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`📊 Found ${users.length} user(s) to process`);

    const results: MigrationResult[] = [];
    const globalErrors: string[] = [];
    let totalFieldsEncrypted = 0;

    // Process users in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} users)...`);

      for (const user of batch) {
        const result: MigrationResult = {
          userId: user.id,
          email: user.email || 'unknown',
          fieldsEncrypted: [],
          errors: [],
        };

        try {
          const updates: Record<string, string> = {};
          let hasUpdates = false;

          // Check and encrypt first_name
          if (needsEncryption(user.first_name)) {
            try {
              const encrypted = await encrypt(user.first_name!, encryptionKey);
              updates.first_name = encrypted;
              result.fieldsEncrypted.push('first_name');
              totalFieldsEncrypted++;
              hasUpdates = true;
              console.log(
                `  ✅ User ${user.id}: first_name will be encrypted (${user.first_name} -> encrypted)`,
              );
            } catch (error) {
              const errorMsg = `Failed to encrypt first_name: ${error instanceof Error ? error.message : String(error)}`;
              result.errors.push(errorMsg);
              console.error(`  ❌ User ${user.id}: ${errorMsg}`);
            }
          }

          // Check and encrypt last_name
          if (needsEncryption(user.last_name)) {
            try {
              const encrypted = await encrypt(user.last_name!, encryptionKey);
              updates.last_name = encrypted;
              result.fieldsEncrypted.push('last_name');
              totalFieldsEncrypted++;
              hasUpdates = true;
              console.log(
                `  ✅ User ${user.id}: last_name will be encrypted (${user.last_name} -> encrypted)`,
              );
            } catch (error) {
              const errorMsg = `Failed to encrypt last_name: ${error instanceof Error ? error.message : String(error)}`;
              result.errors.push(errorMsg);
              console.error(`  ❌ User ${user.id}: ${errorMsg}`);
            }
          }

          // Check and encrypt country
          if (needsEncryption(user.country)) {
            try {
              const encrypted = await encrypt(user.country!, encryptionKey);
              updates.country = encrypted;
              result.fieldsEncrypted.push('country');
              totalFieldsEncrypted++;
              hasUpdates = true;
              console.log(
                `  ✅ User ${user.id}: country will be encrypted (${user.country} -> encrypted)`,
              );
            } catch (error) {
              const errorMsg = `Failed to encrypt country: ${error instanceof Error ? error.message : String(error)}`;
              result.errors.push(errorMsg);
              console.error(`  ❌ User ${user.id}: ${errorMsg}`);
            }
          }

          // Update database if not dry run and has updates
          if (!dryRun && hasUpdates) {
            updates.updated_at = new Date().toISOString();

            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update(updates)
              .eq('id', user.id);

            if (updateError) {
              const errorMsg = `Failed to update user: ${updateError.message}`;
              result.errors.push(errorMsg);
              console.error(`  ❌ User ${user.id}: ${errorMsg}`);
            } else {
              console.log(
                `  ✅ User ${user.id}: Updated ${result.fieldsEncrypted.length} field(s)`,
              );
            }
          } else if (dryRun && hasUpdates) {
            console.log(
              `  🔍 [DRY RUN] User ${user.id}: Would update ${result.fieldsEncrypted.length} field(s)`,
            );
          } else {
            console.log(`  ⏭️  User ${user.id}: No updates needed (all fields already encrypted or empty)`);
          }
        } catch (error) {
          const errorMsg = `Unexpected error processing user: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error(`  ❌ User ${user.id}: ${errorMsg}`);
        }

        results.push(result);
      }
    }

    const summary: MigrationSummary = {
      totalUsersProcessed: users.length,
      totalUsersUpdated: results.filter(r => r.fieldsEncrypted.length > 0).length,
      totalFieldsEncrypted,
      results,
      errors: globalErrors,
      dryRun,
    };

    console.log('\n📊 Migration Summary:');
    console.log(`  Total users processed: ${summary.totalUsersProcessed}`);
    console.log(`  Users with updates: ${summary.totalUsersUpdated}`);
    console.log(`  Total fields encrypted: ${summary.totalFieldsEncrypted}`);
    console.log(`  Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE (changes applied)'}`);

    return new Response(
      JSON.stringify({
        message: dryRun
          ? 'Dry run completed - no changes were made'
          : 'Migration completed successfully',
        summary,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('❌ Migration error:', error);
    return new Response(
      JSON.stringify({
        error: 'Migration failed',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      },
    );
  }
});
