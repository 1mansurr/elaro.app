const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// ===== CONFIGURATION - Load from environment variables =====
const TEAM_ID = process.env.APPLE_TEAM_ID; // Your Apple Developer Team ID
const KEY_ID = process.env.APPLE_KEY_ID; // The Key ID from Apple Developer portal
const CLIENT_ID = process.env.APPLE_CLIENT_ID; // Your Services ID
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH; // Path to your .p8 private key file
// =========================================================

async function generateAppleClientSecret() {
  try {
    // Validate required environment variables
    if (!PRIVATE_KEY_PATH) {
      console.error(
        '❌ Error: APPLE_PRIVATE_KEY_PATH environment variable is required',
      );
      console.error('\nPlease set APPLE_PRIVATE_KEY_PATH in your .env file:');
      console.error(
        'APPLE_PRIVATE_KEY_PATH=/absolute/path/to/your/AuthKey_XXXXX.p8',
      );
      console.error(
        '\nYou can download the key from: https://developer.apple.com/account/resources/authkeys/list',
      );
      console.error(
        '\n⚠️  IMPORTANT: Never commit .p8 files to the repository!',
      );
      process.exit(1);
    }

    if (!TEAM_ID) {
      console.error('❌ Error: APPLE_TEAM_ID environment variable is required');
      process.exit(1);
    }

    if (!KEY_ID) {
      console.error('❌ Error: APPLE_KEY_ID environment variable is required');
      process.exit(1);
    }

    if (!CLIENT_ID) {
      console.error(
        '❌ Error: APPLE_CLIENT_ID environment variable is required',
      );
      process.exit(1);
    }

    // Check if the private key file exists
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
      console.error('❌ Error: Private key file not found!');
      console.error(`Expected file: ${PRIVATE_KEY_PATH}`);
      console.error('\nPlease ensure:');
      console.error(
        '1. You have downloaded the .p8 file from Apple Developer portal',
      );
      console.error('2. The file path is correct and absolute');
      console.error('3. The file exists at the specified location');
      process.exit(1);
    }

    // Read the private key file
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    // JWT payload
    const payload = {
      iss: TEAM_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60, // 180 days from now
      aud: 'https://appleid.apple.com',
      sub: CLIENT_ID,
    };

    // JWT header
    const header = {
      alg: 'ES256',
      kid: KEY_ID,
    };

    // Generate the JWT
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: header,
    });

    // Output the result
    console.log('✅ Apple Client Secret (JWT) generated successfully!');
    console.log('Copy and paste this string into Supabase as the Secret Key:');
    console.log('');
    console.log(token);
    console.log('');
    console.log('📝 Note: This JWT expires in 180 days (6 months)');
    console.log('🔄 Remember to regenerate it before expiration!');
  } catch (error) {
    console.error('❌ Error generating Apple Client Secret:');
    console.error(error.message);

    if (error.message.includes('PEM')) {
      console.error(
        '\n💡 Tip: Make sure your .p8 file is a valid PEM format private key',
      );
    }

    process.exit(1);
  }
}

// Run the script : node generate-apple-secret.js
generateAppleClientSecret();
