import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const UpdateUserProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long').optional(),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores.").optional(),
  university: z.string().max(200, 'University name too long').optional(),
  program: z.string().max(200, 'Program name too long').optional(),
  country: z.string().max(100, 'Country name too long').optional(),
});

export const CheckUsernameSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
});

// Define a schema for a single course within the onboarding payload
const OnboardingCourseSchema = z.object({
  course_name: z.string().min(1, 'Course name is required').max(200, 'Course name too long'),
  course_code: z.string().max(50, 'Course code too long').optional(),
});

export const CompleteOnboardingSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  university: z.string().max(200, 'University name too long').optional(),
  program: z.string().max(200, 'Program name too long').optional(),
  country: z.string().max(100, 'Country name too long').optional(),
  courses: z.array(OnboardingCourseSchema).optional(),
});
