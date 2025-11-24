#!/usr/bin/env node

/**
 * Script to verify all FlatList components have performance optimizations
 *
 * Checks for:
 * - removeClippedSubviews={true}
 * - maxToRenderPerBatch (should be 10)
 * - windowSize (should be 5)
 * - updateCellsBatchingPeriod (should be 50)
 * - initialNumToRender (should be 10)
 *
 * OR uses OptimizedFlatList component
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PERFORMANCE_PROPS = [
  'removeClippedSubviews',
  'maxToRenderPerBatch',
  'windowSize',
  'updateCellsBatchingPeriod',
  'initialNumToRender',
];

const OPTIMIZED_COMPONENT = 'OptimizedFlatList';

function findFiles(dir, extensions = ['.tsx', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', '.git', 'dist', 'build', '.expo'].includes(file)) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  });

  return results;
}

function checkFlatList(filePath) {
  // Skip OptimizedFlatList component itself - it's the component that provides optimizations
  if (filePath.includes('OptimizedFlatList.tsx')) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Remove comments to avoid false positives
  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, ''); // Remove line comments

  // Check if uses OptimizedFlatList
  if (
    withoutComments.includes(`<${OPTIMIZED_COMPONENT}`) ||
    withoutComments.includes(`from '@/shared/components/OptimizedFlatList'`)
  ) {
    return { file: filePath, status: 'optimized', missing: [] };
  }

  // Check for actual FlatList usage (not in comments)
  if (
    !withoutComments.includes('<FlatList') &&
    !withoutComments.includes('FlatList<')
  ) {
    return null;
  }

  const missing = [];

  // Check each performance prop
  PERFORMANCE_PROPS.forEach(prop => {
    // Check for prop with value
    const propRegex = new RegExp(
      `${prop}\\s*=\\s*\\{[^}]+\\}|${prop}\\s*=\\s*true|${prop}\\s*=\\s*\\d+`,
      'g',
    );
    if (!propRegex.test(withoutComments)) {
      missing.push(prop);
    }
  });

  if (missing.length > 0) {
    return { file: filePath, status: 'missing', missing };
  }

  return { file: filePath, status: 'ok', missing: [] };
}

// Main execution
console.log('🔍 Verifying FlatList performance optimizations...\n');

const srcDir = path.join(process.cwd(), 'src');
const files = findFiles(srcDir);

const results = [];
files.forEach(file => {
  const result = checkFlatList(file);
  if (result) {
    results.push(result);
  }
});

// Report results
const optimized = results.filter(r => r.status === 'optimized');
const ok = results.filter(r => r.status === 'ok');
const missing = results.filter(r => r.status === 'missing');

console.log(`📊 Results:`);
console.log(`   Total FlatList instances: ${results.length}`);
console.log(`   ✅ Using OptimizedFlatList: ${optimized.length}`);
console.log(`   ✅ Has all performance props: ${ok.length}`);
console.log(`   ⚠️  Missing performance props: ${missing.length}\n`);

if (missing.length > 0) {
  console.log('⚠️  Files missing performance optimizations:\n');
  missing.forEach(({ file, missing: missingProps }) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`   ${relativePath}`);
    console.log(`   Missing: ${missingProps.join(', ')}\n`);
  });
  process.exit(1);
} else {
  console.log('✅ All FlatLists have performance optimizations!\n');
  process.exit(0);
}
