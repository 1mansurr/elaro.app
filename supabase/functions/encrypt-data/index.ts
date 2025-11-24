// FILE: supabase/functions/encrypt-data/index.ts
// Create this new Edge Function to expose the encryption logic.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encrypt } from '../_shared/encryption.ts';

serve(async req => {
  const { text } = await req.json();
  const secretKey = Deno.env.get('ENCRYPTION_KEY');

  if (!secretKey) {
    return new Response('Encryption key not configured', { status: 500 });
  }
  if (!text) {
    return new Response('No text provided', { status: 400 });
  }

  const encryptedText = await encrypt(text, secretKey);
  return new Response(JSON.stringify({ encryptedText }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
