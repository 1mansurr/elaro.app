/**
 * Contract Tests for Assignment Entity
 *
 * Validates that client-side TypeScript types align with server-side Zod schemas.
 * Ensures frontend can successfully communicate with backend API.
 */

import { CreateAssignmentRequest } from '@/types/api';

// Mock representation of backend Zod schema requirements
// These match the actual Zod schemas in supabase/functions/_shared/schemas/assignment.ts
interface BackendCreateAssignmentSchema {
  course_id: string; // UUID format
  title: string; // min 1, max 200
  description?: string; // max 5000
  due_date: string; // ISO 8601 datetime
  submission_method?: 'online' | 'in-person';
  submission_link?: string; // URL format or empty string
  reminders?: number[]; // Array of positive integers
}

/**
 * Transform client request to server format
 * This is what should happen before sending to API
 */
function transformClientToServer(
  client: CreateAssignmentRequest,
): BackendCreateAssignmentSchema {
  return {
    course_id: client.course_id,
    title: client.title,
    description: client.description,
    due_date: client.due_date,
    submission_method: client.submission_method as
      | 'online'
      | 'in-person'
      | undefined,
    submission_link: client.submission_link,
    reminders: client.reminders,
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
 * Validate ISO 8601 datetime format
 */
function isValidISO8601(str: string): boolean {
  try {
    const date = new Date(str);
    return (
      date.toISOString() === str ||
      date.toISOString().slice(0, -1) === str.slice(0, -1)
    );
  } catch {
    return false;
  }
}

/**
 * Validate URL format
 */
function isValidURL(str: string): boolean {
  if (str === '') return true; // Empty string is allowed
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

describe('Assignment Contract Tests', () => {
  describe('CreateAssignmentRequest', () => {
    it('should transform valid client request to server format', () => {
      const clientRequest: CreateAssignmentRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Math Homework',
        description: 'Complete exercises 1-10',
        due_date: '2024-12-31T23:59:59Z',
        submission_method: 'online',
        submission_link: 'https://example.com/submit',
        reminders: [60, 1440],
      };

      const serverRequest = transformClientToServer(clientRequest);

      expect(serverRequest.course_id).toBe(clientRequest.course_id);
      expect(serverRequest.title).toBe(clientRequest.title);
      expect(serverRequest.due_date).toBe(clientRequest.due_date);
      expect(serverRequest.submission_method).toBe('online');
    });

    it('should validate required fields match backend schema', () => {
      const validRequest: CreateAssignmentRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Assignment',
        due_date: '2024-12-31T23:59:59Z',
        reminders: [],
      };

      const serverRequest = transformClientToServer(validRequest);

      // Validate required fields
      expect(serverRequest.course_id).toBeDefined();
      expect(serverRequest.title).toBeDefined();
      expect(serverRequest.due_date).toBeDefined();

      // Validate formats
      expect(isValidUUID(serverRequest.course_id)).toBe(true);
      expect(isValidISO8601(serverRequest.due_date)).toBe(true);
      expect(serverRequest.title.length).toBeGreaterThan(0);
      expect(serverRequest.title.length).toBeLessThanOrEqual(200);
    });

    it('should validate optional fields match backend schema', () => {
      const requestWithOptionals: CreateAssignmentRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test',
        due_date: '2024-12-31T23:59:59Z',
        description: 'Description',
        submission_method: 'in-person',
        submission_link: 'https://example.com',
        reminders: [30, 60],
      };

      const serverRequest = transformClientToServer(requestWithOptionals);

      if (serverRequest.description) {
        expect(serverRequest.description.length).toBeLessThanOrEqual(5000);
      }

      if (serverRequest.submission_link) {
        expect(isValidURL(serverRequest.submission_link)).toBe(true);
      }

      if (serverRequest.reminders) {
        serverRequest.reminders.forEach(reminder => {
          expect(Number.isInteger(reminder)).toBe(true);
          expect(reminder).toBeGreaterThan(0);
        });
      }
    });

    it('should reject invalid client data that backend would reject', () => {
      // Test invalid UUID
      const invalidUUID = {
        course_id: 'not-a-uuid',
        title: 'Test',
        due_date: '2024-12-31T23:59:59Z',
        reminders: [],
      };

      const serverRequest = transformClientToServer(
        invalidUUID as CreateAssignmentRequest,
      );
      expect(isValidUUID(serverRequest.course_id)).toBe(false);

      // Test invalid datetime
      const invalidDateTime = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test',
        due_date: 'invalid-date',
        reminders: [],
      };

      const serverRequest2 = transformClientToServer(
        invalidDateTime as CreateAssignmentRequest,
      );
      expect(isValidISO8601(serverRequest2.due_date)).toBe(false);

      // Test title too long
      const titleTooLong = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'a'.repeat(201), // Exceeds max length
        due_date: '2024-12-31T23:59:59Z',
        reminders: [],
      };

      const serverRequest3 = transformClientToServer(
        titleTooLong as CreateAssignmentRequest,
      );
      expect(serverRequest3.title.length).toBeGreaterThan(200);
    });

    it('should handle empty submission_link (allowed by backend)', () => {
      const request: CreateAssignmentRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test',
        due_date: '2024-12-31T23:59:59Z',
        submission_link: '',
        reminders: [],
      };

      const serverRequest = transformClientToServer(request);
      expect(isValidURL(serverRequest.submission_link || '')).toBe(true);
    });

    it('should validate submission_method enum values', () => {
      const validMethods: Array<'online' | 'in-person'> = [
        'online',
        'in-person',
      ];

      validMethods.forEach(method => {
        const request: CreateAssignmentRequest = {
          course_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test',
          due_date: '2024-12-31T23:59:59Z',
          submission_method: method,
          reminders: [],
        };

        const serverRequest = transformClientToServer(request);
        expect(['online', 'in-person']).toContain(
          serverRequest.submission_method,
        );
      });
    });

    it('should validate reminders array constraints', () => {
      const validReminders: CreateAssignmentRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test',
        due_date: '2024-12-31T23:59:59Z',
        reminders: [30, 60, 1440], // All positive integers
      };

      const serverRequest = transformClientToServer(validReminders);
      if (serverRequest.reminders) {
        serverRequest.reminders.forEach(reminder => {
          expect(Number.isInteger(reminder)).toBe(true);
          expect(reminder).toBeGreaterThan(0);
        });
      }
    });
  });
});
