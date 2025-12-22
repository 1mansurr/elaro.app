/**
 * Handler Utilities for api-v2 Migration
 *
 * Provides utilities to wrap old-style handlers for use with createAuthenticatedHandler
 * This allows gradual migration without breaking changes
 */

import {
  createAuthenticatedHandler,
  AuthenticatedRequest,
  AppError,
} from '../_shared/function-handler.ts';
import { z } from 'zod';
import {
  mapDatabaseError,
} from '../_shared/error-codes.ts';

/**
 * Wraps an old-style handler function to work with createAuthenticatedHandler
 * This allows gradual migration without breaking changes
 *
 * @param handler - Handler function that accepts AuthenticatedRequest
 * @param rateLimitName - Name for rate limiting
 * @param schema - Optional Zod schema for validation
 * @param requireIdempotency - Whether to require idempotency key for mutations
 * @returns Wrapped handler compatible with createAuthenticatedHandler
 */
export function wrapOldHandler<T>(
  handler: (req: AuthenticatedRequest) => Promise<T>,
  rateLimitName: string,
  schema?: z.ZodSchema,
  requireIdempotency: boolean = false,
) {
  return createAuthenticatedHandler(
    async (authReq: AuthenticatedRequest) => {
      const result = await handler(authReq);
      // Handler will automatically wrap the result in successResponse
      return result;
    },
    {
      rateLimitName,
      schema,
      requireIdempotency,
    },
  );
}

/**
 * Helper to handle database errors consistently
 * Maps database errors to AppError with proper sanitization
 *
 * @param error - Database error from Supabase
 * @throws AppError with sanitized message and proper error code
 */
export function handleDbError(error: unknown): never {
  const mapped = mapDatabaseError(error);
  throw new AppError(
    mapped.message,
    mapped.statusCode,
    mapped.code,
    error, // Include original error for server-side logging
  );
}

/**
 * Extract ID from URL path
 * Helper for handlers that need to get IDs from the URL
 *
 * @param url - Request URL string
 * @returns The last path segment (typically an ID)
 */
export function extractIdFromUrl(url: string): string | null {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  return pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
}
