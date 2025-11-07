import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface WelcomeEmailRequest {
  userEmail: string;
  userFirstName: string;
  userId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { userEmail, userFirstName, userId }: WelcomeEmailRequest =
      await req.json();

    // Validate required fields
    if (!userEmail || !userId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: userEmail and userId',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const traceContext = extractTraceContext(req);
    await logger.info(
      'Sending welcome email',
      { user_id: userId, user_email: userEmail },
      traceContext,
    );

    // Send the welcome email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Mansur @ ELARO <mansur@myelaro.com>',
      to: [userEmail],
      subject: 'Welcome to ELARO!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ELARO</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                        🎓 Welcome to ELARO!
                      </h1>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; font-size: 18px; color: #333333; line-height: 1.6;">
                        Hi ${userFirstName},
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        I'm <strong>Mansur</strong> : the creator of ELARO.
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        I just wanted to personally welcome you aboard. I'm genuinely excited to have you join our community of learners who want to think clearer, remember better, and study smarter.
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        When I started building ELARO, my big vision was simple:<br>
                        <em>to create a set of tools that serve you the way an assistant serves a boss ; organized, reliable, and always one step ahead.</em>
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        Along the way, I realized one core problem kept coming up again and again: <strong>forgetfulness</strong>.
                      </p>

                      <p style="margin: 0 0 20px; font-size: 16px; color: #555555; line-height: 1.8;">
                        That's where I decided to begin — helping you beat forgetfulness with smarter reminders, repetition, and structure that actually stick.
                      </p>

                      <p style="margin: 0 0 30px; font-size: 16px; color: #555555; line-height: 1.8;">
                        Welcome once again to ELARO. I'm glad you're here.
                      </p>

                      <p style="margin: 0 0 30px; font-size: 16px; color: #555555; line-height: 1.8;">
                        If you have any questions or ideas, just hit reply — I'd love to hear from you.
                      </p>

                      <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.8;">
                        Warmly,<br>
                        <strong>Mansur</strong><br>
                        <span style="color: #888888; font-size: 14px;">Creator of ELARO</span>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #888888;">
                        © ${new Date().getFullYear()} ELARO. All rights reserved.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #aaaaaa;">
                        You're receiving this email because you signed up for ELARO.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      await logger.error(
        'Resend error',
        {
          user_id: userId,
          user_email: userEmail,
          error: error instanceof Error ? error.message : String(error),
        },
        traceContext,
      );
      return new Response(
        JSON.stringify({
          error: 'Failed to send welcome email',
          details: error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    await logger.info(
      'Welcome email sent successfully',
      { user_id: userId, user_email: userEmail },
      traceContext,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully',
        emailId: data?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Error sending welcome email',
      {
        error: error instanceof Error ? error.message : String(error),
      },
      traceContext,
    );
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
