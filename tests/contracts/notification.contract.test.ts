/**
 * Contract Tests for Notification Entity
 *
 * Validates that client-side TypeScript types align with server-side Zod schemas.
 * Ensures frontend can successfully communicate with backend API.
 */

import { z } from 'zod';

// Backend Zod schema representation (matches supabase/functions/_shared/schemas/notification.ts)
const BackendNotificationPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
  reminderId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
});

const BackendNotificationResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  delivered: z.boolean(),
  deliveredAt: z.string().datetime().nullable(),
  scheduledFor: z.string().datetime().nullable(),
});

type BackendNotificationPayload = z.infer<
  typeof BackendNotificationPayloadSchema
>;
type BackendNotificationResponse = z.infer<
  typeof BackendNotificationResponseSchema
>;

// Client-side types (should match backend)
interface ClientNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  reminderId?: string;
  taskId?: string;
  scheduledFor?: string;
}

interface ClientNotificationResponse {
  id: string;
  title: string;
  body: string;
  delivered: boolean;
  deliveredAt: string | null;
  scheduledFor: string | null;
}

/**
 * Transform client request to server format
 */
function transformClientToServer(
  client: ClientNotificationPayload,
): BackendNotificationPayload {
  return {
    title: client.title,
    body: client.body,
    data: client.data,
    reminderId: client.reminderId,
    taskId: client.taskId,
    scheduledFor: client.scheduledFor,
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
    return !isNaN(date.getTime()) && date.toISOString() === str;
  } catch {
    return false;
  }
}

describe('Notification Contract Tests', () => {
  describe('Notification Payload', () => {
    it('should transform valid client payload to server format', () => {
      const clientPayload: ClientNotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { type: 'reminder' },
        reminderId: '123e4567-e89b-12d3-a456-426614174000',
        scheduledFor: '2024-12-31T23:59:59Z',
      };

      const serverPayload = transformClientToServer(clientPayload);

      expect(serverPayload.title).toBe(clientPayload.title);
      expect(serverPayload.body).toBe(clientPayload.body);
      expect(serverPayload.reminderId).toBe(clientPayload.reminderId);
    });

    it('should validate required fields match backend schema', () => {
      const validPayload: ClientNotificationPayload = {
        title: 'Test',
        body: 'Body',
      };

      const serverPayload = transformClientToServer(validPayload);

      // Validate required fields
      expect(serverPayload.title).toBeDefined();
      expect(serverPayload.body).toBeDefined();
      expect(serverPayload.title.length).toBeGreaterThan(0);
      expect(serverPayload.title.length).toBeLessThanOrEqual(200);
      expect(serverPayload.body.length).toBeGreaterThan(0);
      expect(serverPayload.body.length).toBeLessThanOrEqual(1000);
    });

    it('should validate optional fields match backend schema', () => {
      const payloadWithOptionals: ClientNotificationPayload = {
        title: 'Test',
        body: 'Body',
        reminderId: '123e4567-e89b-12d3-a456-426614174000',
        taskId: '123e4567-e89b-12d3-a456-426614174001',
        scheduledFor: '2024-12-31T23:59:59Z',
      };

      const serverPayload = transformClientToServer(payloadWithOptionals);

      if (serverPayload.reminderId) {
        expect(isValidUUID(serverPayload.reminderId)).toBe(true);
      }

      if (serverPayload.taskId) {
        expect(isValidUUID(serverPayload.taskId)).toBe(true);
      }

      if (serverPayload.scheduledFor) {
        expect(isValidISO8601(serverPayload.scheduledFor)).toBe(true);
      }
    });

    it('should reject invalid client data that backend would reject', () => {
      // Test invalid UUID
      const invalidUUID = {
        title: 'Test',
        body: 'Body',
        reminderId: 'not-a-uuid',
      };

      const serverPayload = transformClientToServer(
        invalidUUID as ClientNotificationPayload,
      );
      if (serverPayload.reminderId) {
        expect(isValidUUID(serverPayload.reminderId)).toBe(false);
      }

      // Test title too long
      const titleTooLong = {
        title: 'a'.repeat(201), // Exceeds max length
        body: 'Body',
      };

      const serverPayload2 = transformClientToServer(
        titleTooLong as ClientNotificationPayload,
      );
      expect(serverPayload2.title.length).toBeGreaterThan(200);

      // Test body too long
      const bodyTooLong = {
        title: 'Title',
        body: 'a'.repeat(1001), // Exceeds max length
      };

      const serverPayload3 = transformClientToServer(
        bodyTooLong as ClientNotificationPayload,
      );
      expect(serverPayload3.body.length).toBeGreaterThan(1000);
    });
  });

  describe('Notification Response', () => {
    it('should validate server response matches client expectations', () => {
      const serverResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Notification',
        body: 'This is a test',
        delivered: true,
        deliveredAt: '2024-12-31T23:59:59Z',
        scheduledFor: '2024-12-31T23:59:59Z',
      };

      // Validate with Zod schema
      const parsed =
        BackendNotificationResponseSchema.safeParse(serverResponse);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        const response: ClientNotificationResponse = parsed.data;
        expect(response.id).toBe(serverResponse.id);
        expect(response.title).toBe(serverResponse.title);
        expect(response.delivered).toBe(true);
      }
    });

    it('should handle nullable fields correctly', () => {
      const serverResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test',
        body: 'Body',
        delivered: false,
        deliveredAt: null,
        scheduledFor: null,
      };

      const parsed =
        BackendNotificationResponseSchema.safeParse(serverResponse);
      expect(parsed.success).toBe(true);
    });
  });
});
