import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { ERROR_CODES } from '../_shared/error-codes.ts';
import { handleDbError } from '../api-v2/_handler-utils.ts';
import { logger } from '../_shared/logging.ts';
import { extractTraceContext } from '../_shared/tracing.ts';
import { encrypt } from '../_shared/encryption.ts';
import { z } from 'zod';

// Define schema locally to avoid deployment issues with shared imports
const CompleteOnboardingSchema = z.object({
  username: z
    .string()
    .min(4, 'Username must be at least 4 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      'Username can only contain letters, numbers, dots, and underscores',
    )
    .refine(
      val => !/^[._]/.test(val),
      'Username cannot start with a dot or underscore',
    )
    .refine(
      val => !/[._]$/.test(val),
      'Username cannot end with a dot or underscore',
    )
    .refine(
      val => !/[._]{2,}/.test(val),
      'Username cannot have consecutive dots or underscores',
    ),
  country: z.string().min(1, 'Country is required').max(50).optional(),
  university: z.string().max(100).optional(),
  program: z.string().max(100).optional(),
  courses: z
    .array(
      z.object({
        course_name: z.string().min(1).max(200),
        course_code: z.string().max(50).optional(),
      }),
    )
    .default([]),
  dateOfBirth: z.string().refine(val => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && val.match(/^\d{4}-\d{2}-\d{2}$/);
  }, 'Invalid date format. Expected YYYY-MM-DD'),
  hasParentalConsent: z.boolean().default(false),
  marketingOptIn: z.boolean().default(false),
});

async function handleCompleteOnboarding(req: AuthenticatedRequest) {
  const { user, supabaseClient, body } = req;
  const traceContext = extractTraceContext(req as unknown as Request);

  const {
    username,
    university,
    program,
    country,
    courses,
    dateOfBirth,
    hasParentalConsent,
    marketingOptIn,
  } = body;
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey)
    throw new AppError(
      'Encryption key not configured.',
      500,
      ERROR_CODES.CONFIG_ERROR,
    );

  await logger.info(
    'Completing onboarding',
    { user_id: user.id },
    traceContext,
  );

  // Age validation logic
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  // Check if user is under 13
  if (age < 13) {
    throw new AppError(
      'You must be at least 13 years old to use this service.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Check if user is between 13-17 and lacks parental consent
  if (age >= 13 && age < 18 && !hasParentalConsent) {
    throw new AppError(
      'Parental consent is required for users under 18.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  await logger.info(
    'Age validation passed',
    { user_id: user.id, age },
    traceContext,
  );

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
    throw handleDbError(userUpdateError);
  }

  await logger.info('User profile updated', { user_id: user.id }, traceContext);

  // 2. Create the initial courses for the user
  if (courses && courses.length > 0) {
    await logger.info(
      'Creating initial courses',
      { user_id: user.id, course_count: courses.length },
      traceContext,
    );

    const coursesToInsert = await Promise.all(
      courses.map(
        async (course: { course_name: string; course_code?: string }) => ({
          user_id: user.id,
          course_name: await encrypt(course.course_name, encryptionKey),
          course_code: course.course_code,
        }),
      ),
    );

    const { error: courseInsertError } = await supabaseClient
      .from('courses')
      .insert(coursesToInsert);

    if (courseInsertError) {
      // This is a non-critical error. The user profile was updated, but courses failed.
      // We log it but don't fail the whole request.
      await logger.error(
        'Failed to create initial courses',
        {
          user_id: user.id,
          error: courseInsertError.message,
        },
        traceContext,
      );
    } else {
      await logger.info(
        'Successfully created initial courses',
        { user_id: user.id },
        traceContext,
      );
    }
  }

  return { success: true, message: 'Onboarding completed successfully.' };
}

serve(
  createAuthenticatedHandler(handleCompleteOnboarding, {
    rateLimitName: 'complete-onboarding',
    schema: CompleteOnboardingSchema,
  }),
);
