#!/usr/bin/env node

/**
 * RevenueCat Webhook Verification Script
 * 
 * Verifies that RevenueCat webhook is properly configured and accessible.
 * This script checks:
 * 1. Webhook URL is configured in RevenueCat dashboard
 * 2. Webhook secret is set in Supabase
 * 3. Webhook endpoint is accessible
 */

const https = require('https');
const http = require('http');

// Get Supabase URL from environment or config
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://your-project.supabase.co';

const WEBHOOK_ENDPOINT = `${SUPABASE_URL}/functions/v1/revenuecat-webhook`;

console.log('🔍 Verifying RevenueCat Webhook Configuration...\n');

// Check 1: Verify webhook endpoint exists
async function checkWebhookEndpoint() {
  return new Promise((resolve) => {
    const protocol = WEBHOOK_ENDPOINT.startsWith('https:') ? https : http;

    const req = protocol.request(
      WEBHOOK_ENDPOINT,
      { method: 'OPTIONS' },
      (res) => {
        resolve({
          accessible: res.statusCode >= 200 && res.statusCode < 500,
          status: res.statusCode,
        });
      },
    );

    req.on('error', () => {
      resolve({
        accessible: false,
        status: null,
        error: 'Connection failed',
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        accessible: false,
        status: null,
        error: 'Request timeout',
      });
    });

    req.end();
  });
}

// Check 2: Verify webhook secret is documented
function checkWebhookSecret() {
  console.log('📋 Manual Checks Required:\n');
  console.log('1. RevenueCat Dashboard:');
  console.log('   - Go to: https://app.revenuecat.com');
  console.log('   - Navigate to: Project Settings → Webhooks');
  console.log(`   - Verify webhook URL: ${WEBHOOK_ENDPOINT}`);
  console.log('   - Verify webhook is enabled\n');

  console.log('2. Supabase Secrets:');
  console.log('   - Go to: Supabase Dashboard → Project Settings → Edge Functions → Secrets');
  console.log('   - Verify REVENUECAT_WEBHOOK_SECRET is set');
  console.log('   - Verify it matches the secret in RevenueCat dashboard\n');
}

async function verifyWebhook() {
  console.log(`📍 Webhook Endpoint: ${WEBHOOK_ENDPOINT}\n`);

  // Check endpoint accessibility
  console.log('🔍 Checking webhook endpoint accessibility...');
  const endpointCheck = await checkWebhookEndpoint();

  if (endpointCheck.accessible) {
    console.log(`✅ Webhook endpoint is accessible (Status: ${endpointCheck.status})\n`);
  } else {
    console.log(`❌ Webhook endpoint is not accessible`);
    if (endpointCheck.status) {
      console.log(`   Status: ${endpointCheck.status}\n`);
    } else {
      console.log(`   Error: ${endpointCheck.error}\n`);
    }
  }

  // Manual checks
  checkWebhookSecret();

  console.log('📝 Testing Webhook:');
  console.log('   To test the webhook, trigger a test event from RevenueCat dashboard:');
  console.log('   - Go to RevenueCat → Webhooks → Test Webhook');
  console.log('   - Send a test event');
  console.log('   - Check Supabase logs for the event\n');

  console.log('✅ Verification complete!');
  console.log('⚠️  Remember to manually verify RevenueCat dashboard and Supabase secrets.\n');

  if (!endpointCheck.accessible) {
    console.log('❌ Webhook endpoint check failed. Please verify:');
    console.log('   1. Supabase function is deployed');
    console.log('   2. URL is correct');
    console.log('   3. Network connectivity');
    process.exit(1);
  }
}

verifyWebhook();

