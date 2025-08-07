// Setup type definitions for Supabase Edge Runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { initSentry, captureException } from '../_shared/sentry.ts';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req: Request) => {
  initSentry();
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // --- 1. GET SECRET KEY AND SIGNATURE FROM HEADERS ---
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const signature = req.headers.get('x-paystack-signature');
    if (!paystackSecretKey || !signature) {
      console.error('Missing Paystack secret key or signature.');
      return new Response('Configuration error.', { status: 400 });
    }

    // --- 2. READ THE RAW REQUEST BODY ---
    const requestBody = await req.text();

    // --- 3. VERIFY THE SIGNATURE USING DENO WEB CRYPTO API ---
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(paystackSecretKey),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign', 'verify'],
    );
    const sigBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      enc.encode(requestBody),
    );
    const hash = toHex(sigBuffer);
    if (hash !== signature) {
      // SIGNATURE MISMATCH - REJECT THE REQUEST
      return new Response('Invalid signature.', { status: 401 });
    }

    // --- SIGNATURE IS VALID - PROCEED WITH EXISTING LOGIC ---
    const eventPayload = JSON.parse(requestBody);
    const eventType = eventPayload.event;

    console.log('Received Paystack event:', eventType);

    switch (eventType) {
      case 'charge.success':
        // ✅ Handle successful payment (e.g. mark user as subscribed)
        console.log('✅ charge.success event received');
        break;

      case 'subscription.disable':
        // 🚫 Handle subscription cancellation (e.g. downgrade user)
        console.log('⚠️ subscription.disable event received');
        break;

      case 'invoice.payment_failed':
        // ❌ Handle failed payment (e.g. alert user, retry)
        console.log('❌ invoice.payment_failed event received');
        break;

      default:
        console.log('ℹ️ Unhandled event type:', eventType);
        break;
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (err) {
    captureException(err);
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      headers: corsHeaders,
      status: 400,
    });
  }
});
