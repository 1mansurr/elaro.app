import { z } from 'zod';

export const CheckUsernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores',
    ),
});

// Schema for updating user profile
export const UpdateUserProfileSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .optional(),
  last_name: z
    .string()
    .max(50, 'Last name must be 50 characters or less')
    .optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores',
    )
    .optional(),
  university: z
    .string()
    .max(100, 'University name must be 100 characters or less')
    .optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
});

// Schema for suspending a user
export const SuspendUserSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  reason: z
    .string()
    .max(500, 'Reason must be 500 characters or less')
    .optional(),
});

// Schema for unsuspending a user
export const UnsuspendUserSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
});

// Schema for deleting a user
export const DeleteUserSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
});
