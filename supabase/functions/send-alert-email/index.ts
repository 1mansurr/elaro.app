import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json();

    // Use Resend API for email delivery (if configured)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('ALERT_EMAIL_FROM') || 'alerts@elaro.app',
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
        message: 'Email service not configured. Set RESEND_API_KEY environment variable.',
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

