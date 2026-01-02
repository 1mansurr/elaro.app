import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { AppError } from '../_shared/function-handler.ts';
import {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
} from '../_shared/error-codes.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface WelcomeEmailRequest {
  userEmail: string;
  userFirstName: string;
  userId: string;
}

// Constant-time string comparison to prevent timing attacks
// SECURITY: This prevents attackers from learning which byte differs via timing analysis
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

/**
 * Create HMAC-SHA256 signature using Web Crypto API
 * SECURITY: Uses native crypto.subtle for secure HMAC computation
 *
 * @param key - HMAC secret key
 * @param message - Message to sign
 * @returns Hex-encoded HMAC signature
 */
async function createHmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify that used_nonces table exists and is accessible
 * SECURITY: Runtime guard prevents silent replay-protection failure
 * If table is missing, function fails CLOSED (500 error) to prevent security degradation
 *
 * @param supabaseAdmin - Supabase admin client
 * @param traceContext - Trace context for logging
 * @throws AppError with 500 status if table is missing
 */
async function verifyNonceTableExists(
  supabaseAdmin: ReturnType<typeof createClient>,
  traceContext: Record<string, unknown>,
): Promise<void> {
  // SECURITY: Perform a lightweight query to verify table exists
  // Using SELECT 1 with LIMIT 1 for minimal overhead
  const { error } = await supabaseAdmin
    .from('used_nonces')
    .select('id')
    .limit(1);

  if (error) {
    // PGRST301 = relation does not exist (table missing)
    // This indicates migration was not run or table was dropped
    if (error.code === 'PGRST301' || error.message.includes('does not exist')) {
      await logger.error(
        'CRITICAL: used_nonces table does not exist - replay protection disabled',
        {
          error_code: error.code,
          error_message: error.message,
        },
        traceContext,
      );
      throw new AppError(
        'Service configuration error: Replay protection table missing',
        ERROR_STATUS_CODES.CONFIG_ERROR,
        ERROR_CODES.CONFIG_ERROR,
      );
    }
    // Other errors (permissions, connection) also indicate problems
    await logger.error(
      'CRITICAL: Cannot access used_nonces table - replay protection may be disabled',
      {
        error_code: error.code,
        error_message: error.message,
      },
      traceContext,
    );
    throw new AppError(
      'Service configuration error: Cannot access replay protection table',
      ERROR_STATUS_CODES.CONFIG_ERROR,
      ERROR_CODES.CONFIG_ERROR,
    );
  }
}

/**
 * Validate HMAC secret strength and existence
 * SECURITY: Enforces minimum 32 bytes (256 bits) for cryptographic security
 * Fails CLOSED if secret is missing or too short
 *
 * @param hmacSecret - HMAC secret from environment
 * @param traceContext - Trace context for logging
 * @throws AppError with 500 status if secret is invalid
 */
async function validateHmacSecret(
  hmacSecret: string | undefined,
  traceContext: Record<string, unknown>,
): Promise<void> {
  if (!hmacSecret) {
    await logger.error(
      'CRITICAL: INTERNAL_HMAC_SECRET not configured - HMAC verification disabled',
      {},
      traceContext,
    );
    throw new AppError(
      'Service configuration error: HMAC secret not configured',
      ERROR_STATUS_CODES.CONFIG_ERROR,
      ERROR_CODES.CONFIG_ERROR,
    );
  }

  // SECURITY: Constant-time length check to prevent timing attacks
  // Minimum 32 bytes (256 bits) required for HMAC-SHA256 security
  // Using TextEncoder to get accurate byte length (handles UTF-8 correctly)
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(hmacSecret);
  const MIN_SECRET_LENGTH = 32; // 256 bits

  if (secretBytes.length < MIN_SECRET_LENGTH) {
    await logger.error(
      'CRITICAL: INTERNAL_HMAC_SECRET too short - minimum 32 bytes required',
      {
        secret_length_bytes: secretBytes.length,
        minimum_required: MIN_SECRET_LENGTH,
      },
      traceContext,
    );
    throw new AppError(
      'Service configuration error: HMAC secret too short (minimum 32 bytes)',
      ERROR_STATUS_CODES.CONFIG_ERROR,
      ERROR_CODES.CONFIG_ERROR,
    );
  }
}

/**
 * Verify HMAC signature for request authentication
 * SECURITY: Implements HMAC-SHA256 request signing to prevent:
 * - Replay attacks (via nonce + timestamp)
 * - Request tampering (via body signature)
 * - Service role key leakage (HMAC doesn't expose key)
 *
 * @param supabaseAdmin - Supabase admin client for nonce storage
 * @param req - HTTP request object
 * @param rawBody - Raw request body as string (for signature verification)
 * @returns true if signature is valid, throws AppError if invalid
 */
