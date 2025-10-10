import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { UpdateCourseSchema } from '../_shared/schemas/course.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleUpdateCourse({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { course_id, ...updates } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

  console.log(`Verifying ownership for user: ${user.id}, course: ${course_id}`);

  // SECURITY: Verify ownership before updating
  const { error: checkError } = await supabaseClient
    .from('courses')
    .select('id')
    .eq('id', course_id)
    .eq('user_id', user.id)
    .single();

  if (checkError) throw new AppError('Course not found or access denied.', 404, 'NOT_FOUND');

  // Encrypt fields if they are being updated
  const encryptedUpdates = { ...updates };
  if (updates.course_name) {
    encryptedUpdates.course_name = await encrypt(updates.course_name, encryptionKey);
  }
  if (updates.about_course) {
    encryptedUpdates.about_course = await encrypt(updates.about_course, encryptionKey);
  }

  const { data, error: updateError } = await supabaseClient
    .from('courses')
    .update({
      ...encryptedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', course_id)
    .select()
    .single();

  if (updateError) throw new AppError(updateError.message, 500, 'DB_UPDATE_ERROR');
  
  console.log(`Successfully updated course with ID: ${course_id}`);
  return data;
}

serve(createAuthenticatedHandler(
  handleUpdateCourse,
  {
    rateLimitName: 'update-course',
    schema: UpdateCourseSchema,
  }
));
