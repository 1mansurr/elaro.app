import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Define the shape of the final export
interface FullExport {
  exportedAt: string;
  users: any[];
  courses: any[];
  assignments: any[];
  lectures: any[];
  studySessions: any[];
  reminders: any[];
}

serve(async (req) => {
  try {
    // 1. Create a Supabase client with the service_role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Authenticate the user making the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid JWT' }), { status: 401 });
    }

    // 3. SECURITY CHECK: Verify the user is an admin
    // Check if the user's email is in the list of admin emails
    const adminEmails = Deno.env.get('ADMIN_EMAILS')?.split(',') || [];
    
    if (!adminEmails.includes(user.email || '')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User is not an admin.' }), { status: 403 });
    }

    console.log(`Admin user ${user.id} initiated data export.`);

    // 4. Fetch all data from all critical tables
    const [
      users,
      courses,
      assignments,
      lectures,
      studySessions,
      reminders,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*'),
      supabaseAdmin.from('courses').select('*'),
      supabaseAdmin.from('assignments').select('*'),
      supabaseAdmin.from('lectures').select('*'),
      supabaseAdmin.from('study_sessions').select('*'),
      supabaseAdmin.from('reminders').select('*'),
    ]);

    // 5. Construct the final JSON output
    const exportData: FullExport = {
      exportedAt: new Date().toISOString(),
      users: users.data || [],
      courses: courses.data || [],
      assignments: assignments.data || [],
      lectures: lectures.data || [],
      studySessions: studySessions.data || [],
      reminders: reminders.data || [],
    };

    // Return the data as a JSON response
    return new Response(JSON.stringify(exportData), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error during admin data export:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), { status: 500 });
  }
});
