/**
 * Consolidated Email System Edge Function
 *
 * This function consolidates all email-related operations that were previously
 * spread across multiple separate Edge Functions.
 *
 * Routes:
 * - POST /email-system/send-welcome - Send welcome email
 * - POST /email-system/send-custom - Send custom email
 * - GET /email-system/templates - Get email templates
 * - POST /email-system/schedule - Schedule email
 */

// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/response.ts';
import {
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { wrapOldHandler, handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { z } from 'zod';
import {
  type SupabaseClient,
  type User,
  // @ts-expect-error - Deno URL imports are valid at runtime but VS Code TypeScript doesn't recognize them
} from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const WelcomeEmailSchema = z.object({
  userEmail: z.string().email(),
  userFirstName: z.string().min(1),
  userId: z.string().uuid(),
});

const CustomEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.string().min(1),
  data: z.record(z.unknown()),
});

// Email service class
class EmailService {
  constructor(
    private supabaseClient: SupabaseClient,
    private user: User,
  ) {}

  private getResendClient(): Resend {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      throw new AppError(
        'RESEND_API_KEY is not configured',
        500,
        ERROR_CODES.CONFIG_ERROR,
      );
    }
    return new Resend(apiKey);
  }

  async sendWelcomeEmail(data: Record<string, unknown>) {
    // PASS 1: Use safeParse to prevent ZodError from crashing worker
    const validationResult = WelcomeEmailSchema.safeParse(data);
    if (!validationResult.success) {
      const zodError = validationResult.error;
      const flattened = zodError.flatten();
      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
        message: 'Request body validation failed',
        errors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      });
    }
    const { userEmail, userFirstName, userId: _userId } = validationResult.data;

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to ELARO</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ELARO! 🎓</h1>
              <p>Your academic journey starts here</p>
            </div>
            <div class="content">
              <h2>Hi ${userFirstName}!</h2>
              <p>Welcome to ELARO, your personal academic companion! We're excited to help you organize your studies, track your progress, and achieve your academic goals.</p>
              
              <h3>What you can do with ELARO:</h3>
              <ul>
                <li>📚 Organize your courses and assignments</li>
                <li>📅 Track your study sessions and lectures</li>
                <li>🧠 Use spaced repetition for better learning</li>
                <li>📊 Monitor your academic progress</li>
                <li>🔔 Get personalized reminders</li>
              </ul>
              
              <p>Ready to get started? Click the button below to begin your academic journey!</p>
              
              <a href="https://myelaro.com/dashboard" class="button">Get Started</a>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              
              <p>Best regards,<br>The ELARO Team</p>
            </div>
            <div class="footer">
              <p>© 2024 ELARO. All rights reserved.</p>
              <p>You received this email because you signed up for ELARO.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resend = this.getResendClient();
    const { data: emailData, error } = await resend.emails.send({
      from: 'ELARO <noreply@myelaro.com>',
      to: [userEmail],
      subject: 'Welcome to ELARO! 🎓',
      html: emailContent,
    });

    if (error) {
      throw new AppError(
        `Failed to send welcome email: ${error.message}`,
        500,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      );
    }

    return {
      success: true,
      message_id: emailData.id,
      message: 'Welcome email sent successfully',
    };
  }

  async sendCustomEmail(data: Record<string, unknown>) {
    const {
      to,
      subject,
      template,
      data: templateData,
    } = (() => {
      // PASS 1: Use safeParse to prevent ZodError from crashing worker
      const validationResult = CustomEmailSchema.safeParse(data);
      if (!validationResult.success) {
        const zodError = validationResult.error;
        const flattened = zodError.flatten();
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          message: 'Request body validation failed',
          errors: flattened.fieldErrors,
          formErrors: flattened.formErrors,
        });
      }
      return validationResult.data;
    })();

    // Get email template
    const { data: emailTemplate, error: templateError } =
      await this.supabaseClient
        .from('email_templates')
        .select('*')
        .eq('template_name', template)
        .single();

    if (templateError || !emailTemplate) {
      throw new AppError(
        'Email template not found',
        404,
        ERROR_CODES.DB_NOT_FOUND,
      );
    }

    // Replace template variables
    let htmlContent = emailTemplate.html_content;
    Object.entries(templateData).forEach(([key, value]) => {
      htmlContent = htmlContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        String(value),
      );
    });

    const resend = this.getResendClient();
    const { data: emailData, error } = await resend.emails.send({
      from: 'ELARO <noreply@myelaro.com>',
      to: [to],
      subject,
      html: htmlContent,
    });

    if (error) {
      throw new AppError(
        `Failed to send custom email: ${error.message}`,
        500,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      );
    }

    return {
      success: true,
      message_id: emailData.id,
      message: 'Custom email sent successfully',
    };
  }

  async getTemplates() {
    const { data: templates, error } = await this.supabaseClient
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) handleDbError(error);

    return templates;
  }

  async scheduleEmail(data: Record<string, unknown>) {
    const { to, subject, template, data: templateData, scheduled_time } = data;

    // Store scheduled email in database
    const { data: scheduledEmail, error } = await this.supabaseClient
      .from('scheduled_emails')
      .insert({
        to,
        subject,
        template,
        template_data: templateData,
        scheduled_time,
        status: 'pending',
        created_by: this.user.id,
      })
      .select()
      .single();

    if (error) handleDbError(error);

    return {
      success: true,
      scheduled_email_id: scheduledEmail.id,
      message: 'Email scheduled successfully',
    };
  }
}

