import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { AppError } from '../_shared/function-handler.ts';

const RATE_LIMIT_DAYS = 7;

serve(async (req: Request ) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userResponse = await supabaseAdmin.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '')
    );
    const user = userResponse.data.user;

    if (!user) {
      throw new AppError('Authentication failed.', 401, 'AUTH_FAILED');
    }

    // --- Rate Limiting Check ---
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('last_data_export_at')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    if (userData?.last_data_export_at) {
      const lastExportDate = new Date(userData.last_data_export_at);
      const nextAvailableDate = new Date(lastExportDate.getTime() + RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000);
      
      if (new Date() < nextAvailableDate) {
        throw new AppError(
          `Data export is limited to once every ${RATE_LIMIT_DAYS} days. Next available on: ${nextAvailableDate.toDateString()}`,
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }
    }

    // --- Data Collection ---
    console.log(`Starting data export for user: ${user.id}`);
    const [
      userProfile,
      notificationPreferences,
      courses,
      assignments,
      lectures,
      studySessions,
      reminders,
      userDevices,
      streaks
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', user.id).single(),
      supabaseAdmin.from('notification_preferences').select('*').eq('user_id', user.id).single(),
      supabaseAdmin.from('courses').select('*').eq('user_id', user.id),
      supabaseAdmin.from('assignments').select('*').eq('user_id', user.id),
      supabaseAdmin.from('lectures').select('*').eq('user_id', user.id),
      supabaseAdmin.from('study_sessions').select('*').eq('user_id', user.id),
      supabaseAdmin.from('reminders').select('*').eq('user_id', user.id),
      supabaseAdmin.from('user_devices').select('platform, updated_at').eq('user_id', user.id), // Exclude push_token
      supabaseAdmin.from('streaks').select('*').eq('user_id', user.id).single()
    ]);

    // --- Data Compilation ---
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      data: {
        user: userProfile.data,
        notificationPreferences: notificationPreferences.data,
        courses: courses.data,
        assignments: assignments.data,
        lectures: lectures.data,
        studySessions: studySessions.data,
        reminders: reminders.data,
        userDevices: userDevices.data,
        streaks: streaks.data
      },
      metadata: {
        totalCourses: courses.data?.length || 0,
        totalAssignments: assignments.data?.length || 0,
        totalLectures: lectures.data?.length || 0,
        totalStudySessions: studySessions.data?.length || 0,
      }
    };

    // --- Update Rate Limit Timestamp ---
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ last_data_export_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      // Log the error but still return the data to the user
      console.error('Failed to update last_data_export_at:', updateError);
    }

    console.log(`Data export successful for user: ${user.id}`);
    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error during data export:', error);
    const status = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof AppError ? error.message : 'An unexpected error occurred.';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
});

