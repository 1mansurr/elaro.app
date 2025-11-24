#!/usr/bin/env node

/**
 * Script to audit and categorize all `any` types in the codebase
 * Helps prioritize type safety improvements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src');
const results = {
  total: 0,
  byFile: {},
  byType: {
    explicitAny: 0, // : any
    asAny: 0, // as any
    anyInGenerics: 0, // <any>
  },
  categories: {
    easy: [], // Simple type replacements
    medium: [], // Require refactoring
    hard: [], // Complex type system changes
  },
};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileResults = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Find explicit any types: : any
    const explicitAnyMatch = line.match(/:\s*any(\s|;|,|\)|\[|\]|$)/g);
    if (explicitAnyMatch) {
      results.total++;
      results.byType.explicitAny++;
      fileResults.push({
        line: lineNum,
        type: 'explicitAny',
        content: line.trim(),
      });
    }

    // Find as any assertions
    const asAnyMatch = line.match(/as\s+any/g);
    if (asAnyMatch) {
      results.total++;
      results.byType.asAny++;
      fileResults.push({
        line: lineNum,
        type: 'asAny',
        content: line.trim(),
      });
    }

    // Find any in generics: <any>
    const genericAnyMatch = line.match(/<\s*any\s*>/g);
    if (genericAnyMatch) {
      results.total++;
      results.byType.anyInGenerics++;
      fileResults.push({
        line: lineNum,
        type: 'genericAny',
        content: line.trim(),
      });
    }
  });

  if (fileResults.length > 0) {
    const relativePath = path.relative(SRC_DIR, filePath);
    results.byFile[relativePath] = fileResults;

    // Categorize based on context
    categorizeFile(relativePath, fileResults);
  }
}

function categorizeFile(filePath, issues) {
  // Easy: Simple type replacements (error handlers, simple utilities)
  if (filePath.includes('error') || filePath.includes('utils')) {
    const easyCount = issues.filter(
      i =>
        i.content.includes('error') ||
        i.content.includes('unknown') ||
        i.type === 'asAny',
    ).length;
    if (easyCount > 0) {
      results.categories.easy.push({
        file: filePath,
        count: easyCount,
        issues: issues.slice(0, 5), // First 5 examples
      });
    }
  }

  // Medium: Require refactoring (services, hooks with complex types)
  if (filePath.includes('service') || filePath.includes('hook')) {
    results.categories.medium.push({
      file: filePath,
      count: issues.length,
      issues: issues.slice(0, 3),
    });
  }

  // Hard: Complex type system changes (navigation, contexts)
  if (filePath.includes('navigation') || filePath.includes('context')) {
    results.categories.hard.push({
      file: filePath,
      count: issues.length,
      issues: issues.slice(0, 3),
    });
  }
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  });
}

// Main execution
console.log('🔍 Scanning for `any` types...\n');
scanDirectory(SRC_DIR);

// Print results
console.log('📊 Audit Results:\n');
console.log(`Total 'any' types found: ${results.total}\n`);

console.log('By Type:');
console.log(`  Explicit ': any': ${results.byType.explicitAny}`);
console.log(`  'as any' assertions: ${results.byType.asAny}`);
console.log(`  '<any>' in generics: ${results.byType.anyInGenerics}\n`);

console.log(`Files with issues: ${Object.keys(results.byFile).length}\n`);

console.log('Top 10 files with most issues:');
const sortedFiles = Object.entries(results.byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

sortedFiles.forEach(([file, issues]) => {
  console.log(`  ${file}: ${issues.length} issues`);
});

console.log('\n📋 Categorization:');
console.log(`  Easy fixes: ${results.categories.easy.length} files`);
console.log(`  Medium fixes: ${results.categories.medium.length} files`);
console.log(`  Hard fixes: ${results.categories.hard.length} files`);

// Save detailed report
const reportPath = path.join(__dirname, '..', 'any-types-audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n✅ Detailed report saved to: ${reportPath}`);

// Exit with code 0 if issues found (non-blocking)
process.exit(0);
