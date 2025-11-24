import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^a-zA-Z0-9]/,
    'Password must contain at least one special character',
  );

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name is too long')
  .regex(
    /^[a-zA-Z\s'-]+$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes',
  );

export const firstNameSchema = nameSchema;
// lastNameSchema allows empty strings since last name is optional
export const lastNameSchema = z
  .string()
  .max(50, 'Name is too long')
  .regex(
    /^[a-zA-Z\s'-]*$/, // * allows empty string (unlike + which requires at least one)
    'Name can only contain letters, spaces, hyphens, and apostrophes',
  );

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema
    .or(z.literal('')) // Explicitly allow empty string
    .transform(val => (val === '' ? undefined : val)) // Convert empty string to undefined
    .optional(), // Now optional() works correctly
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Terms of Service and Privacy Policy',
  }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

export const usernameSchema = z
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
  );

export const universitySchema = z
  .string()
  .max(200, 'University name is too long')
  .optional();

export const programSchema = z
  .string()
  .max(200, 'Program name is too long')
  .optional();

export const countrySchema = z
  .string()
  .max(100, 'Country name is too long')
  .optional();

export const updateProfileSchema = z.object({
  firstName: firstNameSchema.optional(),
  lastName: lastNameSchema.optional(),
  username: usernameSchema.optional(),
  university: universitySchema,
  program: programSchema,
  country: countrySchema,
});

// ============================================================================
// ASSIGNMENT SCHEMAS
// ============================================================================

export const assignmentTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or less');

export const assignmentDescriptionSchema = z
  .string()
  .max(5000, 'Description must be 5000 characters or less')
  .optional();

export const dueDateSchema = z
  .string()
  .datetime('Invalid due date format. Must be ISO 8601 datetime string');

export const createAssignmentSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  title: assignmentTitleSchema,
  description: assignmentDescriptionSchema,
  due_date: dueDateSchema,
  submission_method: z.enum(['online', 'in-person']).optional(),
  submission_link: z
    .string()
    .url('Invalid URL format')
    .optional()
    .or(z.literal('')),
  reminders: z.array(z.number().int().positive()).optional(),
});

// ============================================================================
// LECTURE SCHEMAS
// ============================================================================

export const lectureTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or less');

export const createLectureSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  title: lectureTitleSchema,
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime('Invalid start time format'),
  end_time: z.string().datetime('Invalid end time format'),
  location: z.string().max(200).optional(),
  reminders: z.array(z.number().int().positive()).optional(),
});

// ============================================================================
// STUDY SESSION SCHEMAS
// ============================================================================

export const studySessionTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or less');

export const createStudySessionSchema = z.object({
  course_id: z.string().uuid('Invalid course ID format'),
  title: studySessionTitleSchema,
  description: z.string().max(5000).optional(),
  start_time: z.string().datetime('Invalid start time format'),
  end_time: z.string().datetime('Invalid end time format').optional(),
  location: z.string().max(200).optional(),
});

// ============================================================================
// COURSE SCHEMAS
// ============================================================================

export const courseNameSchema = z
  .string()
  .min(1, 'Course name is required')
  .max(100, 'Course name is too long');

export const courseCodeSchema = z
  .string()
  .max(20, 'Course code is too long')
  .optional();

export const createCourseSchema = z.object({
  course_name: courseNameSchema,
  course_code: courseCodeSchema,
  about_course: z.string().max(5000).optional(),
  university: universitySchema,
  program: programSchema,
});
