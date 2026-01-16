#!/usr/bin/env node

/**
 * Verification script to check the effective iOS build number
 * that will be used during EAS Build.
 *
 * This helps identify which source (env var, EAS remote, or app.json)
 * will be used for the build number.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying iOS Build Number Configuration\n');
console.log('='.repeat(60));

// 1. Check app.json
try {
  const appJsonPath = path.join(__dirname, '../app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const appJsonBuildNumber = appJson.expo?.ios?.buildNumber;
  console.log(`📱 app.json buildNumber: ${appJsonBuildNumber || 'NOT SET'}`);
} catch (error) {
  console.log('❌ Could not read app.json:', error.message);
}

// 2. Check environment variables
const expoPublicBuildNumber = process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER;
const easBuildNumber = process.env.EAS_BUILD_NUMBER;

console.log(
  `🔧 EXPO_PUBLIC_IOS_BUILD_NUMBER: ${expoPublicBuildNumber || 'NOT SET'}`,
);
console.log(`🔧 EAS_BUILD_NUMBER: ${easBuildNumber || 'NOT SET'}`);

// 3. Check eas.json for autoIncrement
try {
  const easJsonPath = path.join(__dirname, '../eas.json');
  const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  const productionProfile = easJson.build?.production;
  const autoIncrement = productionProfile?.autoIncrement;
  const iosAutoIncrement = productionProfile?.ios?.autoIncrement;
  const appVersionSource = easJson.cli?.appVersionSource;

  console.log(`\n📋 eas.json configuration:`);
  console.log(`   appVersionSource: ${appVersionSource || 'local (default)'}`);
  console.log(`   production.autoIncrement: ${autoIncrement || 'false'}`);
  console.log(
    `   production.ios.autoIncrement: ${iosAutoIncrement || 'false'}`,
  );

  if (appVersionSource === 'remote' && (autoIncrement || iosAutoIncrement)) {
    console.log(`\n✅ EAS will auto-increment build number from remote server`);
    console.log(`   Last submitted build: 2 (from error message)`);
    console.log(
      `   Expected next build: 3 or higher (auto-incremented by EAS)`,
    );
  }
} catch (error) {
  console.log('❌ Could not read eas.json:', error.message);
}

// 4. Get effective build number from expo config
try {
  console.log(`\n🔍 Checking effective build number via expo config...`);
  const configOutput = execSync('npx expo config --type introspect 2>&1', {
    encoding: 'utf8',
    cwd: path.join(__dirname, '..'),
  });

  // Extract buildNumber from config output
  const buildNumberMatch = configOutput.match(
    /buildNumber:\s*['"]?(\d+)['"]?/i,
  );
  if (buildNumberMatch) {
    console.log(
      `\n✅ Effective buildNumber (from expo config): ${buildNumberMatch[1]}`,
    );
  } else {
    console.log(`\n⚠️  Could not extract buildNumber from expo config`);
    console.log(`   (This is normal if EAS_BUILD_NUMBER is not set yet)`);
  }
} catch (error) {
  console.log(`\n⚠️  Could not run expo config: ${error.message}`);
}

// 5. Determine what will be used
console.log(`\n📊 Build Number Resolution Priority:`);
console.log(`   1. EXPO_PUBLIC_IOS_BUILD_NUMBER (highest - if set)`);
console.log(
  `   2. EAS_BUILD_NUMBER (set by EAS autoIncrement or build:version:set)`,
);
console.log(`   3. app.json expo.ios.buildNumber (fallback)`);

console.log(`\n${'='.repeat(60)}`);
console.log(`\n💡 Next Steps:`);
console.log(
  `   1. With autoIncrement enabled, EAS will automatically use build number > 2`,
);
console.log(
  `   2. To manually set: eas build:version:set --platform ios --build-number 4`,
);
console.log(
  `   3. To verify before build: Check EAS dashboard or build logs\n`,
);
