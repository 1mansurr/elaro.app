#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const COLOR_MAPPINGS = {
  '#007AFF': 'COLORS.primary',
  '#2C5EFF': 'COLORS.primary',
  '#3B82F6': 'COLORS.blue500',
  '#FFFFFF': 'COLORS.white',
  '#FFF': 'COLORS.white',
  '#000000': 'COLORS.black',
  '#000': 'COLORS.black',
  '#333333': 'COLORS.textPrimary',
  '#333': 'COLORS.textPrimary',
  '#666666': 'COLORS.textSecondary',
  '#666': 'COLORS.textSecondary',
  '#8E8E93': 'COLORS.textSecondary',
  '#999999': 'COLORS.textSecondary',
  '#FF3B30': 'COLORS.error',
  '#F44336': 'COLORS.error',
  '#DC2626': 'COLORS.red600',
  '#34C759': 'COLORS.success',
  '#10B981': 'COLORS.green500',
  '#22C55E': 'COLORS.green500',
  '#FF9500': 'COLORS.warning',
  '#F59E0B': 'COLORS.yellow500',
  '#FF9800': 'COLORS.warning',
  '#F8F9FA': 'COLORS.backgroundSecondary',
  '#F2F2F7': 'COLORS.surface',
  '#E0E0E0': 'COLORS.lightGray',
  '#E3F2FD': 'COLORS.blue50',
  '#38383A': 'COLORS.border',
  '#8B5CF6': 'COLORS.purple500',
  '#9C27B0': 'COLORS.purple',
  '#8B0000': 'COLORS.red700',
  '#FFF5F5': 'COLORS.red50',
  '#FFE4E1': 'COLORS.red200',
  '#FFE4B5': 'COLORS.yellow200',
  '#FFFAF0': 'COLORS.yellow50',
  '#F0F5FF': 'COLORS.blue50',
  '#F0FFF4': 'COLORS.green50',
};

const EXTENDED_COLOR_MAPPINGS = {
  '#1D4ED8': 'COLORS.blue700',
  '#60A5FA': 'COLORS.blue400',
  '#059669': 'COLORS.green600',
  '#34D399': 'COLORS.green400',
  '#D97706': 'COLORS.yellow600',
  '#FBBF24': 'COLORS.yellow400',
  '#7C3AED': 'COLORS.purple600',
  '#A78BFA': 'COLORS.purple400',
};

const getThemeColor = hex => {
  const normalized = hex.toUpperCase();
  if (COLOR_MAPPINGS[normalized]) return COLOR_MAPPINGS[normalized];
  if (EXTENDED_COLOR_MAPPINGS[normalized])
    return EXTENDED_COLOR_MAPPINGS[normalized];
  return hex;
};

const replaceHardcodedColors = content => {
  const matches = content.match(/#[0-9A-Fa-f]{3,6}/g) || [];
  let updated = content;
  [...new Set(matches)].forEach(hex => {
    const replacement = getThemeColor(hex);
    if (replacement !== hex) {
      // Replace hex colors with COLORS references (without quotes)
      updated = updated.replace(new RegExp(hex, 'g'), replacement);
    }
  });
  return updated;
};

const getColorStats = content => {
  const all = content.match(/#[0-9A-Fa-f]{3,6}/g) || [];
  const unique = [...new Set(all)];
  const unmapped = unique.filter(hex => getThemeColor(hex) === hex);
  const mapped = unique.filter(hex => getThemeColor(hex) !== hex);
  return {
    totalColors: all.length,
    hardcodedColors: unmapped.length,
    themeColors: mapped.length,
    unmappedColors: unmapped,
  };
};

const findFiles = () => {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.test.{ts,tsx,js,jsx}',
    '!src/**/*.spec.{ts,tsx,js,jsx}',
    '!node_modules/**',
    '!dist/**',
    '!build/**',
  ];
  return glob.sync(patterns, { cwd: process.cwd(), nodir: true });
};

const processFile = (filePath, options = {}) => {
  const { dryRun = false, fix = false } = options;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updated = replaceHardcodedColors(content);
    if (content !== updated) {
      const before = getColorStats(content);
      const after = getColorStats(updated);
      console.log(`\n📁 ${filePath}`);
      console.log(`   Before: ${before.hardcodedColors} hardcoded colors`);
      console.log(`   After:  ${after.hardcodedColors} hardcoded colors`);
      if (fix && !dryRun) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log('   ✅ Fixed');
      } else if (dryRun) {
        console.log('   🔍 Would fix');
      }
      return { filePath, changed: true, before, after };
    }
    return { filePath, changed: false };
  } catch (err) {
    console.error(`❌ Error processing ${filePath}: ${err.message}`);
    return { filePath, changed: false, error: err.message };
  }
};

const main = () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fix = args.includes('--fix');
  const statsOnly = args.includes('--stats');

  console.log('🎨 Color Migration Script');
  console.log('========================');

  const files = findFiles();
  console.log(`Found ${files.length} files to process`);

  let totalFilesChanged = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const before = getColorStats(content);
    if (statsOnly && before.hardcodedColors > 0) {
      console.log(`\n📁 ${filePath}`);
      console.log(`   Hardcoded colors: ${before.hardcodedColors}`);
      console.log(`   Unmapped: ${before.unmappedColors.join(', ')}`);
    }
    if (!statsOnly) {
      const result = processFile(filePath, { dryRun, fix });
      if (result.changed) {
        totalFilesChanged += 1;
        totalBefore += result.before.hardcodedColors;
        totalAfter += result.after.hardcodedColors;
      }
    }
  });

  if (!statsOnly) {
    console.log('\n📊 Summary');
    console.log('==========');
    console.log(`Files processed: ${files.length}`);
    console.log(`Files changed: ${totalFilesChanged}`);
    console.log(`Total hardcoded colors before: ${totalBefore}`);
    console.log(`Total hardcoded colors after: ${totalAfter}`);
    console.log(`Total colors migrated: ${totalBefore - totalAfter}`);
    if (dryRun)
      console.log('\n🔍 This was a dry run. Use --fix to apply changes.');
    if (fix) console.log('\n✅ Migration completed!');
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  getThemeColor,
  replaceHardcodedColors,
  getColorStats,
  processFile,
};
