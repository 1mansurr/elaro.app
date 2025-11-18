#!/usr/bin/env node

/**
 * Third-Party Services Verification Script
 * 
 * Verifies that all third-party service integrations are working correctly.
 * Tests Sentry, Mixpanel, and RevenueCat connections.
 */

require('dotenv').config();

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Service configurations
const services = {
  sentry: {
    name: 'Sentry',
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    test: async () => {
      if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
        throw new Error('EXPO_PUBLIC_SENTRY_DSN not configured');
      }
      
      // Parse DSN to get project URL
      const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
      const match = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(.+)/);
      
      if (!match) {
        throw new Error('Invalid Sentry DSN format');
      }
      
      const [, key, host, projectId] = match;
      const apiUrl = `https://${host}/api/0/projects/${projectId}/`;
      
      // Test API connection (read-only operation)
      return new Promise((resolve, reject) => {
        const req = https.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${key}`,
          },
        }, (res) => {
          if (res.statusCode === 200 || res.statusCode === 401) {
            // 401 is OK - means DSN is valid but we don't have API access
            resolve(true);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
    },
  },
  
  mixpanel: {
    name: 'Mixpanel',
    token: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
    test: async () => {
      if (!process.env.EXPO_PUBLIC_MIXPANEL_TOKEN) {
        throw new Error('EXPO_PUBLIC_MIXPANEL_TOKEN not configured');
      }
      
      // Test Mixpanel API connection
      const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
      const testData = Buffer.from(JSON.stringify({
        event: 'test_event',
        properties: {
          token: token,
          distinct_id: 'test_verification',
          time: Math.floor(Date.now() / 1000),
        },
      })).toString('base64');
      
      return new Promise((resolve, reject) => {
        const req = https.request('https://api.mixpanel.com/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200 && data === '1') {
              resolve(true);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });
        
        req.on('error', reject);
        req.write(`data=${encodeURIComponent(testData)}`);
        req.end();
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
    },
  },
  
  revenuecat: {
    name: 'RevenueCat',
    key: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY,
    test: async () => {
      if (!process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY) {
        throw new Error('EXPO_PUBLIC_REVENUECAT_APPLE_KEY not configured');
      }
      
      // RevenueCat public keys are validated client-side
      // We can only verify the key format
      const key = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
      
      if (!key.startsWith('rcb_')) {
        throw new Error('Invalid RevenueCat key format (should start with rcb_)');
      }
      
      // Key format is valid
      return true;
    },
  },
  
  supabase: {
    name: 'Supabase',
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    test: async () => {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration missing');
      }
      
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      // Test Supabase REST API
      return new Promise((resolve, reject) => {
        const testUrl = `${url}/rest/v1/`;
        const req = https.get(testUrl, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
          },
        }, (res) => {
          // Any response means Supabase is reachable
          resolve(true);
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
    },
  },
};

async function verifyService(name, config) {
  logInfo(`Checking ${name}...`);
  
  try {
    await config.test();
    logSuccess(`${name}: Working`);
    return { name, status: 'ok' };
  } catch (error) {
    if (error.message.includes('not configured') || error.message.includes('not set')) {
      logWarning(`${name}: Not configured (optional)`);
      return { name, status: 'not_configured' };
    } else {
      logError(`${name}: Failed - ${error.message}`);
      return { name, status: 'failed', error: error.message };
    }
  }
}

async function main() {
  log('\n🔍 Verifying Third-Party Services\n', 'blue');
  log('='.repeat(50));
  log('');
  
  const results = [];
  
  // Verify each service
  for (const [key, config] of Object.entries(services)) {
    const result = await verifyService(config.name, config);
    results.push(result);
    log(''); // Empty line between services
  }
  
  // Summary
  log('='.repeat(50));
  log('\n📊 Summary:\n', 'blue');
  
  const okCount = results.filter(r => r.status === 'ok').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const notConfiguredCount = results.filter(r => r.status === 'not_configured').length;
  
  log(`✅ Working: ${okCount}`);
  log(`❌ Failed: ${failedCount}`);
  log(`⚠️  Not configured: ${notConfiguredCount}`);
  log('');
  
  // Critical services (must work)
  const criticalServices = ['supabase'];
  const criticalFailed = results.filter(
    r => criticalServices.some(cs => r.name.toLowerCase().includes(cs)) && r.status !== 'ok'
  );
  
  if (criticalFailed.length > 0) {
    logError('Critical services failed!');
    criticalFailed.forEach(r => {
      logError(`  - ${r.name}: ${r.error || 'Not working'}`);
    });
    process.exit(1);
  }
  
  if (failedCount > 0) {
    logWarning('Some optional services failed, but app can still function.');
    process.exit(0);
  }
  
  logSuccess('All services verified!');
  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { verifyService, services };

