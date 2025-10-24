/**
 * Consolidated Assignments System Edge Function
 * 
 * This function consolidates all assignment-related operations that were previously
 * spread across multiple separate Edge Functions.
 * 
 * Routes:
 * - POST /assignments-system/create - Create assignment
 * - PUT /assignments-system/update - Update assignment
 * - DELETE /assignments-system/delete - Soft delete assignment
 * - POST /assignments-system/restore - Restore deleted assignment
 * - DELETE /assignments-system/delete-permanently - Permanently delete assignment
 * - GET /assignments-system/list - List user assignments
 * - GET /assignments-system/get/:id - Get specific assignment
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { 
  CreateAssignmentSchema, 
  UpdateAssignmentSchema, 
  DeleteAssignmentSchema,
  RestoreAssignmentSchema 
} from '../_shared/schemas/assignment.ts';
import { encrypt, decrypt } from '../_shared/encryption.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createResponse } from '../_shared/response.ts';

// Assignment service class
class AssignmentService {
  constructor(private supabaseClient: any, private user: any) {}

  async createAssignment(data: any) {
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

    const {
      course_id,
      title,
      description,
      due_date,
      submission_method,
      submission_link,
      reminders,
    } = data;

    // 1. SECURITY: Verify course ownership
    console.log(`Verifying ownership for user: ${this.user.id}, course: ${course_id}`);
    const { data: course, error: courseError } = await this.supabaseClient
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('user_id', this.user.id)
      .single();

    if (courseError || !course) {
      throw new AppError('Course not found or access denied.', 404, 'NOT_FOUND');
    }

    // 2. Core Business Logic
    const encryptedTitle = await encrypt(title, encryptionKey);
    const encryptedDescription = description ? await encrypt(description, encryptionKey) : null;

    const { data: newAssignment, error: insertError } = await this.supabaseClient
      .from('assignments')
      .insert({
        user_id: this.user.id,
        course_id,
        title: encryptedTitle,
        description: encryptedDescription,
        due_date,
        submission_method,
        submission_link,
      })
      .select()
      .single();

    if (insertError) {
      throw new AppError(insertError.message, 500, 'DB_INSERT_ERROR');
    }

    // 3. Reminder creation logic
    if (newAssignment && reminders && reminders.length > 0) {
      const dueDate = new Date(due_date);
      const remindersToInsert = reminders.map((mins: number) => ({
        user_id: this.user.id,
        assignment_id: newAssignment.id,
        reminder_time: new Date(dueDate.getTime() - mins * 60000).toISOString(),
        reminder_type: 'assignment',
        day_number: Math.ceil(mins / (24 * 60)),
        completed: false,
      }));
      
      const { error: reminderError } = await this.supabaseClient.from('reminders').insert(remindersToInsert);
      if (reminderError) {
        console.error('Failed to create reminders for assignment:', newAssignment.id, reminderError);
        // Non-critical error, so we don't throw. The assignment was still created.
      }
    }

    return newAssignment;
  }

  async updateAssignment(data: any) {
    const { assignment_id, ...updates } = data;
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

    console.log(`Verifying ownership for user: ${this.user.id}, assignment: ${assignment_id}`);

    // SECURITY: Verify ownership before updating
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Assignment not found or access denied.', 404, 'NOT_FOUND');

    // Encrypt fields if they are being updated
    const encryptedUpdates = { ...updates };
    if (updates.title) {
      encryptedUpdates.title = await encrypt(updates.title, encryptionKey);
    }
    if (updates.description) {
      encryptedUpdates.description = await encrypt(updates.description, encryptionKey);
    }

    const { data, error: updateError } = await this.supabaseClient
      .from('assignments')
      .update({
        ...encryptedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment_id)
      .select()
      .single();

    if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
    
    console.log(`Successfully updated assignment with ID: ${assignment_id}`);
    return data;
  }

  async deleteAssignment(data: any) {
    const { assignment_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, assignment: ${assignment_id}`);

    // SECURITY: Verify ownership before deleting
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Assignment not found or access denied.', 404, 'NOT_FOUND');

    // Perform soft delete
    const { error: deleteError } = await this.supabaseClient
      .from('assignments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', assignment_id);

    if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
    
    console.log(`Soft deleted assignment with ID: ${assignment_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Assignment deleted successfully.' };
  }

  async restoreAssignment(data: any) {
    const { assignment_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, assignment: ${assignment_id}`);

    // SECURITY: Verify ownership before restoring
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Assignment not found or access denied.', 404, 'NOT_FOUND');

    // Restore by setting deleted_at to null
    const { error: restoreError } = await this.supabaseClient
      .from('assignments')
      .update({ deleted_at: null })
      .eq('id', assignment_id);

    if (restoreError) throw new AppError(restoreError.message, 500, 'DB_UPDATE_ERROR');
    
    console.log(`Restored assignment with ID: ${assignment_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Assignment restored successfully.' };
  }

  async deletePermanently(data: any) {
    const { assignment_id } = data;

    console.log(`Verifying ownership for user: ${this.user.id}, assignment: ${assignment_id}`);

    // SECURITY: Verify ownership before permanently deleting
    const { error: checkError } = await this.supabaseClient
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .eq('user_id', this.user.id)
      .single();

    if (checkError) throw new AppError('Assignment not found or access denied.', 404, 'NOT_FOUND');

    // Permanently delete
    const { error: deleteError } = await this.supabaseClient
      .from('assignments')
      .delete()
      .eq('id', assignment_id);

    if (deleteError) throw new AppError(deleteError.message, 500, 'DB_DELETE_ERROR');
    
    console.log(`Permanently deleted assignment with ID: ${assignment_id} for user: ${this.user.id}`);
    
    return { success: true, message: 'Assignment permanently deleted.' };
  }

  async listAssignments() {
    const { data: assignments, error } = await this.supabaseClient
      .from('assignments')
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
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500, 'DB_QUERY_ERROR');

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      for (const assignment of assignments) {
        if (assignment.title) {
          assignment.title = await decrypt(assignment.title, encryptionKey);
        }
        if (assignment.description) {
          assignment.description = await decrypt(assignment.description, encryptionKey);
        }
      }
    }

    return assignments;
  }

  async getAssignment(assignmentId: string) {
    const { data: assignment, error } = await this.supabaseClient
      .from('assignments')
      .select(`
        *,
        courses (
          id,
          course_name,
          course_code
        )
      `)
      .eq('id', assignmentId)
      .eq('user_id', this.user.id)
      .single();

    if (error || !assignment) {
      throw new AppError('Assignment not found or access denied.', 404, 'NOT_FOUND');
    }

    // Decrypt sensitive data
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (encryptionKey) {
      if (assignment.title) {
        assignment.title = await decrypt(assignment.title, encryptionKey);
      }
      if (assignment.description) {
        assignment.description = await decrypt(assignment.description, encryptionKey);
      }
    }

    return assignment;
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

    // Create assignment service
    const assignmentService = new AssignmentService(supabaseClient, user);

    // Route to appropriate handler
    switch (action) {
      case 'create':
        const createData = await req.json();
        const newAssignment = await assignmentService.createAssignment(createData);
        return createResponse({ data: newAssignment }, 201);

      case 'update':
        const updateData = await req.json();
        const updatedAssignment = await assignmentService.updateAssignment(updateData);
        return createResponse({ data: updatedAssignment }, 200);

      case 'delete':
        const deleteData = await req.json();
        const deleteResult = await assignmentService.deleteAssignment(deleteData);
        return createResponse({ data: deleteResult }, 200);

      case 'restore':
        const restoreData = await req.json();
        const restoreResult = await assignmentService.restoreAssignment(restoreData);
        return createResponse({ data: restoreResult }, 200);

      case 'delete-permanently':
        const permanentDeleteData = await req.json();
        const permanentDeleteResult = await assignmentService.deletePermanently(permanentDeleteData);
        return createResponse({ data: permanentDeleteResult }, 200);

      case 'list':
        const assignments = await assignmentService.listAssignments();
        return createResponse({ data: assignments }, 200);

      case 'get':
        const assignmentId = pathParts[pathParts.length - 2]; // Get ID from path
        const assignment = await assignmentService.getAssignment(assignmentId);
        return createResponse({ data: assignment }, 200);

      default:
        return createResponse({ error: 'Invalid action' }, 404);
    }

  } catch (error) {
    console.error('Assignments system error:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
});
