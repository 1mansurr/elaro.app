// Mock for various services
export const mixpanelService = {
  track: jest.fn(),
  trackEvent: jest.fn(),
};

export const performanceMonitoringService = {
  startTimer: jest.fn(),
  endTimer: jest.fn(),
  recordMetric: jest.fn(),
  getMetrics: jest.fn(() => ({})),
  enableDebugMode: jest.fn(),
};

export const requestDeduplicationService = {
  deduplicateRequest: jest.fn((key, fn) => fn()),
};

export const supabase = {
  functions: {
    invoke: jest.fn(),
  },
};