// Handler functions - Use AuthenticatedRequest and EmailService
async function handleSendWelcomeEmail(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new EmailService(supabaseClient, user);
  return await service.sendWelcomeEmail(body);
}

async function handleSendCustomEmail(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new EmailService(supabaseClient, user);
  return await service.sendCustomEmail(body);
}

async function handleGetTemplates(req: AuthenticatedRequest) {
  const { user, supabaseClient } = req;
  const service = new EmailService(supabaseClient, user);
  return await service.getTemplates();
}

async function handleScheduleEmail(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const service = new EmailService(supabaseClient, user);
  return await service.scheduleEmail(body);
}

// Main handler with routing
serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // Route to appropriate handler
    const handler = getHandler(action);
    if (!handler) {
      return errorResponse(
        new AppError('Invalid action', 404, ERROR_CODES.DB_NOT_FOUND),
      );
    }

    // Handler is already wrapped with createAuthenticatedHandler, just call it
    return await handler(req);
  } catch (error) {
    const traceContext = extractTraceContext(req);
    await logger.error(
      'Email system error',
      {
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
      },
      traceContext,
    );
    return errorResponse(
      error instanceof AppError
        ? error
        : new AppError(
            'Internal server error',
            500,
            ERROR_CODES.INTERNAL_ERROR,
          ),
      500,
    );
  }
});

// Route handlers - All handlers are wrapped with createAuthenticatedHandler
type HandlerFunction = (req: Request) => Promise<Response>;

function getHandler(action: string | null) {
  const handlers: Record<string, HandlerFunction> = {
    'send-welcome': wrapOldHandler(
      handleSendWelcomeEmail,
      'email-send-welcome',
      WelcomeEmailSchema,
      true,
    ),
    'send-custom': wrapOldHandler(
      handleSendCustomEmail,
      'email-send-custom',
      CustomEmailSchema,
      true,
    ),
    templates: wrapOldHandler(
      handleGetTemplates,
      'email-templates',
      undefined,
      false,
    ),
    schedule: wrapOldHandler(
      handleScheduleEmail,
      'email-schedule',
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        template: z.string().min(1),
        data: z.record(z.unknown()),
        scheduled_time: z.string().datetime(),
      }),
      true,
    ),
  };

  return action ? handlers[action] : undefined;
}
