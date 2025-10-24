/**
 * Consolidated Study Sessions System Edge Function
 * 
 * This function consolidates all study session-related operations that were previously
 * spread across multiple separate Edge Functions.
 * 
 * Routes:
 * - POST /study-sessions-system/create - Create study session
 * - PUT /study-sessions-system/update - Update study session
 * - DELETE /study-sessions-system/delete - Soft delete study session
 * - POST /study-sessions-system/restore - Restore deleted study session
 * - DELETE /study-sessions-system/delete-permanently - Permanently delete study session
 * - GET /study-sessions-system/list - List user study sessions
 * - GET /study-sessions-system/get/:id - Get specific study session
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { 
  CreateStudySessionSchema, 
  UpdateStudySessionSchema, 
  DeleteStudySessionSchema,
  RestoreStudySessionSchema 
} from '../_shared/schemas/studySession.ts';
import { encrypt, decrypt } from '../_shared/encryption.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';

// Study Session service class
class StudySessionService {
  constructor(private supabaseClient: any, private user: any) {}

  async createStudySession(data: any) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

    const {
      course_id,
      topic,
      notes,
      session_date,
      has_spaced_repetition,
      reminders,
    } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, course: ${course_id}`);

    // SECURITY: Verify course ownership
    const { data: course, error: courseError } = await this.supabaseClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('user_id', this.user.id)
      .single();

    if (courseError || !course) {
      throw new AppError('Course not found or access denied.', 404, 'NOT_FOUND');
    }

    const [encryptedTopic, encryptedNotes] = await Promise.all([
      encrypt(topic, encryptionKey),
      notes ? encrypt(notes, encryptionKey) : null,
    ]);

    const { data: newSession, error: insertError } = await this.supabaseClient
      .from('study_sessions')
      .insert({
        user_id: this.user.id,
        course_id,
        topic: encryptedTopic,
        notes: encryptedNotes,
        session_date,
        has_spaced_repetition,
      })
      .select('id, topic, session_date')
      .single();

    if (insertError) {
      throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
    }

    // Create reminders if provided
    if (newSession && reminders && reminders.length > 0) {
      const sessionDate = new Date(session_date);
      const remindersToInsert = reminders.map((mins: number) => ({
        user_id: this.user.id,
        study_session_id: newSession.id,
        reminder_time: new Date(sessionDate.getTime() - mins * 60000).toISOString(),
        reminder_type: 'study_session',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      }));
      
      const { error: reminderError } = await this.supabaseClient.from('reminders').insert(remindersToInsert);
      if (reminderError) {
        console.error('Failed to create reminders for study session:', newSession.id, reminderError);
        // Non-critical error, so we don't throw. The study session was still created.
      }
    }

    return newSession;
  }

  async updateStudySession(data: any) {
    const { study_session_id, ...updates } = data;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

    console.log(`Verifying ownership for user: ${this.user.id}, study session: ${study_session_id}`);

    // SECURITY: Verify ownership before updating
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');

    // Encrypt fields if they are being updated
    const encryptedUpdates = { ...updates };
    if (updates.topic) {
      encryptedUpdates.topic = await encrypt(updates.topic, encryptionKey);
    }
    if (updates.notes) {
      encryptedUpdates.notes = await encrypt(updates.notes, encryptionKey);
    }

    const { data, error: updateError } = await this.supabaseClient
      .from('study_sessions')
      .update({
        ...encryptedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', study_session_id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
    
    console.log(`Successfully updated study session with ID: ${study_session_id}`);
    return data;
  }

  async deleteStudySession(data: any) {
    const { study_session_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, study session: ${study_session_id}`);

    // SECURITY: Verify ownership before deleting
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');

    // Perform soft delete
    const { error: deleteError } = await this.supabaseClient
      .from('study_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', study_session_id);

    if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
    
    console.log(`Soft deleted study session with ID: ${study_session_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Study session deleted successfully.' };
  }

  async restoreStudySession(data: any) {
    const { study_session_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, study session: ${study_session_id}`);

    // SECURITY: Verify ownership before restoring
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');

    // Restore by setting deleted_at to null
    const { error: restoreError } = await this.supabaseClient
      .from('study_sessions')
      .update({ deleted_at: null })
      .eq('id', study_session_id);

    if (restoreError) throw new AppError(restoreError.message, 500, 'DB_UPDATE_ERROR');
    
    console.log(`Restored study session with ID: ${study_session_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Study session restored successfully.' };
  }

  async deletePermanently(data: any) {
    const { study_session_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, study session: ${study_session_id}`);

    // SECURITY: Verify ownership before permanently deleting
    const { error: checkError } = await this.supabaseClient
      .from('study_sessions')
      .select('id')
      .eq('id', study_session_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');

    // Permanently delete
    const { error: deleteError } = await this.supabaseClient
      .from('study_sessions')
      .delete()
      .eq('id', study_session_id);

    if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
    
    console.log(`Permanently deleted study session with ID: ${study_session_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Study session permanently deleted.' };
  }

  async listStudySessions() {
    const { data: studySessions, error } = await this.supabaseClient
      .from('study_sessions')
      .select(`
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `)
      .eq('user_id', this.user.id)
      .is('deleted_at', null)
      .order('session_date', { ascending: false });

    if (error) throw new AppError(error.message, 500, 'DB_QUERY_ERROR');

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      for (const session of studySessions) {
        if (session.topic) {
          session.topic = await decrypt(session.topic, encryptionKey);
        }
        if (session.notes) {
          session.notes = await decrypt(session.notes, encryptionKey);
        }
      }
    }

    return studySessions;
  }

  async getStudySession(studySessionId: string) {
    const { data: studySession, error } = await this.supabaseClient
      .from('study_sessions')
      .select(`
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `)
      .eq('id', studySessionId)
      .eq('user_id', this.user.id)
      .single();

    if (error || !studySession) {
      throw new AppError('Study session not found or access denied.', 404, 'NOT_FOUND');
    }

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      if (studySession.topic) {
        studySession.topic = await decrypt(studySession.topic, encryptionKey);
      }
      if (studySession.notes) {
        studySession.notes = await decrypt(studySession.notes, encryptionKey);
      }
    }

    return studySession;
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

    // Create study session service
    const studySessionService = new StudySessionService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'create':
        const createData = await req.json();
        const newStudySession = await studySessionService.createStudySession(createData);
        return createResponse({ data: newStudySession }, 201);

      case 'update':
        const updateData = await req.json();
        const updatedStudySession = await studySessionService.updateStudySession(updateData);
        return createResponse({ data: updatedStudySession }, 200);

      case 'delete':
        const deleteData = await req.json();
        const deleteResult = await studySessionService.deleteStudySession(deleteData);
        return createResponse({ data: deleteResult }, 200);

      case 'restore':
        const restoreData = await req.json();
        const restoreResult = await studySessionService.restoreStudySession(restoreData);
        return createResponse({ data: restoreResult }, 200);

      case 'delete-permanently':
        const permanentDeleteData = await req.json();
        const permanentDeleteResult = await studySessionService.deletePermanently(permanentDeleteData);
        return createResponse({ data: permanentDeleteResult }, 200);

      case 'list':
        const studySessions = await studySessionService.listStudySessions();
        return createResponse({ data: studySessions }, 200);

      case 'get':
        const studySessionId = pathParts[pathParts.length - 2]; // Get ID from path
        const studySession = await studySessionService.getStudySession(studySessionId);
        return createResponse({ data: studySession }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('Study sessions system error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
