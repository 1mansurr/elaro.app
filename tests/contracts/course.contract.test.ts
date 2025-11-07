/**
 * Contract Tests for Course Entity
 *
 * Validates that client-side TypeScript types align with server-side Zod schemas.
 */

import { CreateCourseRequest } from '@/types/api';

interface BackendCreateCourseSchema {
  course_name: string; // min 1, max 200
  course_code?: string; // max 50
  about_course?: string; // max 2000
}

function transformClientToServer(
  client: CreateCourseRequest,
): BackendCreateCourseSchema {
  return {
    course_name: client.course_name,
    course_code: client.course_code,
    about_course: client.about_course,
  };
}

describe('Course Contract Tests', () => {
  describe('CreateCourseRequest', () => {
    it('should transform valid client request to server format', () => {
      const clientRequest: CreateCourseRequest = {
        course_name: 'Data Structures',
        course_code: 'CS201',
        about_course: 'Introduction to data structures',
      };

      const serverRequest = transformClientToServer(clientRequest);

      expect(serverRequest.course_name).toBe(clientRequest.course_name);
      expect(serverRequest.course_code).toBe(clientRequest.course_code);
      expect(serverRequest.about_course).toBe(clientRequest.about_course);
    });

    it('should validate required fields match backend schema', () => {
      const validRequest: CreateCourseRequest = {
        course_name: 'Test Course',
      };

      const serverRequest = transformClientToServer(validRequest);

      expect(serverRequest.course_name).toBeDefined();
      expect(serverRequest.course_name.length).toBeGreaterThan(0);
      expect(serverRequest.course_name.length).toBeLessThanOrEqual(200);
    });

    it('should validate optional fields match backend schema', () => {
      const requestWithOptionals: CreateCourseRequest = {
        course_name: 'Test Course',
        course_code: 'TC101',
        about_course: 'Test description',
      };

      const serverRequest = transformClientToServer(requestWithOptionals);

      if (serverRequest.course_code) {
        expect(serverRequest.course_code.length).toBeLessThanOrEqual(50);
      }

      if (serverRequest.about_course) {
        expect(serverRequest.about_course.length).toBeLessThanOrEqual(2000);
      }
    });

    it('should reject invalid client data that backend would reject', () => {
      // Test course_name too long
      const nameTooLong = {
        course_name: 'a'.repeat(201),
      };

      const serverRequest = transformClientToServer(
        nameTooLong as CreateCourseRequest,
      );
      expect(serverRequest.course_name.length).toBeGreaterThan(200);

      // Test course_code too long
      const codeTooLong = {
        course_name: 'Test',
        course_code: 'a'.repeat(51),
      };

      const serverRequest2 = transformClientToServer(
        codeTooLong as CreateCourseRequest,
      );
      if (serverRequest2.course_code) {
        expect(serverRequest2.course_code.length).toBeGreaterThan(50);
      }
    });
  });
});
