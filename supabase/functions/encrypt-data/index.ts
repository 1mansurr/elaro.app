// FILE: supabase/functions/encrypt-data/index.ts
// Create this new Edge Function to expose the encryption logic.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encrypt } from '../_shared/encryption.ts';

serve(async req => {
  // PASS 1: Crash safety - wrap req.json() in try/catch
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // PASS 2: Validate body is object before destructuring
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return new Response(
      JSON.stringify({ error: 'Request body must be an object' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const bodyObj = body as { text?: unknown };
  const { text } = bodyObj;

  const secretKey = Deno.env.get('ENCRYPTION_KEY');

  if (!secretKey) {
    return new Response(
      JSON.stringify({ error: 'Encryption key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // PASS 2: Validate text is a non-empty string
  if (typeof text !== 'string' || text.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'text must be a non-empty string' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encryptedText = await encrypt(text, secretKey);
  return new Response(JSON.stringify({ encryptedText }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
