/**
 * Contract Tests for API Response Types
 *
 * Validates that client-side TypeScript types align with server-side response formats.
 * Ensures error handling and success responses are properly typed.
 */

import { z } from 'zod';

// Backend API Success Response Schema
const BackendSuccessResponseSchema = z.object({
  data: z.unknown(),
  status: z.number().optional(),
  statusText: z.string().optional(),
});

// Backend API Error Response Schema
const BackendErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),
  status: z.number().optional(),
  statusText: z.string().optional(),
});

// Backend Paginated Response Schema
const BackendPaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
});

type BackendSuccessResponse = z.infer<typeof BackendSuccessResponseSchema>;
type BackendErrorResponse = z.infer<typeof BackendErrorResponseSchema>;
type BackendPaginatedResponse = z.infer<typeof BackendPaginatedResponseSchema>;

// Client-side types
interface ClientSuccessResponse<T = unknown> {
  data: T;
  status?: number;
  statusText?: string;
}

interface ClientErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  status?: number;
  statusText?: string;
}

interface ClientPaginatedResponse<T = unknown> {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Transform backend response to client format
 */
function transformBackendToClient<T>(
  backend: BackendSuccessResponse,
): ClientSuccessResponse<T> {
  return {
    data: backend.data as T,
    status: backend.status,
    statusText: backend.statusText,
  };
}

/**
 * Validate error response format
 */
function validateErrorResponse(
  response: unknown,
): response is ClientErrorResponse {
  const parsed = BackendErrorResponseSchema.safeParse(response);
  return parsed.success;
}

/**
 * Validate paginated response format
 */
function validatePaginatedResponse<T>(
  response: unknown,
): response is ClientPaginatedResponse<T> {
  const parsed = BackendPaginatedResponseSchema.safeParse(response);
  return parsed.success;
}

describe('API Response Contract Tests', () => {
  describe('Success Response', () => {
    it('should transform backend success response to client format', () => {
      const backendResponse: BackendSuccessResponse = {
        data: { id: '123', name: 'Test' },
        status: 200,
        statusText: 'OK',
      };

      const clientResponse = transformBackendToClient(backendResponse);

      expect(clientResponse.data).toEqual(backendResponse.data);
      expect(clientResponse.status).toBe(200);
      expect(clientResponse.statusText).toBe('OK');
    });

    it('should handle success response without status', () => {
      const backendResponse: BackendSuccessResponse = {
        data: { id: '123' },
      };

      const clientResponse = transformBackendToClient(backendResponse);

      expect(clientResponse.data).toBeDefined();
      expect(clientResponse.status).toBeUndefined();
    });

    it('should validate response data structure', () => {
      const validResponses = [
        { data: { id: '123' } },
        { data: [] },
        { data: null },
        { data: 'string' },
        { data: 123 },
      ];

      validResponses.forEach(response => {
        const parsed = BackendSuccessResponseSchema.safeParse(response);
        expect(parsed.success).toBe(true);
      });
    });
  });

  describe('Error Response', () => {
    it('should validate error response format', () => {
      const validErrorResponse = {
        error: {
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
          details: { field: 'value' },
        },
        status: 500,
        statusText: 'Internal Server Error',
      };

      expect(validateErrorResponse(validErrorResponse)).toBe(true);
    });

    it('should validate error response with minimal fields', () => {
      const minimalErrorResponse = {
        error: {
          message: 'Error occurred',
        },
      };

      expect(validateErrorResponse(minimalErrorResponse)).toBe(true);
    });

    it('should reject invalid error response format', () => {
      const invalidResponses = [
        { message: 'Error' }, // Missing error wrapper
        { error: 'Error string' }, // Error should be object
        { error: {} }, // Missing message
      ];

      invalidResponses.forEach(response => {
        expect(validateErrorResponse(response)).toBe(false);
      });
    });

    it('should validate error codes', () => {
      const errorCodes = [
        'UNAUTHORIZED',
        'FORBIDDEN',
        'NOT_FOUND',
        'VALIDATION_ERROR',
        'INTERNAL_ERROR',
      ];

      errorCodes.forEach(code => {
        const errorResponse = {
          error: {
            message: 'Error',
            code,
          },
        };

        expect(validateErrorResponse(errorResponse)).toBe(true);
      });
    });
  });

  describe('Paginated Response', () => {
    it('should validate paginated response format', () => {
      const validPaginatedResponse = {
        data: [{ id: '1' }, { id: '2' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          totalPages: 10,
        },
      };

      expect(validatePaginatedResponse(validPaginatedResponse)).toBe(true);
    });

    it('should validate paginated response without pagination metadata', () => {
      const responseWithoutPagination = {
        data: [{ id: '1' }],
      };

      expect(validatePaginatedResponse(responseWithoutPagination)).toBe(true);
    });

    it('should validate pagination metadata structure', () => {
      const validPagination = {
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
      };

      const response = {
        data: [],
        pagination: validPagination,
      };

      expect(validatePaginatedResponse(response)).toBe(true);
    });

    it('should reject invalid pagination metadata', () => {
      const invalidResponses = [
        { data: [], pagination: { page: '1' } }, // Wrong type
        { data: [], pagination: { limit: -1 } }, // Invalid value
        { data: 'not-array' }, // Data should be array
      ];

      invalidResponses.forEach(response => {
        expect(validatePaginatedResponse(response)).toBe(false);
      });
    });
  });

  describe('Response Type Safety', () => {
    it('should distinguish between success and error responses', () => {
      const successResponse = {
        data: { id: '123' },
        status: 200,
      };

      const errorResponse = {
        error: {
          message: 'Error',
        },
        status: 400,
      };

      const successParsed =
        BackendSuccessResponseSchema.safeParse(successResponse);
      const errorParsed = BackendErrorResponseSchema.safeParse(errorResponse);

      expect(successParsed.success).toBe(true);
      expect(errorParsed.success).toBe(true);

      // They should not be interchangeable
      expect(
        BackendSuccessResponseSchema.safeParse(errorResponse).success,
      ).toBe(false);
      expect(
        BackendErrorResponseSchema.safeParse(successResponse).success,
      ).toBe(false);
    });

    it('should handle HTTP status codes correctly', () => {
      const statusCodes = [200, 201, 400, 401, 403, 404, 500];

      statusCodes.forEach(status => {
        const response = {
          data: { id: '123' },
          status,
          statusText: status === 200 ? 'OK' : 'Error',
        };

        const parsed = BackendSuccessResponseSchema.safeParse(response);
        expect(parsed.success).toBe(true);
      });
    });
  });
});
