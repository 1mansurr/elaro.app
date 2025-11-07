// FILE: supabase/functions/decrypt-data/index.ts
// Create this new Edge Function to expose the decryption logic.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { decrypt } from '../_shared/encryption.ts';

serve(async req => {
  const { encryptedText } = await req.json();
  const secretKey = Deno.env.get('ENCRYPTION_KEY');

  if (!secretKey) {
    return new Response('Encryption key not configured', { status: 500 });
  }
  if (!encryptedText) {
    return new Response('No encrypted text provided', { status: 400 });
  }

  const decryptedText = await decrypt(encryptedText, secretKey);
  return new Response(JSON.stringify({ decryptedText }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
