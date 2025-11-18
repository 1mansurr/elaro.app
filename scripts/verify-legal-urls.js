#!/usr/bin/env node

/**
 * Legal URLs Verification Script
 *
 * Verifies that both Terms of Service and Privacy Policy URLs are accessible
 * and return HTTP 200 status codes.
 *
 * Usage: node scripts/verify-legal-urls.js
 */

const LEGAL_URLS = {
  TERMS_OF_SERVICE: 'https://myelaro.com/terms',
  PRIVACY_POLICY: 'https://myelaro.com/privacy',
};

async function verifyUrl(url, name) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
    });

    if (response.ok) {
      console.log(`✅ ${name}: Accessible (${response.status})`);
      return true;
    } else {
      console.error(`❌ ${name}: Not accessible (${response.status})`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name}: Error - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Verifying Legal URLs...\n');

  const [termsAccessible, privacyAccessible] = await Promise.all([
    verifyUrl(LEGAL_URLS.TERMS_OF_SERVICE, 'Terms of Service'),
    verifyUrl(LEGAL_URLS.PRIVACY_POLICY, 'Privacy Policy'),
  ]);

  console.log('\n📊 Summary:');
  console.log(
    `Terms of Service: ${termsAccessible ? '✅ Accessible' : '❌ Not Accessible'}`,
  );
  console.log(
    `Privacy Policy: ${privacyAccessible ? '✅ Accessible' : '❌ Not Accessible'}`,
  );
  console.log(
    `Overall: ${termsAccessible && privacyAccessible ? '✅ All URLs accessible' : '❌ Some URLs are not accessible'}\n`,
  );

  if (!termsAccessible || !privacyAccessible) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
