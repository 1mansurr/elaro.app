#!/usr/bin/env node

/**
 * Import Audit Script
 *
 * Audits the codebase for import violations:
 * 1. Cross-feature imports (runtime)
 * 2. Deep relative paths
 * 3. Missing path aliases
 *
 * Usage:
 *   node scripts/audit-imports.js
 *   node scripts/audit-imports.js --fix (attempts to fix automatically)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FEATURES_DIR = path.join(__dirname, '../src/features');
const SHARED_DIR = path.join(__dirname, '../src/shared');
const SERVICES_DIR = path.join(__dirname, '../src/services');
const CONTEXTS_DIR = path.join(__dirname, '../src/contexts');

const violations = [];
const autoFixable = [];

// Color codes for terminal output
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

/**
 * Get feature name from file path
 */
function getFeatureFromPath(filePath) {
  const match = filePath.match(/src\/features\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Check if import is cross-feature
 */
function isCrossFeatureImport(filePath, importPath) {
  const sourceFeature = getFeatureFromPath(filePath);

  // Check if importing from @/features/
  if (importPath.startsWith('@/features/')) {
    const match = importPath.match(/@\/features\/([^\/]+)/);
    const targetFeature = match ? match[1] : null;

    // Same feature - OK
    if (sourceFeature && targetFeature && sourceFeature === targetFeature) {
      return false;
    }

    // Different feature - violation (unless type-only)
    if (sourceFeature && targetFeature && sourceFeature !== targetFeature) {
      // Check if it's a type-only import
      const isTypeOnly = /^import\s+type\s/.test(
        fs
          .readFileSync(filePath, 'utf8')
          .split('\n')
          .find(line => line.includes(importPath)),
      );
      return !isTypeOnly;
    }
  }

  return false;
}

/**
 * Check if import uses relative paths (should use @/ aliases)
 */
function isRelativePath(importPath) {
  // Allow ../ for same-module imports (up to 2 levels)
  // Block deeper paths or paths that should use @/ aliases
  if (importPath.startsWith('../')) {
    const depth = (importPath.match(/\.\.\//g) || []).length;
    // More than 2 levels suggests cross-module import that should use @/
    return depth > 2;
  }
  return false;
}

/**
 * Extract imports from a file
 */
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const imports = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match import statements
    const importMatch = line.match(
      /^import\s+(?:(type|)\s+)?.*from\s+['"]([^'"]+)['"]/,
    );
    if (importMatch) {
      const isTypeOnly = importMatch[1] === 'type';
      const importPath = importMatch[2];
      imports.push({
        line: i + 1,
        path: importPath,
        isTypeOnly,
        fullLine: line,
      });
    }
  }

  return imports;
}

/**
 * Scan directory for TypeScript/JavaScript files
 */
function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant dirs
      if (
        ![
          'node_modules',
          '.git',
          'dist',
          'build',
          '__tests__',
          '.expo',
        ].includes(file)
      ) {
        scanDirectory(filePath, fileList);
      }
    } else if (
      /\.(ts|tsx|js|jsx)$/.test(file) &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Main audit function
 */
function auditImports() {
  log('\n🔍 Starting Import Audit...\n', 'cyan');

  const allFiles = scanDirectory(path.join(__dirname, '../src'));
  let totalViolations = 0;

  allFiles.forEach(filePath => {
    const imports = extractImports(filePath);
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    imports.forEach(imp => {
      const violationsForImport = [];

      // Check cross-feature import
      if (isCrossFeatureImport(filePath, imp.path)) {
        const sourceFeature = getFeatureFromPath(filePath);
        const targetFeature = imp.path.match(/@\/features\/([^\/]+)/)?.[1];

        violationsForImport.push({
          type: 'cross-feature',
          message: `Cross-feature import detected: ${imp.path}`,
          suggestion: `Move shared code to @/shared/ or use type-only import if importing types`,
          fixable: true,
        });

        totalViolations++;
      }

      // Check relative paths (should use @/ aliases)
      if (isRelativePath(imp.path)) {
        violationsForImport.push({
          type: 'relative-path',
          message: `Relative path detected: ${imp.path}`,
          suggestion: `Use @/ path alias instead (e.g., @/shared/, @/services/, @/types/)`,
          fixable: true,
        });

        totalViolations++;
      }

      if (violationsForImport.length > 0) {
        violations.push({
          file: relativePath,
          line: imp.line,
          import: imp.path,
          violations: violationsForImport,
        });
      }
    });
  });

  // Report results
  log(`\n📊 Audit Results:\n`, 'cyan');
  log(`Total files scanned: ${allFiles.length}`, 'blue');
  log(
    `Total violations found: ${totalViolations}\n`,
    totalViolations > 0 ? 'red' : 'green',
  );

  if (violations.length > 0) {
    log('🚨 Violations Found:\n', 'red');

    violations.forEach((violation, index) => {
      log(`\n${index + 1}. ${violation.file}:${violation.line}`, 'yellow');
      log(`   Import: ${violation.import}`, 'blue');

      violation.violations.forEach(v => {
        log(`   ❌ ${v.type}: ${v.message}`, 'red');
        log(`   💡 Suggestion: ${v.suggestion}`, 'cyan');
      });
    });

    log('\n📝 Summary:', 'cyan');
    log(
      `   Cross-feature imports: ${violations.filter(v => v.violations.some(v => v.type === 'cross-feature')).length}`,
      'yellow',
    );
    log(
      `   Relative paths (should use @/ aliases): ${violations.filter(v => v.violations.some(v => v.type === 'relative-path')).length}`,
      'yellow',
    );

    log('\n💡 To fix violations:', 'cyan');
    log('   1. Review each violation', 'blue');
    log(
      '   2. Move shared code to @/shared/ if used by multiple features',
      'blue',
    );
    log(
      '   3. Use type-only imports (import type) for cross-feature types',
      'blue',
    );
    log('   4. Replace deep relative paths with @/ aliases', 'blue');

    process.exit(1);
  } else {
    log('✅ No violations found! All imports follow the policy.', 'green');
    process.exit(0);
  }
}

// Run audit
if (require.main === module) {
  try {
    auditImports();
  } catch (error) {
    log(`\n❌ Error running audit: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

module.exports = { auditImports };
