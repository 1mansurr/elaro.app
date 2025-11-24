#!/usr/bin/env node

/**
 * Feature Structure Validation Script
 *
 * Validates that all features follow the standard directory structure.
 *
 * Usage:
 *   node scripts/validate-feature-structure.js
 *   node scripts/validate-feature-structure.js --fix (attempts to suggest fixes)
 */

const fs = require('fs');
const path = require('path');

const FEATURES_DIR = path.join(__dirname, '../src/features');
const STANDARD_DIRS = [
  'components',
  'screens',
  'services',
  'hooks',
  'contexts',
  'types',
  'utils',
  '__tests__',
];
const REQUIRED_INDEX_FILES = [
  'components',
  'screens',
  'services',
  'hooks',
  'contexts',
];

const violations = [];
const warnings = [];
const fixes = [];

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
 * Get all feature directories
 */
function getFeatureDirectories() {
  if (!fs.existsSync(FEATURES_DIR)) {
    return [];
  }

  return fs.readdirSync(FEATURES_DIR).filter(item => {
    const itemPath = path.join(FEATURES_DIR, item);
    return fs.statSync(itemPath).isDirectory();
  });
}

/**
 * Check if directory has nested component subdirectories (violation)
 */
function hasNestedComponentDirs(featurePath, dirName) {
  const dirPath = path.join(featurePath, dirName);

  if (!fs.existsSync(dirPath)) {
    return false;
  }

  const items = fs.readdirSync(dirPath);
  return items.some(item => {
    const itemPath = path.join(dirPath, item);
    if (fs.statSync(itemPath).isDirectory()) {
      // Check if it's a component-like directory (not __tests__ or add-flow style)
      const isComponentDir =
        !item.startsWith('__') &&
        !item.includes('-flow') &&
        !item.includes('flow');

      if (isComponentDir) {
        // Check if it contains component files
        const files = fs.readdirSync(itemPath);
        return files.some(f => /\.(tsx?|jsx?)$/.test(f));
      }
    }
    return false;
  });
}

/**
 * Check if directory has index.ts barrel file
 */
function hasIndexFile(dirPath) {
  const indexPath = path.join(dirPath, 'index.ts');
  return fs.existsSync(indexPath);
}

/**
 * Check for misplaced test directories
 */
function findMisplacedTests(featurePath) {
  const misplaced = [];

  function scanDir(dir, depth = 0) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Found __tests__ not at feature level
        if (item === '__tests__' && depth > 1) {
          misplaced.push({
            path: path.relative(FEATURES_DIR, itemPath),
            expected: path.join(
              path.relative(FEATURES_DIR, featurePath),
              '__tests__',
            ),
          });
        }

        // Recursively scan (limit depth to avoid infinite loops)
        if (depth < 3) {
          scanDir(itemPath, depth + 1);
        }
      }
    });
  }

  scanDir(featurePath);
  return misplaced;
}

/**
 * Validate a single feature
 */
function validateFeature(featureName) {
  const featurePath = path.join(FEATURES_DIR, featureName);
  const issues = [];
  const suggestions = [];

  // Check for nested component directories
  if (hasNestedComponentDirs(featurePath, 'components')) {
    issues.push({
      type: 'nested-components',
      message: `Nested component subdirectories found in components/`,
      severity: 'error',
    });
    suggestions.push({
      type: 'flatten',
      message: `Flatten components/ directory structure`,
    });
  }

  // Check for misplaced tests
  const misplacedTests = findMisplacedTests(featurePath);
  if (misplacedTests.length > 0) {
    issues.push({
      type: 'misplaced-tests',
      message: `Tests found in subdirectories (should be at feature level)`,
      severity: 'warning',
      details: misplacedTests,
    });
  }

  // Check for missing index.ts files in key directories
  REQUIRED_INDEX_FILES.forEach(dirName => {
    const dirPath = path.join(featurePath, dirName);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      if (!hasIndexFile(dirPath)) {
        issues.push({
          type: 'missing-index',
          message: `Missing index.ts in ${dirName}/`,
          severity: 'warning',
        });
        suggestions.push({
          type: 'create-index',
          message: `Create ${dirName}/index.ts barrel file`,
        });
      }
    }
  });

  return { issues, suggestions };
}

/**
 * Main validation function
 */
function validateStructure() {
  log('\n🔍 Validating Feature Structure...\n', 'cyan');

  const features = getFeatureDirectories();

  if (features.length === 0) {
    log('❌ No features found!', 'red');
    process.exit(1);
  }

  log(`Found ${features.length} features to validate\n`, 'blue');

  let totalViolations = 0;
  let totalWarnings = 0;

  features.forEach(feature => {
    const { issues, suggestions } = validateFeature(feature);

    if (issues.length > 0 || suggestions.length > 0) {
      log(`\n📁 ${feature}/`, 'yellow');

      issues.forEach(issue => {
        if (issue.severity === 'error') {
          log(`  ❌ ERROR: ${issue.message}`, 'red');
          totalViolations++;
        } else {
          log(`  ⚠️  WARNING: ${issue.message}`, 'yellow');
          totalWarnings++;
        }

        if (issue.details) {
          issue.details.forEach(detail => {
            log(`     Found: ${detail.path}`, 'blue');
            log(`     Expected: ${detail.expected}`, 'cyan');
          });
        }
      });

      if (suggestions.length > 0) {
        log(`  💡 Suggestions:`, 'cyan');
        suggestions.forEach(suggestion => {
          log(`     - ${suggestion.message}`, 'blue');
        });
      }

      violations.push({ feature, issues, suggestions });
    }
  });

  // Report results
  log(`\n📊 Validation Results:\n`, 'cyan');
  log(`Total features checked: ${features.length}`, 'blue');
  log(
    `Violations found: ${totalViolations}`,
    totalViolations > 0 ? 'red' : 'green',
  );
  log(
    `Warnings found: ${totalWarnings}`,
    totalWarnings > 0 ? 'yellow' : 'green',
  );

  if (violations.length > 0) {
    log('\n🚨 Features Needing Attention:\n', 'red');

    violations.forEach(({ feature, issues }) => {
      const errorCount = issues.filter(i => i.severity === 'error').length;
      const warningCount = issues.filter(i => i.severity === 'warning').length;

      log(`${feature}:`, 'yellow');
      log(`  Errors: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
      log(`  Warnings: ${warningCount}`, warningCount > 0 ? 'yellow' : 'green');
    });

    log('\n💡 Next Steps:', 'cyan');
    log('  1. Review violations above', 'blue');
    log('  2. Flatten nested directories', 'blue');
    log('  3. Move tests to feature-level __tests__/', 'blue');
    log('  4. Create missing index.ts barrel files', 'blue');
    log('  5. Run validation again to verify fixes', 'blue');

    log(
      '\n📝 See docs/FEATURE_STRUCTURE.md for the standard structure',
      'cyan',
    );

    process.exit(totalViolations > 0 ? 1 : 0);
  } else {
    log('\n✅ All features follow the standard structure!', 'green');
    process.exit(0);
  }
}

// Run validation
if (require.main === module) {
  try {
    validateStructure();
  } catch (error) {
    log(`\n❌ Error running validation: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

module.exports = { validateStructure };
