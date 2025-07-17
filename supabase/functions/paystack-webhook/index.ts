// Setup type definitions for Supabase Edge Runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  try {
    const eventPayload = await req.json();
    const eventType = eventPayload.event;

    console.log("Received Paystack event:", eventType);

    switch (eventType) {
      case "charge.success":
        // ✅ Handle successful payment (e.g. mark user as subscribed)
        console.log("✅ charge.success event received");
        break;

      case "subscription.disable":
        // 🚫 Handle subscription cancellation (e.g. downgrade user)
        console.log("⚠️ subscription.disable event received");
        break;

      case "invoice.payment_failed":
        // ❌ Handle failed payment (e.g. alert user, retry)
        console.log("❌ invoice.payment_failed event received");
        break;

      default:
        console.log("ℹ️ Unhandled event type:", eventType);
        break;
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
