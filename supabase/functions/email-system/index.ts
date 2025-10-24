/**
 * Consolidated Email System Edge Function
 * 
 * This function consolidates all email-related operations that were previously
 * spread across multiple separate Edge Functions.
 * 
 * Routes:
 * - POST /email-system/send-welcome - Send welcome email
 * - POST /email-system/send-daily-summary - Send daily summary email
 * - POST /email-system/send-evening-capture - Send evening capture email
 * - POST /email-system/send-custom - Send custom email
 * - GET /email-system/templates - Get email templates
 * - POST /email-system/schedule - Schedule email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';
import { AppError } from '../_shared/response.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const WelcomeEmailSchema = z.object({
  userEmail: z.string().email(),
  userFirstName: z.string().min(1),
  userId: z.string().uuid(),
});

const DailySummarySchema = z.object({
  userEmail: z.string().email(),
  userFirstName: z.string().min(1),
  summaryData: z.record(z.any()),
});

const EveningCaptureSchema = z.object({
  userEmail: z.string().email(),
  userFirstName: z.string().min(1),
  captureData: z.record(z.any()),
});

const CustomEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  template: z.string().min(1),
  data: z.record(z.any()),
});

// Email service class
class EmailService {
  constructor(private supabaseClient: any, private user: any) {}

  async sendWelcomeEmail(data: any) {
    const { userEmail, userFirstName, userId } = WelcomeEmailSchema.parse(data);

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
              
              <a href="https://elaro.app/dashboard" class="button">Get Started</a>
              
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

    const { data: emailData, error } = await resend.emails.send({
      from: 'ELARO <noreply@elaro.app>',
      to: [userEmail],
      subject: 'Welcome to ELARO! 🎓',
      html: emailContent,
    });

    if (error) {
      throw new AppError(`Failed to send welcome email: ${error.message}`, 500, 'EMAIL_ERROR');
    }

    return {
      success: true,
      message_id: emailData.id,
      message: 'Welcome email sent successfully'
    };
  }

  async sendDailySummary(data: any) {
    const { userEmail, userFirstName, summaryData } = DailySummarySchema.parse(data);

    const { upcomingAssignments = 0, completedSessions = 0, streakDays = 0 } = summaryData;

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Daily ELARO Summary</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat { text-align: center; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Daily ELARO Summary 📊</h1>
              <p>Here's how you're doing today</p>
            </div>
            <div class="content">
              <h2>Good morning, ${userFirstName}!</h2>
              <p>Here's your daily academic summary:</p>
              
              <div class="stats">
                <div class="stat">
                  <div class="stat-number">${upcomingAssignments}</div>
                  <div>Upcoming Assignments</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${completedSessions}</div>
                  <div>Study Sessions Today</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${streakDays}</div>
                  <div>Day Streak</div>
                </div>
              </div>
              
              <p>Keep up the great work! Your dedication to learning is inspiring.</p>
              
              <a href="https://elaro.app/dashboard" class="button">View Dashboard</a>
              
              <p>Have a productive day!</p>
              <p>Best regards,<br>The ELARO Team</p>
            </div>
            <div class="footer">
              <p>© 2024 ELARO. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error } = await resend.emails.send({
      from: 'ELARO <noreply@elaro.app>',
      to: [userEmail],
      subject: 'Your Daily ELARO Summary 📊',
      html: emailContent,
    });

    if (error) {
      throw new AppError(`Failed to send daily summary: ${error.message}`, 500, 'EMAIL_ERROR');
    }

    return {
      success: true,
      message_id: emailData.id,
      message: 'Daily summary sent successfully'
    };
  }

  async sendEveningCapture(data: any) {
    const { userEmail, userFirstName, captureData } = EveningCaptureSchema.parse(data);

    const { todaySessions = 0, tomorrowTasks = 0, reflection = '' } = captureData;

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Evening Reflection - ELARO</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reflection-box { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Evening Reflection 🌙</h1>
              <p>How did your day go?</p>
            </div>
            <div class="content">
              <h2>Good evening, ${userFirstName}!</h2>
              <p>Time to reflect on your academic day:</p>
              
              <div class="reflection-box">
                <h3>Today's Progress</h3>
                <p>You completed <strong>${todaySessions}</strong> study sessions today.</p>
                <p>You have <strong>${tomorrowTasks}</strong> tasks scheduled for tomorrow.</p>
              </div>
              
              ${reflection ? `
                <div class="reflection-box">
                  <h3>Your Reflection</h3>
                  <p>"${reflection}"</p>
                </div>
              ` : ''}
              
              <p>Take a moment to reflect on what you learned today and what you want to focus on tomorrow.</p>
              
              <a href="https://elaro.app/reflection" class="button">Add Reflection</a>
              
              <p>Great job today! Rest well and prepare for tomorrow's challenges.</p>
              <p>Best regards,<br>The ELARO Team</p>
            </div>
            <div class="footer">
              <p>© 2024 ELARO. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error } = await resend.emails.send({
      from: 'ELARO <noreply@elaro.app>',
      to: [userEmail],
      subject: 'Evening Reflection - ELARO 🌙',
      html: emailContent,
    });

    if (error) {
      throw new AppError(`Failed to send evening capture: ${error.message}`, 500, 'EMAIL_ERROR');
    }

    return {
      success: true,
      message_id: emailData.id,
      message: 'Evening capture sent successfully'
    };
  }

  async sendCustomEmail(data: any) {
    const { to, subject, template, data: templateData } = CustomEmailSchema.parse(data);

    // Get email template
    const { data: emailTemplate, error: templateError } = await this.supabaseClient
      .from('email_templates')
      .select('*')
      .eq('template_name', template)
      .single();

    if (templateError || !emailTemplate) {
      throw new AppError('Email template not found', 404, 'NOT_FOUND');
    }

    // Replace template variables
    let htmlContent = emailTemplate.html_content;
    Object.entries(templateData).forEach(([key, value]) => {
      htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    });

    const { data: emailData, error } = await resend.emails.send({
      from: 'ELARO <noreply@elaro.app>',
      to: [to],
      subject,
      html: htmlContent,
    });

    if (error) {
      throw new AppError(`Failed to send custom email: ${error.message}`, 500, 'EMAIL_ERROR');
    }

    return {
      success: true,
      message_id: emailData.id,
      message: 'Custom email sent successfully'
    };
  }

  async getTemplates() {
    const { data: templates, error } = await this.supabaseClient
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message, 500, 'DB_QUERY_ERROR');
    }

    return templates;
  }

  async scheduleEmail(data: any) {
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

    if (error) {
      throw new AppError(error.message, 500, 'DB_INSERT_ERROR');
    }

    return {
      success: true,
      scheduled_email_id: scheduledEmail.id,
      message: 'Email scheduled successfully'
    };
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1]; // Get the last part as action

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return createResponse({ error: 'Unauthorized' }, 401);
    }

    // Create email service
    const emailService = new EmailService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'send-welcome':
        const welcomeData = await req.json();
        const welcomeResult = await emailService.sendWelcomeEmail(welcomeData);
        return createResponse({ data: welcomeResult }, 200);

      case 'send-daily-summary':
        const summaryData = await req.json();
        const summaryResult = await emailService.sendDailySummary(summaryData);
        return createResponse({ data: summaryResult }, 200);

      case 'send-evening-capture':
        const captureData = await req.json();
        const captureResult = await emailService.sendEveningCapture(captureData);
        return createResponse({ data: captureResult }, 200);

      case 'send-custom':
        const customData = await req.json();
        const customResult = await emailService.sendCustomEmail(customData);
        return createResponse({ data: customResult }, 200);

      case 'templates':
        const templates = await emailService.getTemplates();
        return createResponse({ data: templates }, 200);

      case 'schedule':
        const scheduleData = await req.json();
        const scheduleResult = await emailService.scheduleEmail(scheduleData);
        return createResponse({ data: scheduleResult }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('Email system error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
