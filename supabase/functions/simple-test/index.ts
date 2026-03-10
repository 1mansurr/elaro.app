// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  console.log('Simple test function called');
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  console.log('Processing request');

  try {
    const response = {
      message: 'Hello from simple test function',
      timestamp: new Date().toISOString(),
      method: req.method,
    };

    console.log('Returning response:', response);

    return new Response(JSON.stringify(response), {
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error in simple test:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
      status: 500,
    });
  }
});
