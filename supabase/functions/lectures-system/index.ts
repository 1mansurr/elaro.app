/**
 * Consolidated Lectures System Edge Function
 * 
 * This function consolidates all lecture-related operations that were previously
 * spread across multiple separate Edge Functions.
 * 
 * Routes:
 * - POST /lectures-system/create - Create lecture
 * - PUT /lectures-system/update - Update lecture
 * - DELETE /lectures-system/delete - Soft delete lecture
 * - POST /lectures-system/restore - Restore deleted lecture
 * - DELETE /lectures-system/delete-permanently - Permanently delete lecture
 * - GET /lectures-system/list - List user lectures
 * - GET /lectures-system/get/:id - Get specific lecture
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { 
  CreateLectureSchema, 
  UpdateLectureSchema, 
  DeleteLectureSchema,
  RestoreLectureSchema 
} from '../_shared/schemas/lecture.ts';
import { encrypt, decrypt } from '../_shared/encryption.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';

// Lecture service class
class LectureService {
  constructor(private supabaseClient: any, private user: any) {}

  async createLecture(data: any) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

    const {
      course_id,
      lecture_name,
      start_time,
      end_time,
      description,
      is_recurring,
      recurring_pattern,
      reminders,
    } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, course: ${course_id}`);

    // SECURITY: Verify the user owns the course they are adding a lecture to.
    const { data: course, error: courseError } = await this.supabaseClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('user_id', this.user.id)
      .single();

    if (courseError || !course) {
      throw new AppError('Course not found or access denied.', 404, 'NOT_FOUND');
    }

    const [encryptedLectureName, encryptedDescription] = await Promise.all([
      encrypt(lecture_name, encryptionKey),
      description ? encrypt(description, encryptionKey) : null,
    ]);

    const { data: newLecture, error: insertError } = await this.supabaseClient
      .from('lectures')
      .insert({
        user_id: this.user.id,
        course_id,
        lecture_name: encryptedLectureName,
        description: encryptedDescription,
        start_time,
        end_time: end_time || null,
        is_recurring: is_recurring || false,
        recurring_pattern: recurring_pattern || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
    }

    // Create reminders if provided
    if (newLecture && reminders && reminders.length > 0) {
      const startTime = new Date(start_time);
      const remindersToInsert = reminders.map((mins: number) => ({
        user_id: this.user.id,
        lecture_id: newLecture.id,
        reminder_time: new Date(startTime.getTime() - mins * 60000).toISOString(),
        reminder_type: 'lecture',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      }));
      
      const { error: reminderError } = await this.supabaseClient.from('reminders').insert(remindersToInsert);
      if (reminderError) {
        console.error('Failed to create reminders for lecture:', newLecture.id, reminderError);
        // Non-critical error, so we don't throw. The lecture was still created.
      }
    }

    return newLecture;
  }

  async updateLecture(data: any) {
    const { lecture_id, ...updates } = data;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

    console.log(`Verifying ownership for user: ${this.user.id}, lecture: ${lecture_id}`);

    // SECURITY: Verify ownership before updating
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Lecture not found or access denied.', 404, 'NOT_FOUND');

    // Encrypt fields if they are being updated
    const encryptedUpdates = { ...updates };
    if (updates.lecture_name) {
      encryptedUpdates.lecture_name = await encrypt(updates.lecture_name, encryptionKey);
    }
    if (updates.description) {
      encryptedUpdates.description = await encrypt(updates.description, encryptionKey);
    }

    const { data, error: updateError } = await this.supabaseClient
      .from('lectures')
      .update({
        ...encryptedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lecture_id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
    
    console.log(`Successfully updated lecture with ID: ${lecture_id}`);
    return data;
  }

  async deleteLecture(data: any) {
    const { lecture_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, lecture: ${lecture_id}`);

    // SECURITY: Verify ownership before deleting
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Lecture not found or access denied.', 404, 'NOT_FOUND');

    // Perform soft delete
    const { error: deleteError } = await this.supabaseClient
      .from('lectures')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', lecture_id);

    if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
    
    console.log(`Soft deleted lecture with ID: ${lecture_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Lecture deleted successfully.' };
  }

  async restoreLecture(data: any) {
    const { lecture_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, lecture: ${lecture_id}`);

    // SECURITY: Verify ownership before restoring
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Lecture not found or access denied.', 404, 'NOT_FOUND');

    // Restore by setting deleted_at to null
    const { error: restoreError } = await this.supabaseClient
      .from('lectures')
      .update({ deleted_at: null })
      .eq('id', lecture_id);

    if (restoreError) throw new AppError(restoreError.message, 500, 'DB_UPDATE_ERROR');
    
    console.log(`Restored lecture with ID: ${lecture_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Lecture restored successfully.' };
  }

  async deletePermanently(data: any) {
    const { lecture_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, lecture: ${lecture_id}`);

    // SECURITY: Verify ownership before permanently deleting
    const { error: checkError } = await this.supabaseClient
      .from('lectures')
      .select('id')
      .eq('id', lecture_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Lecture not found or access denied.', 404, 'NOT_FOUND');

    // Permanently delete
    const { error: deleteError } = await this.supabaseClient
      .from('lectures')
      .delete()
      .eq('id', lecture_id);

    if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
    
    console.log(`Permanently deleted lecture with ID: ${lecture_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Lecture permanently deleted.' };
  }

  async listLectures() {
    const { data: lectures, error } = await this.supabaseClient
      .from('lectures')
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
      .order('start_time', { ascending: true });

    if (error) throw new AppError(error.message, 500, 'DB_QUERY_ERROR');

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      for (const lecture of lectures) {
        if (lecture.lecture_name) {
          lecture.lecture_name = await decrypt(lecture.lecture_name, encryptionKey);
        }
        if (lecture.description) {
          lecture.description = await decrypt(lecture.description, encryptionKey);
        }
      }
    }

    return lectures;
  }

  async getLecture(lectureId: string) {
    const { data: lecture, error } = await this.supabaseClient
      .from('lectures')
      .select(`
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `)
      .eq('id', lectureId)
      .eq('user_id', this.user.id)
      .single();

    if (error || !lecture) {
      throw new AppError('Lecture not found or access denied.', 404, 'NOT_FOUND');
    }

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      if (lecture.lecture_name) {
        lecture.lecture_name = await decrypt(lecture.lecture_name, encryptionKey);
      }
      if (lecture.description) {
        lecture.description = await decrypt(lecture.description, encryptionKey);
      }
    }

    return lecture;
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

    // Create lecture service
    const lectureService = new LectureService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'create':
        const createData = await req.json();
        const newLecture = await lectureService.createLecture(createData);
        return createResponse({ data: newLecture }, 201);

      case 'update':
        const updateData = await req.json();
        const updatedLecture = await lectureService.updateLecture(updateData);
        return createResponse({ data: updatedLecture }, 200);

      case 'delete':
        const deleteData = await req.json();
        const deleteResult = await lectureService.deleteLecture(deleteData);
        return createResponse({ data: deleteResult }, 200);

      case 'restore':
        const restoreData = await req.json();
        const restoreResult = await lectureService.restoreLecture(restoreData);
        return createResponse({ data: restoreResult }, 200);

      case 'delete-permanently':
        const permanentDeleteData = await req.json();
        const permanentDeleteResult = await lectureService.deletePermanently(permanentDeleteData);
        return createResponse({ data: permanentDeleteResult }, 200);

      case 'list':
        const lectures = await lectureService.listLectures();
        return createResponse({ data: lectures }, 200);

      case 'get':
        const lectureId = pathParts[pathParts.length - 2]; // Get ID from path
        const lecture = await lectureService.getLecture(lectureId);
        return createResponse({ data: lecture }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('Lectures system error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
