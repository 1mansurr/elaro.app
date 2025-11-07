#!/usr/bin/env node

/**
 * Security Audit Script: Check for Exposed Server Secrets
 *
 * This script audits the codebase to ensure no server-side secrets
 * are accidentally exposed to the client.
 */

const fs = require('fs');
const path = require('path');

// Server-only secrets that should NEVER be in EXPO_PUBLIC_*
const SERVER_ONLY_SECRETS = [
  'SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'REVENUECAT_API_KEY',
  'REVENUECAT_SECRET',
  'REVENUECAT_AUTH_HEADER_SECRET',
  'ENCRYPTION_KEY',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'TAWK_TO_API_KEY',
  'APPLE_PRIVATE_KEY',
  'PRIVATE_KEY',
  'SECRET_KEY',
  'API_SECRET',
  'WEBHOOK_SECRET',
];

// Safe public variables (these are OK to expose)
const SAFE_PUBLIC_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY', // Anon key is safe (it's meant to be public)
  'EXPO_PUBLIC_REVENUECAT_APPLE_KEY', // Public key is safe
  'EXPO_PUBLIC_SENTRY_DSN', // Public DSN is safe
  'EXPO_PUBLIC_MIXPANEL_TOKEN', // Public token is safe
  'EXPO_PUBLIC_APP_NAME',
  'EXPO_PUBLIC_APP_VERSION',
  'EXPO_PUBLIC_IOS_BUILD_NUMBER',
  'EXPO_PUBLIC_ANDROID_VERSION_CODE',
];

/**
 * Check if a variable name contains a server secret pattern
 */
function isServerSecret(varName) {
  const upperVar = varName.toUpperCase();
  return SERVER_ONLY_SECRETS.some(secret => upperVar.includes(secret));
}

/**
 * Check if a variable is safe to expose
 */
function isSafePublicVar(varName) {
  return SAFE_PUBLIC_VARS.includes(varName);
}

/**
 * Read app.config.js and extract EXPO_PUBLIC_* variables
 */
function auditAppConfig() {
  console.log('\n🔍 Auditing app.config.js for exposed variables...\n');

  const configPath = path.join(__dirname, '..', 'app.config.js');

  if (!fs.existsSync(configPath)) {
    console.error('❌ app.config.js not found');
    return [];
  }

  const content = fs.readFileSync(configPath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  const safeVars = [];

  // Find all EXPO_PUBLIC_* variables
  const expoPublicPattern = /EXPO_PUBLIC_\w+/g;
  const matches = content.match(expoPublicPattern) || [];

  matches.forEach(varName => {
    if (isSafePublicVar(varName)) {
      safeVars.push(varName);
    } else if (isServerSecret(varName)) {
      issues.push({
        type: 'CRITICAL',
        file: 'app.config.js',
        variable: varName,
        message: `CRITICAL: ${varName} appears to be a server secret but is exposed as EXPO_PUBLIC_*`,
      });
    } else {
      // Unknown variable - warn but don't fail
      console.warn(
        `⚠️  Unknown EXPO_PUBLIC variable: ${varName} (verify this is safe to expose)`,
      );
    }
  });

  console.log('✅ Safe public variables found:');
  safeVars.forEach(v => console.log(`   - ${v}`));

  return issues;
}

/**
 * Search source files for potential secret exposure
 */
function auditSourceFiles() {
  console.log('\n🔍 Auditing source files for secret patterns...\n');

  const srcPath = path.join(__dirname, '..', 'src');
  const issues = [];

  if (!fs.existsSync(srcPath)) {
    console.warn('⚠️  src/ directory not found');
    return issues;
  }

  // Patterns that might indicate secret exposure
  const secretPatterns = [
    /process\.env\.SUPABASE_SERVICE_ROLE_KEY/i,
    /process\.env\.REVENUECAT_API_KEY/i,
    /process\.env\.ENCRYPTION_KEY/i,
    /process\.env\.RESEND_API_KEY/i,
    /process\.env\.CRON_SECRET/i,
    /Constants\.expoConfig\?\.extra\?\.SERVICE_ROLE/i,
    /Constants\.expoConfig\?\.extra\?\.SECRET/i,
  ];

  function searchDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, build directories, etc.
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build'
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        searchDirectory(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');

        secretPatterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            const lineNumber = content
              .substring(0, content.indexOf(matches[0]))
              .split('\n').length;
            issues.push({
              type: 'CRITICAL',
              file: path.relative(__dirname + '/..', fullPath),
              line: lineNumber,
              pattern: pattern.toString(),
              message: `CRITICAL: Potential server secret exposure in client code`,
            });
          }
        });
      }
    }
  }

  searchDirectory(srcPath);

  return issues;
}

/**
 * Check Edge Functions use Deno.env.get() correctly
 */
function auditEdgeFunctions() {
  console.log('\n🔍 Auditing Edge Functions for proper secret usage...\n');

  const functionsPath = path.join(__dirname, '..', 'supabase', 'functions');
  const issues = [];

  if (!fs.existsSync(functionsPath)) {
    console.warn('⚠️  supabase/functions directory not found');
    return issues;
  }

  function searchDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        searchDirectory(fullPath);
      } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Check for process.env usage (should use Deno.env.get() instead)
        if (content.includes('process.env') && !fullPath.includes('_shared')) {
          const lineNumber = (content.match(/process\.env/g) || []).length;
          issues.push({
            type: 'WARNING',
            file: path.relative(__dirname + '/..', fullPath),
            message:
              'Edge Functions should use Deno.env.get() instead of process.env',
          });
        }
      }
    }
  }

  searchDirectory(functionsPath);

  return issues;
}

/**
 * Main audit function
 */
function runAudit() {
  console.log('='.repeat(60));
  console.log('SECURITY AUDIT: Server Secret Exposure Check');
  console.log('='.repeat(60));

  const appConfigIssues = auditAppConfig();
  const sourceIssues = auditSourceFiles();
  const edgeFunctionIssues = auditEdgeFunctions();

  const allIssues = [...appConfigIssues, ...sourceIssues];
  const allWarnings = [...edgeFunctionIssues];

  console.log('\n' + '='.repeat(60));
  console.log('AUDIT RESULTS');
  console.log('='.repeat(60));

  if (allIssues.length === 0 && allWarnings.length === 0) {
    console.log('\n✅ No security issues found!');
    console.log('   All exposed variables are safe for client-side use.');
    process.exit(0);
  }

  if (allIssues.length > 0) {
    console.log('\n❌ CRITICAL ISSUES FOUND:');
    allIssues.forEach((issue, index) => {
      console.log(
        `\n${index + 1}. ${issue.type}: ${issue.variable || issue.pattern}`,
      );
      console.log(`   File: ${issue.file}`);
      if (issue.line) console.log(`   Line: ${issue.line}`);
      console.log(`   ${issue.message}`);
      console.log(
        '   💡 Action: Move this secret to Edge Functions environment variables',
      );
    });
  }

  if (allWarnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    allWarnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${warning.file}`);
      console.log(`   ${warning.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log(
    '1. All server secrets should use Deno.env.get() in Edge Functions',
  );
  console.log('2. Never use EXPO_PUBLIC_* prefix for server secrets');
  console.log(
    '3. Store server secrets in Supabase Dashboard → Edge Functions → Secrets',
  );
  console.log('4. Review the SECURITY_BOUNDARIES.md document for guidelines');

  process.exit(allIssues.length > 0 ? 1 : 0);
}

// Run audit
runAudit();