async function verifyHmacSignature(
  supabaseAdmin: ReturnType<typeof createClient>,
  req: Request,
  rawBody: string,
): Promise<void> {
  const traceContext = extractTraceContext(req);

  // SECURITY: Extract required headers - all must be present
  const signature = req.headers.get('X-Signature');
  const timestampStr = req.headers.get('X-Timestamp');
  const nonce = req.headers.get('X-Nonce');

  // SECURITY: Reject if any header is missing (don't reveal which one)
  if (!signature || !timestampStr || !nonce) {
    await logger.error(
      'HMAC verification failed: Missing required headers',
      {
        has_signature: !!signature,
        has_timestamp: !!timestampStr,
        has_nonce: !!nonce,
      },
      traceContext,
    );
    throw new AppError(
      ERROR_MESSAGES.UNAUTHORIZED,
      ERROR_STATUS_CODES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  }

  // SECURITY: Validate timestamp format and freshness (prevent replay of old requests)
  const timestamp = parseInt(timestampStr, 10);
  const now = Math.floor(Date.now() / 1000);
  const TIMESTAMP_TOLERANCE = 300; // 5 minutes in seconds

  if (isNaN(timestamp) || timestamp < now - TIMESTAMP_TOLERANCE) {
    await logger.error(
      'HMAC verification failed: Invalid or expired timestamp',
      {
        timestamp,
        now,
        age_seconds: now - timestamp,
      },
      traceContext,
    );
    throw new AppError(
      ERROR_MESSAGES.UNAUTHORIZED,
      ERROR_STATUS_CODES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  }

  // SECURITY: Check if nonce has already been used (prevent replay attacks)
  // This enforces one-time use of each nonce within the TTL window
  const { data: existingNonce, error: nonceError } = await supabaseAdmin
    .from('used_nonces')
    .select('id')
    .eq('nonce', nonce)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (nonceError && nonceError.code !== 'PGRST116') {
    // PGRST116 = not found (expected for new nonces)
    // Other errors indicate database issues
    await logger.error(
      'HMAC verification failed: Error checking nonce',
      {
        error: nonceError.message,
        error_code: nonceError.code,
      },
      traceContext,
    );
    throw new AppError(
      ERROR_MESSAGES.UNAUTHORIZED,
      ERROR_STATUS_CODES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  }

  if (existingNonce) {
    // SECURITY: Nonce already used - this is a replay attack
    await logger.error(
      'HMAC verification failed: Nonce already used (replay attack detected)',
      {
        nonce_prefix: nonce.substring(0, 8),
      },
      traceContext,
    );
    throw new AppError(
      ERROR_MESSAGES.UNAUTHORIZED,
      ERROR_STATUS_CODES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  }

  // SECURITY: Validate HMAC secret strength before use
  // This ensures secret meets minimum cryptographic requirements (32 bytes)
  const hmacSecret = Deno.env.get('INTERNAL_HMAC_SECRET');
  await validateHmacSecret(hmacSecret, traceContext);

  // SECURITY: Compute expected signature using canonical string format
  // Format: `${timestamp}.${nonce}.${raw_request_body}`
  // This ensures timestamp, nonce, and body are all included in signature
  const canonicalString = `${timestamp}.${nonce}.${rawBody}`;

  const expectedSignature = await createHmacSha256(hmacSecret, canonicalString);

  // SECURITY: Constant-time comparison prevents timing attacks
  // Attacker cannot learn which byte differs by measuring response time
  const isValid = constantTimeCompare(signature, expectedSignature);

  if (!isValid) {
    await logger.error(
      'HMAC verification failed: Signature mismatch',
      {
        signature_prefix: signature.substring(0, 8),
        expected_prefix: expectedSignature.substring(0, 8),
      },
      traceContext,
    );
    throw new AppError(
      ERROR_MESSAGES.UNAUTHORIZED,
      ERROR_STATUS_CODES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  }

  // SECURITY: Store nonce to prevent reuse (TTL: 10 minutes)
  // This must happen AFTER signature verification to prevent nonce exhaustion attacks
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const { error: insertError } = await supabaseAdmin
    .from('used_nonces')
    .insert({
      nonce,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    // Log but don't fail - nonce storage is best-effort
    // If storage fails, we still verified the signature
    await logger.warn(
      'Failed to store nonce (non-critical)',
      {
        error: insertError.message,
        nonce_prefix: nonce.substring(0, 8),
      },
      traceContext,
    );
  }

  await logger.info(
    'HMAC signature verified successfully',
    {
      nonce_prefix: nonce.substring(0, 8),
      timestamp,
    },
    traceContext,
  );
}

serve(async req => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceContext = extractTraceContext(req);

  try {
    // SECURITY: Read raw body BEFORE parsing JSON
    // This is required for HMAC signature verification which signs the raw body
    const rawBody = await req.text();

    // SECURITY: Create Supabase admin client for nonce storage
    // This is needed before authentication to check nonce reuse
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // SECURITY: Runtime guard - verify used_nonces table exists
    // This prevents silent replay-protection failure if migration was not run
    // Fails CLOSED (500) if table is missing to prevent security degradation
    await verifyNonceTableExists(supabaseAdmin, traceContext);

    // SECURITY: Verify HMAC signature FIRST
    // This protects against replay attacks and request tampering
    // HMAC verification includes:
    // - Timestamp freshness check (max 5 minutes old)
    // - Nonce uniqueness check (prevents replay)
    // - Body signature verification (prevents tampering)
    await verifyHmacSignature(supabaseAdmin, req, rawBody);

    // SECURITY: Validate service role key authentication (SECOND check)
    // BOTH HMAC signature AND service role key must be valid
    // This provides defense in depth:
    // - HMAC prevents replay/tampering without exposing service key
    // - Service key provides additional authentication layer
    const authHeader = req.headers.get('Authorization');
    const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!expectedKey) {
      await logger.error('Service role key not configured', {}, traceContext);
      throw new AppError(
        'Service configuration error',
        ERROR_STATUS_CODES.CONFIG_ERROR,
        ERROR_CODES.CONFIG_ERROR,
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await logger.error(
        'Missing or invalid Authorization header',
        {},
        traceContext,
      );
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        ERROR_STATUS_CODES.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
      );
    }

    const receivedKey = authHeader.replace('Bearer ', '');
    const isValid = constantTimeCompare(receivedKey, expectedKey);

    if (!isValid) {
      await logger.error('Invalid service role key', {}, traceContext);
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        ERROR_STATUS_CODES.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
      );
    }

    // SECURITY: Parse JSON after authentication passes
    // This prevents processing malicious payloads before auth verification
    const { userEmail, userFirstName, userId }: WelcomeEmailRequest =
      JSON.parse(rawBody);

    // Validate required fields
    if (!userEmail || !userId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: userEmail and userId',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    await logger.info(
      'Sending welcome email',
      { user_id: userId, user_email: userEmail },
      traceContext,
    );

    // Send the welcome email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Mansur @ ELARO <mansur@myelaro.com>',
      to: [userEmail],
      subject: 'Welcome to ELARO!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ELARO</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                        🎓 Welcome to ELARO!
                      </h1>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; font-size: 18px; color: #333333; line-height: 1.6;">
                        Hi ${userFirstName},
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        I'm <strong>Mansur</strong> : the creator of ELARO.
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        I just wanted to personally welcome you aboard. I'm genuinely excited to have you join our community of learners who want to think clearer, remember better, and study smarter.
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        When I started building ELARO, my big vision was simple:<br>
                        <em>to create a set of tools that serve you the way an assistant serves a boss ; organized, reliable, and always one step ahead.</em>
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        Along the way, I realized one core problem kept coming up again and again: <strong>forgetfulness</strong>.
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        That's where I decided to begin — helping you beat forgetfulness with smarter reminders, repetition, and structure that actually stick.
                      </p>

                      <p style="margin: 0 0 30px; font-size: 16px; color: #555555; line-height: 1.8;">
                        Welcome once again to ELARO. I'm glad you're here.
                      </p>

                      <p style="margin: 0 0 30px; font-size: 16px; color: #555555; line-height: 1.8;">
                        If you have any questions or ideas, just hit reply — I'd love to hear from you.
                      </p>

                      <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.8;">
                        Warmly,<br>
                        <strong>Mansur</strong><br>
                        <span style="color: #888888; font-size: 14px;">Creator of ELARO</span>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #888888;">
                        © ${new Date().getFullYear()} ELARO. All rights reserved.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
                        You're receiving this email because you signed up for ELARO.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      await logger.error(
        'Resend error',
        {
          user_id: userId,
          user_email: userEmail,
          error: error instanceof Error ? error.message : String(error),
        },
        traceContext,
      );
      return new Response(
        JSON.stringify({
          error: 'Failed to send welcome email',
          details: error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    await logger.info(
      'Welcome email sent successfully',
      { user_id: userId, user_email: userEmail },
      traceContext,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully',
        emailId: data?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    // SECURITY: Use existing traceContext from top of function
    // This ensures consistent tracing across the request lifecycle
    await logger.error(
      'Error sending welcome email',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    const status =
      error instanceof AppError
        ? error.statusCode
        : ERROR_STATUS_CODES.INTERNAL_ERROR;
    const message =
      error instanceof AppError
        ? error.message
        : ERROR_MESSAGES.INTERNAL_ERROR || 'Internal server error';

    return new Response(
      JSON.stringify({
        error: message,
        code:
          error instanceof AppError ? error.code : ERROR_CODES.INTERNAL_ERROR,
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
