#!/usr/bin/env node

/**
 * Pre-Launch Checklist Script
 *
 * Runs all verification checks before beta launch:
 * - Test coverage verification
 * - Edge Functions verification
 * - Third-party services verification
 * - Security audit
 * - Performance checks
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(title, 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
}

// Check results
const results = {
  testCoverage: { passed: false, message: '' },
  edgeFunctions: { passed: false, message: '' },
  services: { passed: false, message: '' },
  security: { passed: false, message: '' },
  linting: { passed: false, message: '' },
  typeCheck: { passed: false, message: '' },
};

// Run a command and return result
function runCommand(command, description) {
  try {
    logInfo(`Running: ${description}...`);
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.message,
      error: error.stderr || error.message,
    };
  }
}

// Check test coverage
function checkTestCoverage() {
  logSection('1. Test Coverage Verification');

  // Check if coverage report exists
  const coveragePath = path.join(
    process.cwd(),
    'coverage',
    'coverage-summary.json',
  );
  if (!fs.existsSync(coveragePath)) {
    logWarning('Coverage report not found. Running tests with coverage...');
    const result = runCommand(
      'npm run test:coverage',
      'Generate coverage report',
    );
    if (!result.success) {
      results.testCoverage = {
        passed: false,
        message: 'Failed to generate coverage report',
      };
      return;
    }
  }

  // Check coverage thresholds
  const result = runCommand(
    'npm run test:coverage:check',
    'Check coverage thresholds',
  );
  if (result.success) {
    logSuccess('Test coverage meets requirements');
    results.testCoverage = { passed: true, message: 'Coverage thresholds met' };
  } else {
    logError('Test coverage below thresholds');
    results.testCoverage = {
      passed: false,
      message: result.output || 'Coverage check failed',
    };
  }
}

// Check Edge Functions
function checkEdgeFunctions() {
  logSection('2. Edge Functions Verification');

  // Check if Supabase CLI is available
  try {
    execSync('which supabase', { stdio: 'ignore' });
  } catch (error) {
    logWarning('Supabase CLI not found. Skipping Edge Functions check.');
    logInfo('Install with: npm install -g supabase');
    results.edgeFunctions = {
      passed: false,
      message: 'Supabase CLI not installed',
    };
    return;
  }

  const result = runCommand(
    'npm run verify:edge-functions',
    'Verify Edge Functions',
  );
  if (result.success) {
    logSuccess('All Edge Functions are deployed');
    results.edgeFunctions = { passed: true, message: 'All functions deployed' };
  } else {
    logError('Some Edge Functions are missing');
    results.edgeFunctions = {
      passed: false,
      message: result.output || 'Verification failed',
    };
  }
}

// Check third-party services
function checkServices() {
  logSection('3. Third-Party Services Verification');

  const result = runCommand(
    'npm run verify:services',
    'Verify third-party services',
  );
  if (result.success) {
    logSuccess('All services verified');
    results.services = { passed: true, message: 'All services working' };
  } else {
    logError('Some services failed verification');
    results.services = {
      passed: false,
      message: result.output || 'Verification failed',
    };
  }
}

// Check security
function checkSecurity() {
  logSection('4. Security Audit');

  // Check for secrets in code
  const secretsResult = runCommand('npm run audit-secrets', 'Audit secrets');
  if (secretsResult.success) {
    logSuccess('No secrets found in code');
  } else {
    logWarning('Secrets audit found issues');
  }

  // Check for vulnerable dependencies
  const auditResult = runCommand(
    'npm audit --audit-level=moderate',
    'Audit dependencies',
  );
  if (auditResult.success) {
    logSuccess('No critical vulnerabilities found');
    results.security = { passed: true, message: 'Security audit passed' };
  } else {
    logWarning('Some vulnerabilities found');
    results.security = { passed: false, message: 'Vulnerabilities detected' };
  }
}

// Check linting
function checkLinting() {
  logSection('5. Code Quality - Linting');

  const result = runCommand('npm run lint', 'Run linter');
  if (result.success) {
    logSuccess('Linting passed');
    results.linting = { passed: true, message: 'No linting errors' };
  } else {
    logError('Linting failed');
    results.linting = { passed: false, message: 'Linting errors found' };
  }
}

// Check TypeScript
function checkTypeScript() {
  logSection('6. Code Quality - Type Checking');

  // Check if TypeScript is configured
  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    logWarning('TypeScript not configured. Skipping type check.');
    results.typeCheck = { passed: true, message: 'TypeScript not configured' };
    return;
  }

  const result = runCommand('npx tsc --noEmit', 'Type check');
  if (result.success) {
    logSuccess('Type checking passed');
    results.typeCheck = { passed: true, message: 'No type errors' };
  } else {
    logError('Type checking failed');
    results.typeCheck = { passed: false, message: 'Type errors found' };
  }
}

// Generate summary
function generateSummary() {
  logSection('Pre-Launch Check Summary');

  const allChecks = [
    { name: 'Test Coverage', result: results.testCoverage },
    { name: 'Edge Functions', result: results.edgeFunctions },
    { name: 'Third-Party Services', result: results.services },
    { name: 'Security Audit', result: results.security },
    { name: 'Linting', result: results.linting },
    { name: 'Type Checking', result: results.typeCheck },
  ];

  let allPassed = true;

  allChecks.forEach(({ name, result }) => {
    if (result.passed) {
      logSuccess(`${name}: PASSED`);
    } else {
      logError(`${name}: FAILED - ${result.message}`);
      allPassed = false;
    }
  });

  log('\n' + '='.repeat(60), 'cyan');

  if (allPassed) {
    logSuccess('\n🎉 All pre-launch checks passed! Ready for beta launch.');
    process.exit(0);
  } else {
    logError('\n⚠️  Some checks failed. Please fix issues before beta launch.');
    logInfo('\nReview the errors above and fix them before proceeding.');
    process.exit(1);
  }
}

// Main execution
async function main() {
  log('\n🚀 Pre-Launch Checklist\n', 'cyan');
  log('Running all verification checks before beta launch...\n', 'blue');

  try {
    checkTestCoverage();
    checkEdgeFunctions();
    checkServices();
    checkSecurity();
    checkLinting();
    checkTypeScript();
    generateSummary();
  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, results };
