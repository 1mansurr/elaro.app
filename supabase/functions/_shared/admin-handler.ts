/**
 * Admin Handler Utility
 *
 * Provides a wrapper for admin-only endpoints that require admin authentication
 */

import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from './function-handler.ts';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_STATUS_CODES,
} from './error-codes.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { isAdmin } from './permissions.ts';

/**
 * Creates an authenticated handler that also checks for admin privileges
 *
 * @param handler - Handler function that accepts AuthenticatedRequest
 * @param rateLimitName - Name for rate limiting
 * @param schema - Optional Zod schema for validation
 * @param requireIdempotency - Whether to require idempotency key for mutations
 * @returns Wrapped handler with admin check
 */
export function createAdminHandler(
  handler: (req: AuthenticatedRequest) => Promise<any>,
  rateLimitName: string,
  schema?: z.ZodSchema,
  requireIdempotency: boolean = false,
) {
  return createAuthenticatedHandler(
    async (authReq: AuthenticatedRequest) => {
      const { user, supabaseClient } = authReq;

      // Check admin status
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('subscription_tier, account_status')
        .eq('id', user.id)
        .single();

      if (userError) {
        throw new AppError(
          ERROR_MESSAGES.DB_ERROR,
          ERROR_STATUS_CODES.DB_ERROR,
          ERROR_CODES.DB_ERROR,
        );
      }

      if (!userData || !isAdmin(userData.subscription_tier)) {
        throw new AppError(
          'Admin access required',
          ERROR_STATUS_CODES.FORBIDDEN,
          ERROR_CODES.FORBIDDEN,
        );
      }

      // User is admin, proceed with handler
      return await handler(authReq);
    },
    {
      rateLimitName,
      schema,
      requireIdempotency,
    },
  );
}
