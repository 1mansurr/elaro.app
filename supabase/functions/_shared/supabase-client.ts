// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export function createSupabaseClient(req: Request) {
  return createClient(
    // @ts-expect-error - Deno.env is available at runtime in Deno
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-expect-error - Deno.env is available at runtime in Deno
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    },
  );
}
