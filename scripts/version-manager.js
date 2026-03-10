const fs = require('fs');
const path = require('path');

const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');
const APP_JSON_PATH = path.join(__dirname, '../app.json');

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  return packageJson.version;
}

function bumpVersion(type) {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  const [major, minor, patch] = packageJson.version.split('.').map(Number);

  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      throw new Error(
        `Invalid version type: ${type}. Use major, minor, or patch.`,
      );
  }

  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(
    PACKAGE_JSON_PATH,
    JSON.stringify(packageJson, null, 2) + '\n',
  );

  // Update app.json
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  appJson.expo.version = newVersion;
  // Increment build numbers
  if (appJson.expo.ios) {
    appJson.expo.ios.buildNumber = String(
      Number(appJson.expo.ios.buildNumber) + 1,
    );
  }
  if (appJson.expo.android) {
    appJson.expo.android.versionCode = appJson.expo.android.versionCode + 1;
  }
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');

  console.log(`✅ Version bumped to ${newVersion}`);
  console.log(`📱 iOS build number: ${appJson.expo.ios.buildNumber}`);
  console.log(`🤖 Android version code: ${appJson.expo.android.versionCode}`);

  return newVersion;
}

function bumpBuildNumber(platform = 'all') {
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const changes = [];

  if (platform === 'all' || platform === 'ios') {
    if (appJson.expo.ios) {
      const oldBuildNumber = appJson.expo.ios.buildNumber;
      appJson.expo.ios.buildNumber = String(
        Number(appJson.expo.ios.buildNumber) + 1,
      );
      changes.push(`iOS: ${oldBuildNumber} → ${appJson.expo.ios.buildNumber}`);
    }
  }

  if (platform === 'all' || platform === 'android') {
    if (appJson.expo.android) {
      const oldVersionCode = appJson.expo.android.versionCode;
      appJson.expo.android.versionCode = appJson.expo.android.versionCode + 1;
      changes.push(
        `Android: ${oldVersionCode} → ${appJson.expo.android.versionCode}`,
      );
    }
  }

  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');

  if (changes.length > 0) {
    console.log('✅ Build numbers incremented:');
    changes.forEach(change => console.log(`   ${change}`));
  } else {
    console.log('⚠️  No build numbers to increment');
  }

  return appJson;
}

function createGitTag(version) {
  const { execSync } = require('child_process');
  try {
    execSync(`git tag -a v${version} -m "Release v${version}"`, {
      stdio: 'inherit',
    });
    console.log(`✅ Git tag created: v${version}`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review and commit changes`);
    console.log(`   2. Push tag: git push origin v${version}`);
    console.log(`   3. Tag will trigger CI/CD build`);
  } catch (error) {
    console.warn('⚠️  Could not create git tag:', error.message);
    console.warn(
      '   You can create it manually: git tag -a v' +
        version +
        ' -m "Release v' +
        version +
        '"',
    );
  }
}

// CLI
const type = process.argv[2];
const platform = process.argv[3]; // Optional: ios, android, or all (default)

if (!type) {
  console.log('Usage:');
  console.log('  node scripts/version-manager.js [major|minor|patch]');
  console.log(
    '  node scripts/version-manager.js build [ios|android|all]  # Increment build number only',
  );
  console.log('\nCurrent version:', getCurrentVersion());

  // Show current build numbers
  try {
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    if (appJson.expo.ios?.buildNumber) {
      console.log('Current iOS build number:', appJson.expo.ios.buildNumber);
    }
    if (appJson.expo.android?.versionCode) {
      console.log(
        'Current Android version code:',
        appJson.expo.android.versionCode,
      );
    }
  } catch (error) {
    // Ignore errors reading app.json
  }

  process.exit(1);
}

if (type === 'build') {
  bumpBuildNumber(platform || 'all');
} else {
  const newVersion = bumpVersion(type);
  createGitTag(newVersion);
}
