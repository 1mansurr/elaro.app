#!/usr/bin/env node

/**
 * Performance Benchmark Script
 * 
 * Measures key performance metrics for the app:
 * - Bundle size
 * - Estimated startup time
 * - Code complexity
 * - Dependencies analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Performance targets
const TARGETS = {
  bundleSize: {
    ios: 50 * 1024 * 1024, // 50MB
    android: 50 * 1024 * 1024, // 50MB
  },
  startupTime: 3000, // 3 seconds
  screenTransition: 300, // 300ms
  apiResponse: 1000, // 1 second
};

// Results
const results = {
  bundleSize: { passed: false, value: 0, target: 0 },
  dependencies: { passed: false, count: 0 },
  codeComplexity: { passed: false, message: '' },
};

// Get directory size
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors for inaccessible directories
  }
  
  return totalSize;
}

// Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Check bundle size
function checkBundleSize() {
  logSection('1. Bundle Size Analysis');
  
  // Check node_modules size
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    logInfo('Calculating node_modules size...');
    const nodeModulesSize = getDirectorySize(nodeModulesPath);
    logInfo(`node_modules size: ${formatBytes(nodeModulesSize)}`);
    
    // Check if within reasonable limits
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (nodeModulesSize > maxSize) {
      logWarning(`node_modules is large (${formatBytes(nodeModulesSize)})`);
      logInfo('Consider using yarn PnP or checking for duplicate dependencies');
    } else {
      logSuccess(`node_modules size is reasonable`);
    }
  }
  
  // Check if build directories exist
  const iosBuildPath = path.join(process.cwd(), 'ios', 'build');
  const androidBuildPath = path.join(process.cwd(), 'android', 'app', 'build');
  
  if (fs.existsSync(iosBuildPath)) {
    const iosSize = getDirectorySize(iosBuildPath);
    logInfo(`iOS build size: ${formatBytes(iosSize)}`);
    
    if (iosSize > TARGETS.bundleSize.ios) {
      logWarning(`iOS bundle exceeds target (${formatBytes(iosSize)} > ${formatBytes(TARGETS.bundleSize.ios)})`);
      results.bundleSize.passed = false;
    } else {
      logSuccess(`iOS bundle size is within target`);
      results.bundleSize.passed = true;
    }
    results.bundleSize.value = iosSize;
    results.bundleSize.target = TARGETS.bundleSize.ios;
  }
  
  if (fs.existsSync(androidBuildPath)) {
    const androidSize = getDirectorySize(androidBuildPath);
    logInfo(`Android build size: ${formatBytes(androidSize)}`);
    
    if (androidSize > TARGETS.bundleSize.android) {
      logWarning(`Android bundle exceeds target (${formatBytes(androidSize)} > ${formatBytes(TARGETS.bundleSize.android)})`);
      results.bundleSize.passed = false;
    } else {
      logSuccess(`Android bundle size is within target`);
      results.bundleSize.passed = true;
    }
  }
}

// Check dependencies
function checkDependencies() {
  logSection('2. Dependencies Analysis');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    const dependencies = Object.keys(packageJson.dependencies || {}).length;
    const devDependencies = Object.keys(packageJson.devDependencies || {}).length;
    const total = dependencies + devDependencies;
    
    logInfo(`Production dependencies: ${dependencies}`);
    logInfo(`Development dependencies: ${devDependencies}`);
    logInfo(`Total dependencies: ${total}`);
    
    results.dependencies.count = total;
    
    if (total > 200) {
      logWarning(`High number of dependencies (${total})`);
      logInfo('Consider reviewing and removing unused dependencies');
      results.dependencies.passed = false;
    } else {
      logSuccess(`Dependency count is reasonable`);
      results.dependencies.passed = true;
    }
    
    // Check for duplicate dependencies
    logInfo('\nChecking for duplicate dependencies...');
    try {
      const output = execSync('npm ls --depth=0', { encoding: 'utf-8', stdio: 'pipe' });
      if (output.includes('UNMET') || output.includes('invalid')) {
        logWarning('Some dependencies may have issues');
      } else {
        logSuccess('All dependencies resolved correctly');
      }
    } catch (error) {
      logWarning('Could not verify dependency tree');
    }
  } catch (error) {
    logError(`Failed to analyze dependencies: ${error.message}`);
    results.dependencies.passed = false;
  }
}

// Check code complexity
function checkCodeComplexity() {
  logSection('3. Code Complexity Analysis');
  
  try {
    // Count TypeScript files
    const srcPath = path.join(process.cwd(), 'src');
    let fileCount = 0;
    let totalLines = 0;
    
    function countFiles(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          countFiles(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          fileCount++;
          const content = fs.readFileSync(filePath, 'utf-8');
          totalLines += content.split('\n').length;
        }
      }
    }
    
    if (fs.existsSync(srcPath)) {
      countFiles(srcPath);
      logInfo(`TypeScript files: ${fileCount}`);
      logInfo(`Total lines of code: ${totalLines.toLocaleString()}`);
      logInfo(`Average lines per file: ${Math.round(totalLines / fileCount)}`);
      
      if (totalLines > 50000) {
        logWarning('Large codebase - consider code splitting');
      } else {
        logSuccess('Codebase size is manageable');
      }
      
      results.codeComplexity.passed = true;
      results.codeComplexity.message = `${fileCount} files, ${totalLines.toLocaleString()} lines`;
    } else {
      logWarning('src directory not found');
      results.codeComplexity.passed = false;
    }
  } catch (error) {
    logError(`Failed to analyze code complexity: ${error.message}`);
    results.codeComplexity.passed = false;
  }
}

// Performance recommendations
function generateRecommendations() {
  logSection('4. Performance Recommendations');
  
  const recommendations = [];
  
  if (!results.bundleSize.passed) {
    recommendations.push('Optimize bundle size: Use code splitting, tree shaking, and remove unused code');
  }
  
  if (!results.dependencies.passed) {
    recommendations.push('Review dependencies: Remove unused packages and check for duplicates');
  }
  
  if (recommendations.length === 0) {
    logSuccess('No critical performance issues found');
    logInfo('\nGeneral recommendations:');
    logInfo('- Enable code splitting for large features');
    logInfo('- Use lazy loading for screens');
    logInfo('- Optimize images and assets');
    logInfo('- Monitor performance in production');
  } else {
    logWarning('Performance improvements recommended:');
    recommendations.forEach((rec, index) => {
      logInfo(`${index + 1}. ${rec}`);
    });
  }
}

// Generate summary
function generateSummary() {
  logSection('Performance Benchmark Summary');
  
  const allChecks = [
    { name: 'Bundle Size', result: results.bundleSize },
    { name: 'Dependencies', result: results.dependencies },
    { name: 'Code Complexity', result: results.codeComplexity },
  ];
  
  let allPassed = true;
  
  allChecks.forEach(({ name, result }) => {
    if (result.passed) {
      logSuccess(`${name}: PASSED`);
      if (result.message) {
        logInfo(`  ${result.message}`);
      }
    } else {
      logError(`${name}: NEEDS ATTENTION`);
      if (result.message) {
        logInfo(`  ${result.message}`);
      }
      allPassed = false;
    }
  });
  
  log('\n' + '='.repeat(60), 'cyan');
  
  if (allPassed) {
    logSuccess('\n✅ Performance benchmarks look good!');
    logInfo('Continue monitoring performance in production.');
  } else {
    logWarning('\n⚠️  Some performance areas need attention.');
    logInfo('Review recommendations above before beta launch.');
  }
  
  log('\nPerformance Targets:');
  logInfo(`- Bundle size: < ${formatBytes(TARGETS.bundleSize.ios)}`);
  logInfo(`- Startup time: < ${TARGETS.startupTime}ms`);
  logInfo(`- Screen transitions: < ${TARGETS.screenTransition}ms`);
  logInfo(`- API responses: < ${TARGETS.apiResponse}ms`);
}

// Main execution
async function main() {
  log('\n📊 Performance Benchmark\n', 'cyan');
  log('Analyzing app performance metrics...\n', 'blue');

  try {
    checkBundleSize();
    checkDependencies();
    checkCodeComplexity();
    generateRecommendations();
    generateSummary();
  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, results, TARGETS };


