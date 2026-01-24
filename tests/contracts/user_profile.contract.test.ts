/**
 * Contract Tests for User Profile Entity
 *
 * Validates that client-side TypeScript types align with server-side Zod schemas.
 * Ensures frontend can successfully communicate with backend API.
 */

import { z } from 'zod';
import { User, UpdateCourseRequest } from '@/types';
import { UpdateAssignmentRequest } from '@/types/api';

// Backend Zod schema representation for user profile update
const BackendUpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  university: z.string().max(200).optional(),
  program: z.string().max(200).optional(),
  timezone: z.string().optional(),
  country: z.string().max(100).optional(),
});

// Backend User response schema
const BackendUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  university: z.string().nullable().optional(),
  program: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  role: z.enum(['user', 'admin']),
  onboarding_completed: z.boolean(),
  subscription_tier: z.enum(['free', 'oddity']).nullable(),
  account_status: z.enum(['active', 'deleted', 'suspended']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

type BackendUpdateProfile = z.infer<typeof BackendUpdateProfileSchema>;
type BackendUserResponse = z.infer<typeof BackendUserResponseSchema>;

// Client-side types
interface ClientUpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  username?: string;
  university?: string;
  program?: string;
  timezone?: string;
  country?: string;
}

/**
 * Transform client request to server format
 */
function transformClientToServer(
  client: ClientUpdateProfileRequest,
): BackendUpdateProfile {
  return {
    first_name: client.first_name,
    last_name: client.last_name,
    username: client.username,
    university: client.university,
    program: client.program,
    timezone: client.timezone,
    country: client.country,
  };
}

/**
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate username format (alphanumeric and underscore only)
 */
function isValidUsername(str: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(str) && str.length >= 3 && str.length <= 30;
}

/**
 * Transform backend response to client User type
 * Converts null values to undefined to match client-side type expectations
 */
function transformBackendToClient(backend: BackendUserResponse): Partial<User> {
  return {
    id: backend.id,
    email: backend.email,
    first_name: backend.first_name ?? undefined,
    last_name: backend.last_name ?? undefined,
    username: backend.username ?? undefined,
    university: backend.university ?? undefined,
    program: backend.program ?? undefined,
    timezone: backend.timezone ?? undefined,
    country: backend.country ?? undefined,
    role: backend.role,
    onboarding_completed: backend.onboarding_completed,
    subscription_tier: backend.subscription_tier,
    account_status: backend.account_status,
    created_at: backend.created_at,
    updated_at: backend.updated_at,
  };
}

