/**
 * Migration script to migrate existing master key to new system
 *
 * Usage:
 * SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-key \
 *   deno run --allow-net --allow-env scripts/migrate-master-key.ts <your-master-key> <admin-user-id>
 *
 * Or set them in your environment before running:
 * export SUPABASE_URL="https://your-project.supabase.co"
 * export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *
 * Example:
 * SUPABASE_URL="https://alqpwhrsxmetwbtxuihv.supabase.co" \
 * SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
 * deno run --allow-net --allow-env scripts/migrate-master-key.ts \
 *   "your-secure-master-key-here" "admin-uuid-here"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Try multiple environment variable names for flexibility
const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ||
  Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') ||
  '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const masterKey = Deno.args[0];
const adminUserId = Deno.args[1];

if (!masterKey) {
  console.error('❌ Missing master key');
  console.error('');
  console.error(
    'Usage: deno run migrate-master-key.ts <master-key> <admin-user-id>',
  );
  console.error('');
  console.error('Example:');
  console.error('  SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \\');
  console.error(
    '  deno run --allow-net --allow-env scripts/migrate-master-key.ts \\',
  );
  console.error('    "your-master-key" "admin-user-id"');
  Deno.exit(1);
}

if (!adminUserId) {
  console.error('❌ Missing admin user ID');
  console.error('');
  console.error(
    'Usage: deno run migrate-master-key.ts <master-key> <admin-user-id>',
  );
  console.error('Please provide the UUID of a top-level admin user');
  Deno.exit(1);
}

if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL');
  console.error('');
  console.error('Set it using one of these methods:');
  console.error(
    '  1. Export: export SUPABASE_URL="https://your-project.supabase.co"',
  );
  console.error('  2. Inline: SUPABASE_URL="..." deno run ...');
  console.error('  3. Or set EXPO_PUBLIC_SUPABASE_URL in your .env file');
  Deno.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error(
    'Get it from: Supabase Dashboard → Settings → API → service_role key',
  );
  console.error('');
  console.error('Set it using one of these methods:');
  console.error('  1. Export: export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.error('  2. Inline: SUPABASE_SERVICE_ROLE_KEY="..." deno run ...');
  console.error('');
  console.error(
    '⚠️  WARNING: Never commit the service role key to version control!',
  );
  Deno.exit(1);
}

/**
 * Hash master key using PBKDF2 (Web Crypto API)
 */
async function hashMasterKey(key: string): Promise<string> {
  try {
    // Convert key to ArrayBuffer
    const keyData = new TextEncoder().encode(key);

    // Import key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive key using PBKDF2 (100,000 iterations for security)
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      256, // 32 bytes = 256 bits
    );

    // Combine salt and derived key, then base64 encode
    const combined = new Uint8Array(salt.length + 32);
    combined.set(salt);
    combined.set(new Uint8Array(derivedBits), salt.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Error hashing master key:', error);
    throw error;
  }
}

async function migrate() {
  console.log('🔧 Starting master key migration...');
  console.log('   Supabase URL:', supabaseUrl);
  console.log('   Admin User ID:', adminUserId);
  console.log('');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify admin user exists and is top-level admin
  console.log('📋 Verifying admin user...');
  const { data: adminUser, error: adminError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', adminUserId)
    .single();

  if (adminError || !adminUser) {
    console.error(
      '❌ Admin user not found:',
      adminError?.message || 'No user found',
    );
    console.error('   Please verify the user ID is correct');
    Deno.exit(1);
  }

  console.log('   ✓ User found:', adminUser.email);
  console.log('   Current role:', adminUser.role);

  if (adminUser.role !== 'admin') {
    console.error('❌ Error: Provided user is not a top-level admin');
    console.error('   Current role:', adminUser.role);
    console.error('   Required role: admin');
    console.error('');
    console.error('   To fix: Run the SQL in scripts/set-admin-role.sql');
    Deno.exit(1);
  }

  console.log('   ✓ User is a top-level admin');
  console.log('');

  // Check if master key already exists
  console.log('🔍 Checking for existing master key...');
  const { data: existing } = await supabase
    .from('master_decryption_keys')
    .select('*')
    .eq('is_active', true)
    .single();

  if (existing) {
    console.log('⚠️  Master key already exists. Skipping migration.');
    console.log('   Existing key ID:', existing.id);
    console.log('   Created at:', existing.created_at);
    Deno.exit(0);
  }

  console.log('   ✓ No existing master key found');
  console.log('');

  // Hash the master key
  console.log('🔐 Hashing master key (this may take a moment)...');
  const keyHash = await hashMasterKey(masterKey);
  console.log('   ✓ Master key hashed successfully');
  console.log('');

  // Insert master key
  console.log('💾 Inserting master key into database...');
  const { data, error } = await supabase
    .from('master_decryption_keys')
    .insert({
      key_hash: keyHash,
      is_active: true,
      created_by_admin_id: adminUserId,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error migrating master key:', error.message);
    console.error('   Details:', error);
    Deno.exit(1);
  }

  console.log('');
  console.log('✅ Master key migrated successfully!');
  console.log('');
  console.log('📋 Migration Details:');
  console.log('   Master key ID:', data.id);
  console.log('   Created at:', data.created_at);
  console.log('   Created by admin:', adminUserId);
  console.log('   Admin email:', adminUser.email);
  console.log('');
  console.log('🎉 You can now use the master key system!');
}

migrate().catch(error => {
  console.error('Migration failed:', error);
  Deno.exit(1);
});
