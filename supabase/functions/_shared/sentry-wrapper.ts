// FILE: supabase/functions/_shared/sentry-wrapper.ts

import * as sentry from 'https://deno.land/x/sentry_deno/mod.ts';

// Initialize Sentry (it's safe to call this multiple times )
// In a real app, you'd get the DSN from environment variables.
sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
});

// Define the type for the handler function we will be wrapping
type RequestHandler = (req: Request) => Promise<Response>;

export function serveWithSentry(handler: RequestHandler) {
  return async (req: Request): Promise<Response> => {
    try {
      // Attempt to execute the original handler
      return await handler(req);
    } catch (error) {
      // If an error occurs, capture it with Sentry
      console.error("Caught error in Sentry wrapper:", error);
      sentry.captureException(error);

      // Return a generic 500 error response
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