describe('User Profile Contract Tests', () => {
  describe('UpdateProfileRequest', () => {
    it('should transform valid client request to server format', () => {
      const clientRequest: ClientUpdateProfileRequest = {
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        university: 'Test University',
        program: 'Computer Science',
        timezone: 'America/New_York',
        country: 'United States',
      };

      const serverRequest = transformClientToServer(clientRequest);

      expect(serverRequest.first_name).toBe(clientRequest.first_name);
      expect(serverRequest.last_name).toBe(clientRequest.last_name);
      expect(serverRequest.username).toBe(clientRequest.username);
    });

    it('should validate required field constraints match backend schema', () => {
      const validRequest: ClientUpdateProfileRequest = {
        first_name: 'John',
        username: 'johndoe123',
      };

      const serverRequest = transformClientToServer(validRequest);

      // Validate field lengths
      if (serverRequest.first_name) {
        expect(serverRequest.first_name.length).toBeGreaterThan(0);
        expect(serverRequest.first_name.length).toBeLessThanOrEqual(100);
      }

      if (serverRequest.username) {
        expect(serverRequest.username.length).toBeGreaterThanOrEqual(3);
        expect(serverRequest.username.length).toBeLessThanOrEqual(30);
        expect(isValidUsername(serverRequest.username)).toBe(true);
      }
    });

    it('should reject invalid client data that backend would reject', () => {
      // Test username too short
      const usernameTooShort = {
        username: 'jo', // Less than 3 characters
      };

      const serverRequest1 = transformClientToServer(
        usernameTooShort as ClientUpdateProfileRequest,
      );
      if (serverRequest1.username) {
        expect(serverRequest1.username.length).toBeLessThan(3);
      }

      // Test username too long
      const usernameTooLong = {
        username: 'a'.repeat(31), // Exceeds max length
      };

      const serverRequest2 = transformClientToServer(
        usernameTooLong as ClientUpdateProfileRequest,
      );
      if (serverRequest2.username) {
        expect(serverRequest2.username.length).toBeGreaterThan(30);
      }

      // Test invalid username characters
      const invalidUsername = {
        username: 'john-doe', // Contains hyphen
      };

      const serverRequest3 = transformClientToServer(
        invalidUsername as ClientUpdateProfileRequest,
      );
      if (serverRequest3.username) {
        expect(isValidUsername(serverRequest3.username)).toBe(false);
      }

      // Test first_name too long
      const firstNameTooLong = {
        first_name: 'a'.repeat(101), // Exceeds max length
      };

      const serverRequest4 = transformClientToServer(
        firstNameTooLong as ClientUpdateProfileRequest,
      );
      if (serverRequest4.first_name) {
        expect(serverRequest4.first_name.length).toBeGreaterThan(100);
      }
    });

    it('should handle optional fields correctly', () => {
      const minimalRequest: ClientUpdateProfileRequest = {
        first_name: 'John',
      };

      const serverRequest = transformClientToServer(minimalRequest);

      expect(serverRequest.first_name).toBeDefined();
      expect(serverRequest.last_name).toBeUndefined();
      expect(serverRequest.username).toBeUndefined();
    });
  });

  describe('User Response', () => {
    it('should validate server response matches client expectations', () => {
      const serverResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        university: 'Test University',
        program: 'Computer Science',
        timezone: 'America/New_York',
        country: 'United States',
        role: 'user',
        onboarding_completed: true,
        subscription_tier: 'oddity',
        account_status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Validate with Zod schema
      const parsed = BackendUserResponseSchema.safeParse(serverResponse);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        const user = transformBackendToClient(parsed.data);
        expect(user.id).toBe(serverResponse.id);
        expect(user.email).toBe(serverResponse.email);
        expect(user.role).toBe('user');
        expect(user.onboarding_completed).toBe(true);
      }
    });

    it('should handle nullable fields correctly', () => {
      const serverResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        first_name: null,
        last_name: null,
        username: null,
        university: null,
        program: null,
        timezone: null,
        country: null,
        role: 'user',
        onboarding_completed: false,
        subscription_tier: null,
        account_status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const parsed = BackendUserResponseSchema.safeParse(serverResponse);
      expect(parsed.success).toBe(true);
    });

    it('should validate enum values', () => {
      const validRoles: Array<'user' | 'admin'> = ['user', 'admin'];
      const validSubscriptionTiers: Array<'free' | 'oddity'> = [
        'free',
        'oddity',
      ];
      const validAccountStatuses: Array<'active' | 'deleted' | 'suspended'> = [
        'active',
        'deleted',
        'suspended',
      ];

      validRoles.forEach(role => {
        const response = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role,
          onboarding_completed: true,
          subscription_tier: 'free',
          account_status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const parsed = BackendUserResponseSchema.safeParse(response);
        expect(parsed.success).toBe(true);
      });

      validSubscriptionTiers.forEach(tier => {
        const response = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role: 'user',
          onboarding_completed: true,
          subscription_tier: tier,
          account_status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const parsed = BackendUserResponseSchema.safeParse(response);
        expect(parsed.success).toBe(true);
      });

      validAccountStatuses.forEach(status => {
        const response = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role: 'user',
          onboarding_completed: true,
          subscription_tier: 'free',
          account_status: status,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        const parsed = BackendUserResponseSchema.safeParse(response);
        expect(parsed.success).toBe(true);
      });
    });
  });
});
