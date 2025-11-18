/**
 * Legal URLs and Policy Links
 *
 * Centralized location for all legal document URLs to ensure consistency
 * across the application.
 */

export const LEGAL_URLS = {
  TERMS_OF_SERVICE: 'https://myelaro.com/terms',
  PRIVACY_POLICY: 'https://myelaro.com/privacy',
} as const;

/**
 * Verify that legal URLs are accessible
 * Returns true if both URLs return 200 status
 */
export async function verifyLegalUrls(): Promise<{
  termsAccessible: boolean;
  privacyAccessible: boolean;
  allAccessible: boolean;
}> {
  try {
    const [termsResponse, privacyResponse] = await Promise.all([
      fetch(LEGAL_URLS.TERMS_OF_SERVICE, { method: 'HEAD' }),
      fetch(LEGAL_URLS.PRIVACY_POLICY, { method: 'HEAD' }),
    ]);

    const termsAccessible = termsResponse.ok;
    const privacyAccessible = privacyResponse.ok;

    return {
      termsAccessible,
      privacyAccessible,
      allAccessible: termsAccessible && privacyAccessible,
    };
  } catch (error) {
    console.error('Error verifying legal URLs:', error);
    return {
      termsAccessible: false,
      privacyAccessible: false,
      allAccessible: false,
    };
  }
}
