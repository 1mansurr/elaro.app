/**
 * Standardized Response Utilities
 *
 * Provides consistent response formats across all Edge Functions
 * following a standard envelope pattern.
 */

import { corsHeaders, getCorsHeaders } from './cors.ts';
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
 * @param origin - Optional origin header for CORS (if not provided, uses legacy corsHeaders)
 * @returns Response object with standardized format
 */
export function successResponse<T>(
  data: T,
  additionalHeaders: Record<string, string> = {},
  origin: string | null = null,
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

  const cors = origin !== null ? getCorsHeaders(origin) : corsHeaders;
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...cors,
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
 * @param origin - Optional origin header for CORS (if not provided, uses legacy corsHeaders)
 * @returns Response object with standardized error format
 */
export function errorResponse(
  error: unknown,
  statusCode: number = 500,
  additionalHeaders: Record<string, string> = {},
  origin: string | null = null,
): Response {
  const err = error as {
    code?: string;
    message?: string;
    details?: unknown;
    statusCode?: number;
  };
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

  const cors = origin !== null ? getCorsHeaders(origin) : corsHeaders;
  return new Response(JSON.stringify(response), {
    status: err.statusCode || statusCode,
    headers: {
      ...cors,
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
 * @param origin - Optional origin header for CORS (if not provided, uses legacy corsHeaders)
 * @returns Response with pagination metadata
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  additionalHeaders: Record<string, string> = {},
  origin: string | null = null,
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

  const cors = origin !== null ? getCorsHeaders(origin) : corsHeaders;
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...cors,
      ...addVersionHeaders(),
      ...additionalHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Legacy compatibility function for api-v2 migration
 * Wraps successResponse/errorResponse for backward compatibility
 *
 * @deprecated Use successResponse or errorResponse directly
 * @param data - Response object with data or error property
 * @param statusCode - HTTP status code (default: 200)
 * @returns Response object with standardized format
 */
export function createResponse(
  data: { data?: unknown; error?: unknown } | unknown,
  statusCode: number = 200,
): Response {
  // If data has an error property, return error response
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return errorResponse(data.error as Error, statusCode);
  }

  // Extract data property if it exists, otherwise use the whole object
  const responseData =
    data && typeof data === 'object' && 'data' in data
      ? (data as { data: unknown }).data
      : data;

  // For non-200 status codes without error, still return successResponse but with status code
  if (statusCode >= 200 && statusCode < 300) {
    return successResponse(responseData, {});
  } else {
    // For error status codes, create error response
    return errorResponse(
      new Error(responseData ? String(responseData) : 'Unknown error'),
      statusCode,
    );
  }
}
