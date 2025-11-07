/**
 * Bundle Size Analysis Script
 *
 * Analyzes bundle size and tracks changes over time.
 * Compares current bundle size against performance budgets.
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_SIZE_HISTORY_FILE = path.join(
  __dirname,
  '../bundle-size-history.json',
);
const PERFORMANCE_BUDGETS_FILE = path.join(
  __dirname,
  '../performance-budgets.json',
);

/**
 * Default performance budgets (in bytes)
 */
const DEFAULT_BUDGETS = {
  jsBundle: 2 * 1024 * 1024, // 2MB
  totalAssets: 10 * 1024 * 1024, // 10MB
  initialLoad: 3 * 1024 * 1024, // 3MB
};

/**
 * Load performance budgets
 */
function loadBudgets() {
  try {
    if (fs.existsSync(PERFORMANCE_BUDGETS_FILE)) {
      const budgets = JSON.parse(
        fs.readFileSync(PERFORMANCE_BUDGETS_FILE, 'utf8'),
      );
      return { ...DEFAULT_BUDGETS, ...budgets };
    }
  } catch (error) {
    console.warn('⚠️ Failed to load performance budgets, using defaults');
  }
  return DEFAULT_BUDGETS;
}

/**
 * Load bundle size history
 */
function loadHistory() {
  try {
    if (fs.existsSync(BUNDLE_SIZE_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(BUNDLE_SIZE_HISTORY_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️ Failed to load bundle size history');
  }
  return [];
}

/**
 * Save bundle size history
 */
function saveHistory(history) {
  try {
    fs.writeFileSync(
      BUNDLE_SIZE_HISTORY_FILE,
      JSON.stringify(history, null, 2),
    );
  } catch (error) {
    console.error('❌ Failed to save bundle size history:', error);
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Analyze bundle sizes
 */
function analyzeBundleSize() {
  const budgets = loadBudgets();
  const history = loadHistory();

  const results = {
    timestamp: new Date().toISOString(),
    bundles: {},
    assets: {},
    totals: {},
    budgets: {},
    violations: [],
    warnings: [],
  };

  // Check for iOS bundle
  const iosBundlePath = path.join(
    __dirname,
    '../ios/build/Bundle/main.jsbundle',
  );
  if (fs.existsSync(iosBundlePath)) {
    const size = getFileSize(iosBundlePath);
    results.bundles.ios = size;
    results.totals.ios = size;

    if (size > budgets.jsBundle) {
      results.violations.push({
        platform: 'ios',
        metric: 'jsBundle',
        size: size,
        budget: budgets.jsBundle,
        difference: size - budgets.jsBundle,
      });
    } else if (size > budgets.jsBundle * 0.9) {
      results.warnings.push({
        platform: 'ios',
        metric: 'jsBundle',
        size: size,
        budget: budgets.jsBundle,
        percentage: (size / budgets.jsBundle) * 100,
      });
    }
  }

  // Check for Android bundle
  const androidBundlePath = path.join(
    __dirname,
    '../android/app/build/generated/assets/react/release/index.android.bundle',
  );
  if (fs.existsSync(androidBundlePath)) {
    const size = getFileSize(androidBundlePath);
    results.bundles.android = size;
    results.totals.android = size;

    if (size > budgets.jsBundle) {
      results.violations.push({
        platform: 'android',
        metric: 'jsBundle',
        size: size,
        budget: budgets.jsBundle,
        difference: size - budgets.jsBundle,
      });
    } else if (size > budgets.jsBundle * 0.9) {
      results.warnings.push({
        platform: 'android',
        metric: 'jsBundle',
        size: size,
        budget: budgets.jsBundle,
        percentage: (size / budgets.jsBundle) * 100,
      });
    }
  }

  // Check for source maps
  const iosSourceMapPath = path.join(
    __dirname,
    '../ios/build/Bundle/main.jsbundle.map',
  );
  const androidSourceMapPath = path.join(
    __dirname,
    '../android/app/build/generated/assets/react/release/index.android.bundle.map',
  );

  if (fs.existsSync(iosSourceMapPath)) {
    results.assets.iosSourceMap = getFileSize(iosSourceMapPath);
  }

  if (fs.existsSync(androidSourceMapPath)) {
    results.assets.androidSourceMap = getFileSize(androidSourceMapPath);
  }

  // Calculate totals
  results.totals.total = Object.values(results.bundles).reduce(
    (sum, size) => sum + size,
    0,
  );
  results.totals.totalAssets = Object.values(results.assets).reduce(
    (sum, size) => sum + size,
    0,
  );

  // Check asset budget
  if (results.totals.totalAssets > budgets.totalAssets) {
    results.violations.push({
      platform: 'all',
      metric: 'totalAssets',
      size: results.totals.totalAssets,
      budget: budgets.totalAssets,
      difference: results.totals.totalAssets - budgets.totalAssets,
    });
  }

  // Compare with previous build
  if (history.length > 0) {
    const lastBuild = history[history.length - 1];
    results.comparison = {
      previous: lastBuild.timestamp,
      changes: {},
    };

    if (results.totals.ios && lastBuild.totals?.ios) {
      const change = results.totals.ios - lastBuild.totals.ios;
      results.comparison.changes.ios = {
        bytes: change,
        percentage: (change / lastBuild.totals.ios) * 100,
      };
    }

    if (results.totals.android && lastBuild.totals?.android) {
      const change = results.totals.android - lastBuild.totals.android;
      results.comparison.changes.android = {
        bytes: change,
        percentage: (change / lastBuild.totals.android) * 100,
      };
    }
  }

  // Add to history (keep last 50 builds)
  history.push(results);
  if (history.length > 50) {
    history.shift();
  }
  saveHistory(history);

  // Print results
  console.log('\n📦 Bundle Size Analysis\n');
  console.log('Platform Bundles:');
  if (results.bundles.ios) {
    console.log(`  iOS: ${formatBytes(results.bundles.ios)}`);
  }
  if (results.bundles.android) {
    console.log(`  Android: ${formatBytes(results.bundles.android)}`);
  }

  console.log('\nPerformance Budgets:');
  console.log(`  JS Bundle: ${formatBytes(budgets.jsBundle)}`);
  console.log(`  Total Assets: ${formatBytes(budgets.totalAssets)}`);

  if (results.comparison) {
    console.log('\nChanges from Previous Build:');
    if (results.comparison.changes.ios) {
      const change = results.comparison.changes.ios;
      const sign = change >= 0 ? '+' : '';
      console.log(
        `  iOS: ${sign}${formatBytes(change)} (${sign}${change.percentage.toFixed(2)}%)`,
      );
    }
    if (results.comparison.changes.android) {
      const change = results.comparison.changes.android;
      const sign = change >= 0 ? '+' : '';
      console.log(
        `  Android: ${sign}${formatBytes(change)} (${sign}${change.percentage.toFixed(2)}%)`,
      );
    }
  }

  if (results.violations.length > 0) {
    console.log('\n❌ Budget Violations:');
    results.violations.forEach(violation => {
      console.log(
        `  ${violation.platform} ${violation.metric}: ${formatBytes(violation.size)} exceeds budget by ${formatBytes(violation.difference)}`,
      );
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Budget Warnings:');
    results.warnings.forEach(warning => {
      console.log(
        `  ${warning.platform} ${warning.metric}: ${formatBytes(warning.size)} (${warning.percentage.toFixed(1)}% of budget)`,
      );
    });
  }

  if (results.violations.length === 0 && results.warnings.length === 0) {
    console.log('\n✅ All bundle sizes within budgets');
  }

  // Save results to file
  const resultsFile = path.join(__dirname, '../bundle-size-report.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: bundle-size-report.json`);

  // Exit with error code if violations found
  if (results.violations.length > 0) {
    process.exit(1);
  }
}

// Run analysis
analyzeBundleSize();
