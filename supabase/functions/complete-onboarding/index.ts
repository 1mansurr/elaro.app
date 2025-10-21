import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { CompleteOnboardingSchema } from '../_shared/schemas/user.ts';
import { encrypt } from '../_shared/encryption.ts';

async function handleCompleteOnboarding({ user, supabaseClient, body }: AuthenticatedRequest) {
  const { username, university, program, country, courses, dateOfBirth, hasParentalConsent, marketingOptIn } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) throw new AppError('Encryption key not configured.', 500, 'CONFIG_ERROR');

  console.log(`Completing onboarding for user: ${user.id}`);

  // Age validation logic
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Check if user is under 13
  if (age < 13) {
    throw new AppError('You must be at least 13 years old to use this service.', 403, 'AGE_RESTRICTION');
  }

  // Check if user is between 13-17 and lacks parental consent
  if (age >= 13 && age < 18 && !hasParentalConsent) {
    throw new AppError('Parental consent is required for users under 18.', 403, 'PARENTAL_CONSENT_REQUIRED');
  }

  console.log(`Age validation passed for user: ${user.id}, age: ${age}`);

  // 1. Update the user's profile with onboarding data
  const [encryptedUniversity, encryptedProgram] = await Promise.all([
    university ? encrypt(university, encryptionKey) : null,
    program ? encrypt(program, encryptionKey) : null,
  ]);

  const { error: userUpdateError } = await supabaseClient
    .from('users')
    .update({
      username,
      university: encryptedUniversity,
      program: encryptedProgram,
      country,
      date_of_birth: dateOfBirth,
      marketing_opt_in: marketingOptIn,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (userUpdateError) {
    throw new AppError(userUpdateError.message, 500, 'DB_UPDATE_ERROR');
  }
  console.log(`User profile updated for user: ${user.id}`);

  // 2. Create the initial courses for the user
  if (courses && courses.length > 0) {
    console.log(`Creating ${courses.length} initial courses for user: ${user.id}`);
    
    const coursesToInsert = await Promise.all(courses.map(async (course: any) => ({
      user_id: user.id,
      course_name: await encrypt(course.course_name, encryptionKey),
      course_code: course.course_code,
    })));

    const { error: courseInsertError } = await supabaseClient
      .from('courses')
      .insert(coursesToInsert);

    if (courseInsertError) {
      // This is a non-critical error. The user profile was updated, but courses failed.
      // We log it but don't fail the whole request.
      console.error('Failed to create initial courses for user:', user.id, courseInsertError);
    } else {
      console.log('Successfully created initial courses.');
    }
  }

  return { success: true, message: 'Onboarding completed successfully.' };
}

serve(createAuthenticatedHandler(
  handleCompleteOnboarding,
  {
    rateLimitName: 'complete-onboarding',
    schema: CompleteOnboardingSchema,
  }
));
