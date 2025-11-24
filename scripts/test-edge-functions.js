#!/usr/bin/env node

/**
 * Test Script: Edge Functions
 *
 * Tests Edge Functions without requiring a device.
 * Usage:
 *   node scripts/test-edge-functions.js check-username <username>
 *   node scripts/test-edge-functions.js start-trial
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error(
    '   EXPO_PUBLIC_SUPABASE_ANON_KEY:',
    supabaseAnonKey ? '✓' : '✗',
  );
  console.error('\nPlease ensure your .env file contains these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAuthToken() {
  // Try to get existing session first
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session && session.access_token) {
    console.log('✓ Using existing session');
    return session.access_token;
  }

  // If no session, sign in with test credentials
  const testEmail = process.env.TEST_EMAIL || 'saymmmmohammed265@gmail.com';
  const testPassword = process.env.TEST_PASSWORD;

  if (!testPassword) {
    console.error('❌ No existing session and TEST_PASSWORD not set');
    console.error(
      '   Please set TEST_PASSWORD in .env or sign in via the app first',
    );
    process.exit(1);
  }

  console.log(`📧 Signing in as ${testEmail}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    console.error('❌ Sign in failed:', error.message);
    process.exit(1);
  }

  console.log('✓ Signed in successfully');
  return data.session.access_token;
}

async function testCheckUsername(username) {
  console.log(
    `\n🧪 Testing check-username-availability with username: "${username}"`,
  );
  console.log('─'.repeat(60));

  const token = await getAuthToken();

  try {
    const { data, error } = await supabase.functions.invoke(
      'check-username-availability',
      {
        body: { username },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      if (error.context) {
        console.error('   Context:', JSON.stringify(error.context, null, 2));
      }

      // Try to get more details by making a direct fetch call
      console.log('\n📡 Attempting direct fetch for more details...');
      try {
        const functionUrl = `${supabaseUrl}/functions/v1/check-username-availability`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ username }),
        });

        const responseText = await response.text();
        console.log(
          `   HTTP Status: ${response.status} ${response.statusText}`,
        );
        console.log('   Response body:', responseText);

        try {
          const responseJson = JSON.parse(responseText);
          console.log(
            '   Parsed response:',
            JSON.stringify(responseJson, null, 2),
          );
        } catch (e) {
          // Not JSON, that's okay
        }
      } catch (fetchError) {
        console.error('   Direct fetch failed:', fetchError.message);
      }
      return;
    }

    console.log('✅ Success!');
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.error('   Stack:', err.stack);
  }
}

async function testStartTrial() {
  console.log(`\n🧪 Testing start-user-trial`);
  console.log('─'.repeat(60));

  const token = await getAuthToken();

  try {
    const { data, error } = await supabase.functions.invoke(
      'start-user-trial',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      if (error.context) {
        console.error('   Context:', JSON.stringify(error.context, null, 2));
      }

      // Try to get more details by making a direct fetch call
      console.log('\n📡 Attempting direct fetch for more details...');
      try {
        const functionUrl = `${supabaseUrl}/functions/v1/start-user-trial`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: supabaseAnonKey,
          },
        });

        const responseText = await response.text();
        console.log(
          `   HTTP Status: ${response.status} ${response.statusText}`,
        );
        console.log('   Response body:', responseText);

        try {
          const responseJson = JSON.parse(responseText);
          console.log(
            '   Parsed response:',
            JSON.stringify(responseJson, null, 2),
          );
        } catch (e) {
          // Not JSON, that's okay
        }
      } catch (fetchError) {
        console.error('   Direct fetch failed:', fetchError.message);
      }
      return;
    }

    console.log('✅ Success!');
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    console.error('   Stack:', err.stack);
  }
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

console.log('='.repeat(60));
console.log('EDGE FUNCTIONS TEST');
console.log('='.repeat(60));

if (command === 'check-username') {
  if (!arg) {
    console.error(
      '❌ Usage: node scripts/test-edge-functions.js check-username <username>',
    );
    process.exit(1);
  }
  testCheckUsername(arg).catch(console.error);
} else if (command === 'start-trial') {
  testStartTrial().catch(console.error);
} else {
  console.error('❌ Unknown command:', command);
  console.error('\nAvailable commands:');
  console.error(
    '  check-username <username>  - Test username availability check',
  );
  console.error('  start-trial                - Test trial start');
  process.exit(1);
}
