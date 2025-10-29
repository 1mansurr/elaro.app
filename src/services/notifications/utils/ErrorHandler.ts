/**
 * Error handling utilities for notification services
 */

export const ERROR_CODES = {
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  SCHEDULING_FAILED: 'SCHEDULING_FAILED',
  CANCELLATION_FAILED: 'CANCELLATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOTIFICATION_HISTORY_ERROR: 'NOTIFICATION_HISTORY_ERROR',
  UNREAD_COUNT_ERROR: 'UNREAD_COUNT_ERROR',
  MARK_READ_ERROR: 'MARK_READ_ERROR',
  MARK_ALL_READ_ERROR: 'MARK_ALL_READ_ERROR',
  DELETE_NOTIFICATION_ERROR: 'DELETE_NOTIFICATION_ERROR',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  COMPLETE_TASK_ERROR: 'COMPLETE_TASK_ERROR',
} as const;

export class NotificationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'NotificationError';
  }
}

export const errorHandler = {
  handleError: (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    return new NotificationError(error.message || 'Unknown error', ERROR_CODES.DELIVERY_FAILED);
  },
  
  createError: (message: string, code: string) => {
    return new NotificationError(message, code);
  },
};
