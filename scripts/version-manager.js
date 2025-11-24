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
if (!type) {
  console.log('Usage: node scripts/version-manager.js [major|minor|patch]');
  console.log('\nCurrent version:', getCurrentVersion());
  process.exit(1);
}

const newVersion = bumpVersion(type);
createGitTag(newVersion);
