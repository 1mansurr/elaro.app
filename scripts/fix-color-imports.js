#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const findFiles = () => {
  const patterns = [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!node_modules/**',
    '!dist/**',
    '!build/**',
  ];
  return glob.sync(patterns, { cwd: process.cwd(), nodir: true });
};

const addColorsImport = filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Skip if file doesn't use COLORS
    if (!content.includes('COLORS.')) {
      return { filePath, changed: false };
    }

    // Skip if already imports COLORS
    if (content.includes('import') && content.includes('COLORS')) {
      return { filePath, changed: false };
    }

    // Skip theme files themselves
    if (
      filePath.includes('constants/theme') ||
      filePath.includes('ThemeContext')
    ) {
      return { filePath, changed: false };
    }

    let updated = content;
    let addedImport = false;

    // Find existing theme imports
    const themeImportMatch = content.match(
      /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/constants\/theme['"]/,
    );

    if (themeImportMatch) {
      // Add COLORS to existing theme import
      const existingImports = themeImportMatch[1].trim();
      if (!existingImports.includes('COLORS')) {
        const newImports = existingImports + ', COLORS';
        updated = updated.replace(
          themeImportMatch[0],
          `import { ${newImports} } from '@/constants/theme'`,
        );
        addedImport = true;
      }
    } else {
      // Add new COLORS import
      const lines = content.split('\n');
      let insertIndex = 0;

      // Find the last import statement
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          insertIndex = i + 1;
        }
      }

      lines.splice(
        insertIndex,
        0,
        "import { COLORS } from '@/constants/theme';",
      );
      updated = lines.join('\n');
      addedImport = true;
    }

    if (addedImport) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`✅ Added COLORS import to ${filePath}`);
      return { filePath, changed: true };
    }

    return { filePath, changed: false };
  } catch (err) {
    console.error(`❌ Error processing ${filePath}: ${err.message}`);
    return { filePath, changed: false, error: err.message };
  }
};

const main = () => {
  console.log('🔧 Fixing COLORS imports...');
  console.log('============================');

  const files = findFiles();
  let totalFixed = 0;

  files.forEach(filePath => {
    const result = addColorsImport(filePath);
    if (result.changed) {
      totalFixed++;
    }
  });

  console.log(`\n📊 Summary`);
  console.log(`Files processed: ${files.length}`);
  console.log(`Files fixed: ${totalFixed}`);
  console.log('✅ Import fixes completed!');
};

if (require.main === module) {
  main();
}

module.exports = { addColorsImport };
