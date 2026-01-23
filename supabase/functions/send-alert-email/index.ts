// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  try {
    // PASS 1: Crash safety - wrap req.json() in try/catch (already in outer try, but be explicit)
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

    const bodyObj = body as { to?: unknown; subject?: unknown; html?: unknown };
    const { to, subject, html } = bodyObj;

    // PASS 2: Validate required fields
    if (typeof to !== 'string' || to.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'to must be a non-empty string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (typeof subject !== 'string' || subject.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'subject must be a non-empty string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (typeof html !== 'string' || html.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'html must be a non-empty string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Use Resend API for email delivery (if configured)
    // @ts-expect-error - Deno.env is available at runtime in Deno
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // @ts-expect-error - Deno.env is available at runtime in Deno
          from: Deno.env.get('ALERT_EMAIL_FROM') || 'alerts@myelaro.com',
          to,
          subject,
          html,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify({ success: true, id: data.id }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        const error = await response.text();
        console.error('Resend API error:', error);
      }
    }

    // Fallback: log to console (for development)
    console.log('Email Alert (not sent - RESEND_API_KEY not configured):', {
      to,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({
        success: false,
        message:
          'Email service not configured. Set RESEND_API_KEY environment variable.',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Email alert error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
