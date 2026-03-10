/**
 * Alert Delivery Service
 *
 * Delivers quota and budget alerts via multiple channels
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { logger } from './logging.ts';

interface Alert {
  id: string;
  type: 'quota' | 'budget';
  serviceName: string;
  level: 'warning' | 'critical';
  message: string;
  percentage: number;
  sentAt: string;
}

/**
 * Send alert via email (using Supabase Edge Function email service or Resend)
 */
async function sendEmailAlert(alert: Alert): Promise<boolean> {
  try {
    // Get admin email from environment or database
    // @ts-expect-error - Deno.env is available at runtime in Deno
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@myelaro.com';

    // Use Supabase Edge Function to send email
    // @ts-expect-error - Deno.env is available at runtime in Deno
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-expect-error - Deno.env is available at runtime in Deno
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-alert-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              to: adminEmail,
              subject: `[${alert.level.toUpperCase()}] ${alert.type} Alert: ${alert.serviceName}`,
              html: `
                <h2>${alert.type === 'quota' ? 'Quota' : 'Budget'} Alert</h2>
                <p><strong>Service:</strong> ${alert.serviceName}</p>
                <p><strong>Level:</strong> ${alert.level}</p>
                <p><strong>Percentage:</strong> ${alert.percentage}%</p>
                <p><strong>Message:</strong> ${alert.message}</p>
                <p><strong>Time:</strong> ${alert.sentAt}</p>
              `,
            }),
          },
        );

        if (emailResponse.ok) {
          await logger.info('Email alert sent successfully', {
            alertId: alert.id,
            service: alert.serviceName,
          });
          return true;
        }
      } catch (error) {
        await logger.warn('Failed to send email via edge function', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Fallback: log to console
    console.log('Email Alert:', {
      to: adminEmail,
      subject: `[${alert.level.toUpperCase()}] ${alert.type} Alert: ${alert.serviceName}`,
      message: alert.message,
    });

    return false;
  } catch (error) {
    await logger.error('Failed to send email alert', {
      error: error instanceof Error ? error.message : String(error),
      alert,
    });
    return false;
  }
}

/**
 * Send alert via Slack webhook
 */
async function sendSlackAlert(alert: Alert): Promise<boolean> {
  try {
    // @ts-expect-error - Deno.env is available at runtime in Deno
    const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {
      return false; // Slack not configured
    }

    const color = alert.level === 'critical' ? '#ff0000' : '#ffaa00';
    const emoji = alert.level === 'critical' ? '🔴' : '⚠️';

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: `${emoji} ${alert.type === 'quota' ? 'Quota' : 'Budget'} Alert: ${alert.serviceName}`,
            fields: [
              {
                title: 'Level',
                value: alert.level,
                short: true,
              },
              {
                title: 'Percentage',
                value: `${alert.percentage}%`,
                short: true,
              },
              {
                title: 'Message',
                value: alert.message,
                short: false,
              },
            ],
            footer: 'ELARO Monitoring',
            ts: Math.floor(new Date(alert.sentAt).getTime() / 1000),
          },
        ],
      }),
    });

    if (response.ok) {
      await logger.info('Slack alert sent successfully', {
        alertId: alert.id,
        service: alert.serviceName,
      });
      return true;
    }

    return false;
  } catch (error) {
    await logger.error('Failed to send Slack alert', {
      error: error instanceof Error ? error.message : String(error),
      alert,
    });
    return false;
  }
}

/**
 * Store alert in database for dashboard viewing
 */
async function storeAlert(
  supabaseClient: SupabaseClient,
  alert: Alert,
  deliveryResults: { email: boolean; slack: boolean },
): Promise<void> {
  try {
    const { error } = await supabaseClient.from('alert_deliveries').insert({
      alert_id: alert.id,
      alert_type: alert.type,
      service_name: alert.serviceName,
      level: alert.level,
      message: alert.message,
      percentage: alert.percentage,
      delivered_at: new Date().toISOString(),
      email_sent: deliveryResults.email,
      slack_sent: deliveryResults.slack,
    });

    if (error) {
      await logger.error('Failed to store alert delivery', {
        error: error.message,
        alert,
      });
    }
  } catch (error) {
    await logger.error('Exception storing alert delivery', {
      error: error instanceof Error ? error.message : String(error),
      alert,
    });
  }
}

/**
 * Deliver alert via all configured channels
 */
export async function deliverAlert(
  supabaseClient: SupabaseClient,
  alert: Alert,
): Promise<{ email: boolean; slack: boolean; stored: boolean }> {
  const results = {
    email: false,
    slack: false,
    stored: false,
  };

  // Send email alert
  results.email = await sendEmailAlert(alert);

  // Send Slack alert
  results.slack = await sendSlackAlert(alert);

  // Store alert in database
  try {
    await storeAlert(supabaseClient, alert, results);
    results.stored = true;
  } catch (error) {
    await logger.error('Failed to store alert', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}
