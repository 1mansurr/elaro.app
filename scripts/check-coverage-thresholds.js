#!/usr/bin/env node

/**
 * Coverage Threshold Checker
 * 
 * Verifies that critical paths meet the 70%+ coverage requirement.
 * Used in CI/CD to prevent merging code with insufficient test coverage.
 */

const fs = require('fs');
const path = require('path');

// Coverage thresholds for critical paths
const CRITICAL_PATH_THRESHOLDS = {
  'src/features/auth': 70,
  'src/hooks/useTaskMutations.ts': 70,
  'src/services/syncManager.ts': 70,
  'src/navigation': 70,
};

// Global minimum threshold
const GLOBAL_THRESHOLD = 50;

function loadCoverageSummary() {
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage summary not found. Run "npm run test:coverage" first.');
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
}

function findMatchingFile(coverage, pattern) {
  // Try exact match first
  if (coverage[pattern]) {
    return coverage[pattern];
  }
  
  // Try pattern matching
  const matchingKey = Object.keys(coverage).find(key => {
    if (pattern.endsWith('.ts') || pattern.endsWith('.tsx')) {
      // Exact file match
      return key.includes(pattern);
    } else {
      // Directory match
      return key.includes(pattern);
    }
  });
  
  return matchingKey ? coverage[matchingKey] : null;
}

function checkCriticalPaths(coverage) {
  console.log('🔍 Checking critical path coverage thresholds...\n');
  
  let allPassed = true;
  const results = [];
  
  for (const [path, threshold] of Object.entries(CRITICAL_PATH_THRESHOLDS)) {
    const fileCoverage = findMatchingFile(coverage, path);
    
    if (!fileCoverage) {
      console.log(`⚠️  ${path}: Not found in coverage report`);
      results.push({ path, status: 'not_found', threshold });
      continue;
    }
    
    const stats = fileCoverage;
    const linesPct = stats.lines?.pct || 0;
    const functionsPct = stats.functions?.pct || 0;
    const branchesPct = stats.branches?.pct || 0;
    const statementsPct = stats.statements?.pct || 0;
    
    const minPct = Math.min(linesPct, functionsPct, branchesPct, statementsPct);
    
    if (minPct >= threshold) {
      console.log(`✅ ${path}: ${minPct.toFixed(1)}% >= ${threshold}% threshold`);
      results.push({ path, status: 'passed', coverage: minPct, threshold });
    } else {
      console.log(`❌ ${path}: ${minPct.toFixed(1)}% < ${threshold}% threshold`);
      console.log(`   Details: lines=${linesPct.toFixed(1)}%, functions=${functionsPct.toFixed(1)}%, branches=${branchesPct.toFixed(1)}%, statements=${statementsPct.toFixed(1)}%`);
      results.push({ path, status: 'failed', coverage: minPct, threshold });
      allPassed = false;
    }
  }
  
  return { allPassed, results };
}

function checkGlobalCoverage(coverage) {
  console.log('\n📊 Checking global coverage...\n');
  
  const total = coverage.total;
  if (!total) {
    console.error('❌ No total coverage found');
    return false;
  }
  
  const linesPct = total.lines?.pct || 0;
  const functionsPct = total.functions?.pct || 0;
  const branchesPct = total.branches?.pct || 0;
  const statementsPct = total.statements?.pct || 0;
  
  const minPct = Math.min(linesPct, functionsPct, branchesPct, statementsPct);
  
  if (minPct >= GLOBAL_THRESHOLD) {
    console.log(`✅ Global coverage: ${minPct.toFixed(1)}% >= ${GLOBAL_THRESHOLD}% threshold`);
    console.log(`   Details: lines=${linesPct.toFixed(1)}%, functions=${functionsPct.toFixed(1)}%, branches=${branchesPct.toFixed(1)}%, statements=${statementsPct.toFixed(1)}%`);
    return true;
  } else {
    console.log(`❌ Global coverage: ${minPct.toFixed(1)}% < ${GLOBAL_THRESHOLD}% threshold`);
    console.log(`   Details: lines=${linesPct.toFixed(1)}%, functions=${functionsPct.toFixed(1)}%, branches=${branchesPct.toFixed(1)}%, statements=${statementsPct.toFixed(1)}%`);
    return false;
  }
}

function main() {
  console.log('📈 Coverage Threshold Checker\n');
  console.log('='.repeat(50));
  
  const coverage = loadCoverageSummary();
  
  // Check critical paths
  const { allPassed: criticalPassed, results } = checkCriticalPaths(coverage);
  
  // Check global coverage
  const globalPassed = checkGlobalCoverage(coverage);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 Summary:\n');
  
  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const notFoundCount = results.filter(r => r.status === 'not_found').length;
  
  console.log(`Critical Paths: ${passedCount} passed, ${failedCount} failed, ${notFoundCount} not found`);
  console.log(`Global Coverage: ${globalPassed ? '✅ Passed' : '❌ Failed'}`);
  
  if (!criticalPassed || !globalPassed) {
    console.log('\n❌ Coverage thresholds not met. Please add more tests.');
    process.exit(1);
  }
  
  console.log('\n✅ All coverage thresholds met!');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { checkCriticalPaths, checkGlobalCoverage };

