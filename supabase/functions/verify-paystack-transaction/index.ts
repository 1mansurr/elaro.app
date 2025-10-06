// FILE: supabase/functions/verify-paystack-transaction/index.ts
// Create this new file and its parent directory.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

serve(async (req ) => {
  // This function requires the user to be authenticated.
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { reference } = await req.json();
  if (!reference) {
    return new Response("Missing transaction reference", { status: 400 });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get("EXPO_PUBLIC_PAYSTACK_SECRET_KEY");

  try {
    // Make a server-to-server call to Paystack's verification endpoint.
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    } );

    const responseData = await response.json();

    if (responseData.status && responseData.data.status === 'success') {
      // Transaction is verified and successful.
      // The webhook will handle the database update.
      // We just need to confirm success to the client.
      console.log(`Transaction ${reference} verified successfully for user ${user.id}`);
      return new Response(JSON.stringify({ verified: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Transaction failed verification.
      console.warn(`Transaction ${reference} verification failed for user ${user.id}`, responseData);
      return new Response(JSON.stringify({ verified: false, message: responseData.message }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
  } catch (error) {
    console.error("Error verifying Paystack transaction:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
