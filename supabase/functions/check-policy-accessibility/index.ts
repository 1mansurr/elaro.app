/**
 * Check Policy Accessibility Function
 * 
 * Scheduled function that checks if Privacy Policy and Terms of Service URLs
 * are accessible. Logs errors to Sentry if URLs are unreachable.
 * 
 * Runs: Daily (via cron or scheduled trigger)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
// Sentry is optional - will import dynamically if needed

const LEGAL_URLS = {
  TERMS_OF_SERVICE: 'https://myelaro.com/terms',
  PRIVACY_POLICY: 'https://myelaro.com/privacy',
};

interface UrlCheckResult {
  url: string;
  name: string;
  accessible: boolean;
  statusCode?: number;
  error?: string;
  checkedAt: string;
}

async function checkUrl(url: string, name: string): Promise<UrlCheckResult> {
  const checkedAt = new Date().toISOString();
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const accessible = response.ok;
    const statusCode = response.status;

    if (!accessible) {
      const error = `HTTP ${statusCode}: ${response.statusText}`;
      await logger.error(
        `Policy URL not accessible: ${name}`,
        {
          url,
          status_code: statusCode,
          status_text: response.statusText,
        },
        { traceId: 'policy-check' },
      );

      // Note: Errors are logged via logger above, which will be picked up by monitoring
    }

    return {
      url,
      name,
      accessible,
      statusCode,
      checkedAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger.error(
      `Error checking policy URL: ${name}`,
      {
        url,
        error: errorMessage,
      },
      { traceId: 'policy-check' },
    );

      // Note: Errors are logged via logger above, which will be picked up by monitoring

    return {
      url,
      name,
      accessible: false,
      error: errorMessage,
      checkedAt,
    };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceContext = extractTraceContext(req);
  await logger.info(
    'Starting policy accessibility check',
    {},
    traceContext,
  );

  try {
    // Check both URLs in parallel
    const [termsResult, privacyResult] = await Promise.all([
      checkUrl(LEGAL_URLS.TERMS_OF_SERVICE, 'Terms of Service'),
      checkUrl(LEGAL_URLS.PRIVACY_POLICY, 'Privacy Policy'),
    ]);

    const allAccessible = termsResult.accessible && privacyResult.accessible;

    const result = {
      checkedAt: new Date().toISOString(),
      allAccessible,
      results: {
        termsOfService: termsResult,
        privacyPolicy: privacyResult,
      },
      summary: {
        totalChecked: 2,
        accessible: (termsResult.accessible ? 1 : 0) + (privacyResult.accessible ? 1 : 0),
        inaccessible: (termsResult.accessible ? 0 : 1) + (privacyResult.accessible ? 0 : 1),
      },
    };

    await logger.info(
      'Policy accessibility check completed',
      {
        all_accessible: allAccessible,
        terms_accessible: termsResult.accessible,
        privacy_accessible: privacyResult.accessible,
      },
      traceContext,
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    await logger.error(
      'Error during policy accessibility check',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );

    // Note: Errors are logged via logger above, which will be picked up by monitoring

    return new Response(
      JSON.stringify({
        error: 'Failed to check policy accessibility',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

