#!/usr/bin/env node

/**
 * Native Dependencies Validation Script
 *
 * Validates that native dependencies (Sentry, RevenueCat) are properly
 * configured before building the app.
 */

const fs = require('fs');
const path = require('path');

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

function checkPackageInstalled(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch (e) {
    return false;
  }
}

function checkPodfileExists() {
  const podfilePath = path.join(__dirname, '..', 'ios', 'Podfile');
  return fs.existsSync(podfilePath);
}

function checkPodfileLockExists() {
  const lockPath = path.join(__dirname, '..', 'ios', 'Podfile.lock');
  return fs.existsSync(lockPath);
}

function validateSentry() {
  log('\n🔍 Validating Sentry...', 'blue');

  const isInstalled = checkPackageInstalled('@sentry/react-native');
  if (!isInstalled) {
    log('  ⚠️  @sentry/react-native not found in node_modules', 'yellow');
    log('  💡 Run: npm install', 'yellow');
    return false;
  }

  log('  ✅ @sentry/react-native package found', 'green');

  // Check if Sentry can be required
  try {
    require('@sentry/react-native');
    log('  ✅ Sentry module can be imported', 'green');
  } catch (e) {
    log(`  ❌ Sentry import failed: ${e.message}`, 'red');
    return false;
  }

  return true;
}

function validateRevenueCat() {
  log('\n🔍 Validating RevenueCat...', 'blue');

  const isInstalled = checkPackageInstalled('react-native-purchases');
  if (!isInstalled) {
    log('  ⚠️  react-native-purchases not found in node_modules', 'yellow');
    log('  💡 Run: npm install', 'yellow');
    return false;
  }

  log('  ✅ react-native-purchases package found', 'green');

  // Check if RevenueCat can be required
  try {
    require('react-native-purchases');
    log('  ✅ RevenueCat module can be imported', 'green');
  } catch (e) {
    log(
      `  ⚠️  RevenueCat import failed (may need pod install): ${e.message}`,
      'yellow',
    );
    return false;
  }

  return true;
}

function validateIOSSetup() {
  log('\n🔍 Validating iOS setup...', 'blue');

  if (!checkPodfileExists()) {
    log('  ⚠️  Podfile not found', 'yellow');
    log('  💡 Run: npx expo prebuild --platform ios', 'yellow');
    return false;
  }

  log('  ✅ Podfile exists', 'green');

  if (!checkPodfileLockExists()) {
    log('  ⚠️  Podfile.lock not found', 'yellow');
    log('  💡 Run: cd ios && pod install', 'yellow');
    return false;
  }

  log('  ✅ Podfile.lock exists', 'green');

  return true;
}

function validateEnvironmentVariables() {
  log('\n🔍 Validating environment variables...', 'blue');

  // Try to load .env file if dotenv is available
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv not available, continue without it
  }

  const requiredVars = {
    EXPO_PUBLIC_SENTRY_DSN: 'Sentry DSN (optional but recommended)',
    EXPO_PUBLIC_REVENUECAT_APPLE_KEY:
      'RevenueCat Apple API Key (required for iOS)',
  };

  let allPresent = true;

  for (const [varName, description] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    if (!value) {
      log(`  ⚠️  ${varName} not set - ${description}`, 'yellow');
      if (varName.includes('REVENUECAT')) {
        allPresent = false;
      }
    } else {
      log(`  ✅ ${varName} is set`, 'green');
    }
  }

  return allPresent;
}

// Main validation
async function main() {
  log('🚀 Starting native dependencies validation...\n', 'blue');

  const results = {
    sentry: validateSentry(),
    revenueCat: validateRevenueCat(),
    iosSetup: validateIOSSetup(),
    envVars: validateEnvironmentVariables(),
  };

  log('\n📊 Validation Summary:', 'blue');
  log(
    `  Sentry: ${results.sentry ? '✅' : '❌'}`,
    results.sentry ? 'green' : 'red',
  );
  log(
    `  RevenueCat: ${results.revenueCat ? '✅' : '⚠️ '}`,
    results.revenueCat ? 'green' : 'yellow',
  );
  log(
    `  iOS Setup: ${results.iosSetup ? '✅' : '⚠️ '}`,
    results.iosSetup ? 'green' : 'yellow',
  );
  log(
    `  Environment Variables: ${results.envVars ? '✅' : '⚠️ '}`,
    results.envVars ? 'green' : 'yellow',
  );

  const allCritical = results.sentry && results.revenueCat;
  const allOptional = results.iosSetup && results.envVars;

  if (allCritical) {
    log('\n✅ All critical dependencies validated successfully!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some dependencies have issues. Build may fail.', 'yellow');
    log('   Review warnings above and fix before building.', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Validation script error: ${error.message}`, 'red');
  process.exit(1);
});

