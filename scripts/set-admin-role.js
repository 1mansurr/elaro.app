/**
 * Script to set a user as top-level admin
 * Usage: node scripts/set-admin-role.js <email>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error(
    '   SUPABASE_SERVICE_ROLE_KEY:',
    supabaseServiceKey ? '✓' : '✗',
  );
  process.exit(1);
}

const email = process.argv[2] || 'saymmmohammed265@gmail.com';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setAdminRole() {
  console.log(`🔧 Setting admin role for: ${email}`);

  // First, check if user exists
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', email)
    .single();

  if (findError || !user) {
    console.error('❌ User not found:', findError?.message || 'No user found');
    process.exit(1);
  }

  console.log('📋 Current user info:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Current role:', user.role);

  if (user.role === 'admin') {
    console.log('✅ User is already an admin. No changes needed.');
    return;
  }

  // Update role to admin
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Failed to update role:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Successfully set user as admin!');
  console.log('📋 Updated user info:');
  console.log('   ID:', updatedUser.id);
  console.log('   Email:', updatedUser.email);
  console.log('   Role:', updatedUser.role);
}

setAdminRole().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
