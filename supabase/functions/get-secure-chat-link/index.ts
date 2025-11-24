import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';

// Helper function to create HMAC SHA256 hash using Deno's built-in Web Crypto API
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

// No schema needed for this function (no body input)
serve(
  createAuthenticatedHandler(
    async ({ user, supabaseClient }) => {
      // Get user profile
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw handleDbError(profileError);
      }

      if (!userProfile) {
        throw new AppError(
          'Could not retrieve user profile',
          500,
          ERROR_CODES.DB_ERROR,
        );
      }

      // Get API key from environment
      const apiKey = Deno.env.get('TAWK_TO_API_KEY');
      if (!apiKey) {
        throw new AppError(
          'TAWK_TO_API_KEY is not configured',
          500,
          ERROR_CODES.CONFIG_ERROR,
        );
      }

      // Generate secure hash
      const userId = user.id;
      const userName =
        `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() ||
        userProfile.email;
      const userEmail = userProfile.email;
      const hash = await createHmacSha256(apiKey, userId);

      // Construct URL
      const tawkToChatId = '685fb69800ff9419109c4db9/default';
      const secureUrl = `https://tawk.to/chat/${tawkToChatId}?$name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&userId=${encodeURIComponent(userId)}&hash=${hash}`;

      return { secureUrl };
    },
    {
      rateLimitName: 'get-secure-chat-link',
      // No schema needed - function doesn't accept body input
    },
  ),
);
