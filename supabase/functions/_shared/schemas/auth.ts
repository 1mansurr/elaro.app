import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const SignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().max(50).optional(),
  name: z.string().max(100).optional(), // Legacy support
});

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  redirectTo: z.string().url().optional(),
});

export const UpdatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  type: z.enum(['signup', 'email_change']).optional(),
});

export const UpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().max(50).optional(),
  name: z.string().max(100).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character',
    )
    .optional(),
});

