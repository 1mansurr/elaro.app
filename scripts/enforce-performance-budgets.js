/**
 * Performance Budget Enforcement Script
 *
 * Enforces performance budgets during build process.
 * Fails build if budgets are exceeded.
 */

const fs = require('fs');
const path = require('path');

const PERFORMANCE_BUDGETS_FILE = path.join(
  __dirname,
  '../performance-budgets.json',
);
const BUNDLE_SIZE_REPORT_FILE = path.join(
  __dirname,
  '../bundle-size-report.json',
);

/**
 * Load performance budgets
 */
function loadBudgets() {
  try {
    if (fs.existsSync(PERFORMANCE_BUDGETS_FILE)) {
      return JSON.parse(fs.readFileSync(PERFORMANCE_BUDGETS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('❌ Failed to load performance budgets:', error);
    process.exit(1);
  }
  throw new Error('Performance budgets file not found');
}

/**
 * Load bundle size report
 */
function loadReport() {
  try {
    if (fs.existsSync(BUNDLE_SIZE_REPORT_FILE)) {
      return JSON.parse(fs.readFileSync(BUNDLE_SIZE_REPORT_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('❌ Failed to load bundle size report:', error);
  }
  return null;
}

/**
 * Format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if bundle size exceeds thresholds
 */
function checkBundleSize(budgets, report) {
  const WARNING_THRESHOLD = 0.9; // 90% of budget
  const FAIL_THRESHOLD = 1.1; // 110% of budget
  const BUDGET = budgets.jsBundle || 2 * 1024 * 1024; // 2MB default
  
  let hasViolations = false;
  let hasWarnings = false;
  const isProduction = process.env.BUILD_PROFILE === 'production';
  
  if (report && report.bundles) {
    const iosSize = report.bundles.ios || 0;
    const androidSize = report.bundles.android || 0;
    
    // iOS checks
    if (iosSize > BUDGET * FAIL_THRESHOLD) {
      console.error(`❌ iOS bundle size (${formatBytes(iosSize)}) exceeds fail threshold (${formatBytes(BUDGET * FAIL_THRESHOLD)})`);
      hasViolations = true;
    } else if (iosSize > BUDGET * WARNING_THRESHOLD) {
      console.warn(`⚠️ iOS bundle size (${formatBytes(iosSize)}) exceeds warning threshold (${formatBytes(BUDGET * WARNING_THRESHOLD)})`);
      hasWarnings = true;
    }
    
    // Android checks
    if (androidSize > BUDGET * FAIL_THRESHOLD) {
      console.error(`❌ Android bundle size (${formatBytes(androidSize)}) exceeds fail threshold (${formatBytes(BUDGET * FAIL_THRESHOLD)})`);
      hasViolations = true;
    } else if (androidSize > BUDGET * WARNING_THRESHOLD) {
      console.warn(`⚠️ Android bundle size (${formatBytes(androidSize)}) exceeds warning threshold (${formatBytes(BUDGET * WARNING_THRESHOLD)})`);
      hasWarnings = true;
    }
  }
  
  // Only fail builds for production if critical violation
  if (hasViolations && isProduction) {
    console.error('❌ Performance budget violation - blocking production build');
    return { shouldFail: true, hasWarnings };
  } else if (hasWarnings) {
    console.warn('⚠️ Performance warnings detected, but build continues');
  }
  
  return { shouldFail: false, hasWarnings };
}

/**
 * Enforce performance budgets
 */
function enforceBudgets() {
  console.log('\n🔍 Enforcing Performance Budgets\n');

  const budgets = loadBudgets();
  const report = loadReport();

  if (!report) {
    console.warn('⚠️  No bundle size report found. Run analyze:bundle first.');
    return;
  }

  let hasViolations = false;

  // Check JS bundle sizes with thresholds
  const bundleCheck = checkBundleSize(budgets, report);
  if (bundleCheck.shouldFail) {
    hasViolations = true;
  }

  // Check total assets
  if (
    report.totals &&
    report.totals.totalAssets &&
    report.totals.totalAssets > budgets.totalAssets
  ) {
    console.error(
      `❌ Total assets (${formatBytes(report.totals.totalAssets)}) exceeds budget (${formatBytes(budgets.totalAssets)})`,
    );
    hasViolations = true;
  }

  // Check initial load size
  if (
    report.totals &&
    report.totals.total &&
    report.totals.total > budgets.initialLoad
  ) {
    console.error(
      `❌ Initial load size (${formatBytes(report.totals.total)}) exceeds budget (${formatBytes(budgets.initialLoad)})`,
    );
    hasViolations = true;
  }

  if (hasViolations) {
    console.error('\n❌ Build failed: Performance budgets exceeded');
    console.error('\nTo fix:');
    console.error('  1. Review bundle size report: bundle-size-report.json');
    console.error('  2. Identify large dependencies');
    console.error('  3. Consider code splitting or lazy loading');
    console.error('  4. Update budgets if needed: performance-budgets.json');
    process.exit(1);
  }

  console.log('✅ All performance budgets met');
}

// Run enforcement
enforceBudgets();
