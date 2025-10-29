// Mock for utility functions
export const createExampleData = jest.fn(() => Promise.resolve({ success: true }));
export const getDraftCount = jest.fn(() => Promise.resolve(0));
export const mapErrorCodeToMessage = jest.fn((error) => 'Error message');
export const getErrorTitle = jest.fn((error) => 'Error');
export const TASK_EVENTS = {
  TASK_EDIT_INITIATED: 'task_edit_initiated',
};
export const AnalyticsEvents = {
  SIGN_UP_PROMPTED: 'sign_up_prompted',
  TASK_DETAILS_VIEWED: 'task_details_viewed',
  STUDY_SESSION_CREATED: 'study_session_created',
  ASSIGNMENT_CREATED: 'assignment_created',
  LECTURE_CREATED: 'lecture_created',
};
