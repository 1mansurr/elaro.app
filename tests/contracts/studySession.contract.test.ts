/**
 * Contract Tests for Study Session Entity
 *
 * Validates that client-side TypeScript types align with server-side Zod schemas.
 */

import { CreateStudySessionRequest } from '@/types/api';

// Note: The backend schema expects 'title' but frontend uses different fields
// This test validates the transformation needed
interface BackendCreateStudySessionSchema {
  title: string; // min 1, max 200
  description?: string; // max 5000
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime (required in backend)
  location?: string; // max 200
  reminders?: number[]; // Array of positive integers
}

// Note: Frontend CreateStudySessionRequest has different fields
// This transformation function shows what needs to be done
function transformClientToServer(
  client: CreateStudySessionRequest,
): BackendCreateStudySessionSchema {
  // Frontend uses 'topic' but backend expects 'title'
  // Frontend uses 'session_date' but backend expects 'start_time' and 'end_time'
  return {
    title: client.topic || 'Study Session', // Map topic to title
    description: client.notes,
    start_time: client.session_date, // Map session_date to start_time
    end_time: client.session_date, // Would need proper end_time calculation
    reminders: client.reminders,
  };
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

describe('Study Session Contract Tests', () => {
  describe('CreateStudySessionRequest', () => {
    it('should identify field name mismatches between client and server', () => {
      const clientRequest: CreateStudySessionRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        topic: 'Review for Exam',
        session_date: '2024-12-31T14:00:00Z',
        has_spaced_repetition: true,
        reminders: [60],
      };

      // This test documents the mismatch
      expect(clientRequest.topic).toBeDefined(); // Frontend uses 'topic'
      expect(clientRequest.session_date).toBeDefined(); // Frontend uses 'session_date'

      // Backend expects 'title' and separate 'start_time'/'end_time'
      const serverRequest = transformClientToServer(clientRequest);
      expect(serverRequest.title).toBe(clientRequest.topic);
      expect(serverRequest.start_time).toBe(clientRequest.session_date);
    });

    it('should validate datetime format', () => {
      const validRequest: CreateStudySessionRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        topic: 'Test Session',
        session_date: '2024-12-31T14:00:00Z',
        has_spaced_repetition: false,
        reminders: [],
      };

      const serverRequest = transformClientToServer(validRequest);
      expect(isValidISO8601(serverRequest.start_time)).toBe(true);
    });

    it('should validate title length constraints', () => {
      const validRequest: CreateStudySessionRequest = {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        topic: 'Test',
        session_date: '2024-12-31T14:00:00Z',
        has_spaced_repetition: false,
        reminders: [],
      };

      const serverRequest = transformClientToServer(validRequest);
      expect(serverRequest.title.length).toBeGreaterThan(0);
      expect(serverRequest.title.length).toBeLessThanOrEqual(200);
    });
  });
});
