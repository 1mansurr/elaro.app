#!/usr/bin/env node

/**
 * Connectivity Test Script
 * Tests database and edge function connectivity
 */

require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthCheck() {
  log('\n=== Testing Health Check Endpoint ===', 'blue');
  
  if (!SUPABASE_URL || !ANON_KEY) {
    log('❌ Missing SUPABASE_URL or ANON_KEY', 'red');
    return false;
  }

  const healthCheckUrl = `${SUPABASE_URL}/functions/v1/health-check`;
  
  try {
    log(`Testing: ${healthCheckUrl}`, 'blue');
    
    const response = await fetch(healthCheckUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      log('✅ Health check passed', 'green');
      log(`Status: ${data.status}`, 'green');
      log(`Checks: ${JSON.stringify(data.checks, null, 2)}`, 'green');
      return true;
    } else {
      log(`❌ Health check failed: ${response.status}`, 'red');
      log(`Response: ${JSON.stringify(data, null, 2)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
    log('This may indicate the function is not deployed', 'yellow');
    return false;
  }
}

async function testDatabaseConnection() {
  log('\n=== Testing Database Connection ===', 'blue');
  
  if (!SUPABASE_URL || !ANON_KEY) {
    log('❌ Missing SUPABASE_URL or ANON_KEY', 'red');
    return false;
  }

  const restUrl = `${SUPABASE_URL}/rest/v1/users?select=id&limit=1`;
  
  try {
    log(`Testing: ${restUrl}`, 'blue');
    
    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Even if we get 401/403, it means the database is reachable
    if (response.status === 200 || response.status === 401 || response.status === 403) {
      log('✅ Database connection successful', 'green');
      log(`Status: ${response.status}`, 'green');
      return true;
    } else {
      log(`⚠️  Unexpected status: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Database connection error: ${error.message}`, 'red');
    return false;
  }
}

async function testProjectConfiguration() {
  log('\n=== Testing Project Configuration ===', 'blue');
  
  const fs = require('fs');
  const path = require('path');
  
  const configPath = path.join(__dirname, '../supabase/config.toml');
  const projectRef = 'alqpwhrsxmetwbtxuihv';
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const configRef = configContent.match(/project_id\s*=\s*"([^"]+)"/)?.[1];
    
    if (configRef) {
      log(`Project Reference from config: ${configRef}`, 'blue');
    }
    
    if (SUPABASE_URL && SUPABASE_URL.includes(projectRef)) {
      log('✅ Supabase URL matches project reference', 'green');
      log(`Project Reference: ${projectRef}`, 'green');
      log(`URL: ${SUPABASE_URL}`, 'green');
      return true;
    } else {
      log('❌ Supabase URL does not match project reference', 'red');
      log(`Expected: https://${projectRef}.supabase.co`, 'yellow');
      log(`Actual: ${SUPABASE_URL}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`⚠️  Could not read config.toml: ${error.message}`, 'yellow');
    // Still check URL
    if (SUPABASE_URL && SUPABASE_URL.includes(projectRef)) {
      log('✅ Supabase URL matches project reference', 'green');
      return true;
    }
    return false;
  }
}

async function main() {
  log('============================================================================', 'blue');
  log('CONNECTIVITY TEST', 'blue');
  log('============================================================================', 'blue');
  
  const results = {
    healthCheck: false,
    database: false,
    configuration: false,
  };

  results.configuration = await testProjectConfiguration();
  results.database = await testDatabaseConnection();
  results.healthCheck = await testHealthCheck();

  log('\n============================================================================', 'blue');
  log('SUMMARY', 'blue');
  log('============================================================================', 'blue');
  
  log(`Configuration: ${results.configuration ? '✅ PASS' : '❌ FAIL'}`, results.configuration ? 'green' : 'red');
  log(`Database: ${results.database ? '✅ PASS' : '❌ FAIL'}`, results.database ? 'green' : 'red');
  log(`Health Check: ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`, results.healthCheck ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(r => r);
  
  log('\n============================================================================', 'blue');
  if (allPassed) {
    log('✅ ALL TESTS PASSED', 'green');
    process.exit(0);
  } else {
    log('⚠️  SOME TESTS FAILED', 'yellow');
    log('Review the output above for details', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

