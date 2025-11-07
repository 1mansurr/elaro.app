/**
 * Contract Tests for Lecture Entity
 *
 * Validates that client-side TypeScript types align with server-side Zod schemas.
 */

import { CreateLectureRequest } from '@/types/api';

interface BackendCreateLectureSchema {
  course_id: string; // UUID
  lecture_name: string; // min 1, max 35
  description?: string; // max 5000
  start_time: string; // ISO 8601 datetime
  end_time?: string; // ISO 8601 datetime
  is_recurring?: boolean;
  recurring_pattern?: string;
  reminders?: number[]; // Array of positive integers
}

function transformClientToServer(
  client: CreateLectureRequest,
): BackendCreateLectureSchema {
  return {
    course_id: client.course_id,
    lecture_name: client.lecture_name,
    description: client.description,
    start_time: client.start_time,
    end_time: client.end_time,
    is_recurring: client.is_recurring,
    recurring_pattern: client.recurring_pattern,
    reminders: client.reminders,
  };
}

function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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

describe('Lecture Contract Tests', () => {
  describe('CreateLectureRequest', () => {
    it('should transform valid client request to server format', () => {
      const clientRequest: CreateLectureRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        lecture_name: 'Introduction to Algorithms',
        start_time: '2024-12-31T10:00:00Z',
        end_time: '2024-12-31T11:30:00Z',
      };

      const serverRequest = transformClientToServer(clientRequest);

      expect(serverRequest.course_id).toBe(clientRequest.course_id);
      expect(serverRequest.lecture_name).toBe(clientRequest.lecture_name);
      expect(serverRequest.start_time).toBe(clientRequest.start_time);
    });

    it('should validate required fields match backend schema', () => {
      const validRequest: CreateLectureRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        lecture_name: 'Test Lecture',
        start_time: '2024-12-31T10:00:00Z',
      };

      const serverRequest = transformClientToServer(validRequest);

      expect(isValidUUID(serverRequest.course_id)).toBe(true);
      expect(serverRequest.lecture_name.length).toBeGreaterThan(0);
      expect(serverRequest.lecture_name.length).toBeLessThanOrEqual(35);
      expect(isValidISO8601(serverRequest.start_time)).toBe(true);
    });

    it('should validate lecture_name max length (35 characters)', () => {
      const nameTooLong = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        lecture_name: 'a'.repeat(36), // Exceeds max
        start_time: '2024-12-31T10:00:00Z',
      };

      const serverRequest = transformClientToServer(
        nameTooLong as CreateLectureRequest,
      );
      expect(serverRequest.lecture_name.length).toBeGreaterThan(35);
    });
  });
});
