/**
 * Standardized Response Utilities
 * 
 * Provides consistent response formats across all Edge Functions
 * following a standard envelope pattern.
 */

import { corsHeaders } from './cors.ts';
import { addVersionHeaders } from './versioning.ts';

/**
 * Standard API response envelope
 */
export interface StandardResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

/**
 * Create a successful response
 * 
 * @param data - Response data
 * @param additionalHeaders - Additional headers to include
 * @returns Response object with standardized format
 */
export function successResponse<T>(
  data: T,
  additionalHeaders: Record<string, string> = {}
): Response {
  const response: StandardResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId: crypto.randomUUID(),
    },
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      ...addVersionHeaders(),
      ...additionalHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response
 * 
 * @param error - Error object (AppError or standard Error)
 * @param statusCode - HTTP status code (default: 500)
 * @param additionalHeaders - Additional headers to include
 * @returns Response object with standardized error format
 */
export function errorResponse(
  error: unknown,
  statusCode: number = 500,
  additionalHeaders: Record<string, string> = {}
): Response {
  const err = error as { code?: string; message?: string; details?: unknown; statusCode?: number };
  const response: StandardResponse = {
    success: false,
    error: {
      code: err.code || 'UNKNOWN_ERROR',
      message: err.message || 'An error occurred',
      details: err.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId: crypto.randomUUID(),
    },
  };
  
  return new Response(JSON.stringify(response), {
    status: err.statusCode || statusCode,
    headers: {
      ...corsHeaders,
      ...addVersionHeaders(),
      ...additionalHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a paginated response
 * 
 * @param data - Array of data items
 * @param total - Total count of items
 * @param page - Current page number
 * @param pageSize - Number of items per page
 * @param additionalHeaders - Additional headers
 * @returns Response with pagination metadata
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  additionalHeaders: Record<string, string> = {}
): Response {
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  const response = {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      ...addVersionHeaders(),
      ...additionalHeaders,
      'Content-Type': 'application/json',
    },
  });
}

