/**
 * Centralized Analytics Events Configuration
 * 
 * This file defines all tracked events and their properties for consistency across the app.
 * Use these constants instead of hardcoded strings to avoid typos and ensure consistency.
 */

// ============================================================================
// AUTHENTICATION EVENTS
// ============================================================================

export const AUTH_EVENTS = {
  // User sign up events
  USER_SIGNED_UP: {
    name: 'User Signed Up',
    properties: {
      email: 'string',
      first_name: 'string',
      last_name: 'string',
      signup_method: 'string', // 'email', 'apple', 'google'
      referral_source: 'string', // optional
    },
  },
  USER_SIGN_UP_FAILED: {
    name: 'User Sign Up Failed',
    properties: {
      email: 'string',
      error: 'string',
      error_code: 'string', // optional
    },
  },
  
  // User login events
  USER_LOGGED_IN: {
    name: 'User Logged In',
    properties: {
      user_id: 'string',
      email: 'string',
      subscription_tier: 'string',
      onboarding_completed: 'boolean',
      login_method: 'string', // 'email', 'apple', 'google'
    },
  },
  USER_LOGIN_FAILED: {
    name: 'User Login Failed',
    properties: {
      email: 'string',
      error: 'string',
      error_code: 'string', // optional
    },
  },
  
  // User logout events
  USER_LOGGED_OUT: {
    name: 'User Logged Out',
    properties: {
      session_duration: 'number', // optional, in minutes
      logout_reason: 'string', // 'manual', 'auto', 'error'
    },
  },
  
  // MFA events
  MFA_ENROLLED: {
    name: 'MFA Enrolled',
    properties: {
      user_id: 'string',
      method: 'string', // 'totp', 'sms', etc.
    },
  },
  MFA_VERIFIED: {
    name: 'MFA Verified',
    properties: {
      user_id: 'string',
      method: 'string',
      success: 'boolean',
    },
  },
} as const;

// ============================================================================
// APP LIFECYCLE EVENTS
// ============================================================================

export const APP_EVENTS = {
  APP_LAUNCHED: {
    name: 'App Launched',
    properties: {
      launch_time: 'string', // ISO timestamp
      app_version: 'string',
      platform: 'string', // 'ios', 'android'
      is_first_launch: 'boolean',
      previous_session_duration: 'number', // optional, in minutes
    },
  },
  APP_BACKGROUNDED: {
    name: 'App Backgrounded',
    properties: {
      session_duration: 'number', // in minutes
      screen: 'string',
    },
  },
  APP_FOREGROUNDED: {
    name: 'App Foregrounded',
    properties: {
      background_duration: 'number', // in minutes
      previous_screen: 'string',
    },
  },
} as const;

// ============================================================================
// SCREEN NAVIGATION EVENTS
// ============================================================================

export const SCREEN_EVENTS = {
  SCREEN_VIEWED: {
    name: 'Screen View',
    properties: {
      screen_name: 'string',
      route_name: 'string',
      route_params: 'object', // optional
      previous_screen: 'string', // optional
      time_on_previous_screen: 'number', // optional, in seconds
    },
  },
  SCREEN_EXITED: {
    name: 'Screen Exited',
    properties: {
      screen_name: 'string',
      time_on_screen: 'number', // in seconds
      exit_method: 'string', // 'navigation', 'back_button', 'gesture'
    },
  },
} as const;

// ============================================================================
// TASK MANAGEMENT EVENTS
// ============================================================================

export const TASK_EVENTS = {
  // Task creation
  TASK_CREATED: {
    name: 'Task Created',
    properties: {
      task_id: 'string',
      task_type: 'string', // 'lecture', 'assignment', 'study_session'
      task_title: 'string',
      creation_method: 'string', // 'manual', 'import', 'template'
      source: 'string', // 'home_screen_fab', 'course_detail', etc.
      estimated_duration: 'number', // optional, in minutes
      due_date: 'string', // optional, ISO date
    },
  },
  TASK_CREATION_FAILED: {
    name: 'Task Creation Failed',
    properties: {
      task_type: 'string',
      error: 'string',
      source: 'string',
    },
  },
  
  // Task completion
  TASK_COMPLETED: {
    name: 'Task Completed',
    properties: {
      task_id: 'string',
      task_type: 'string',
      task_title: 'string',
      completion_time: 'string', // ISO timestamp
      was_early: 'boolean', // completed before due date
      was_late: 'boolean', // completed after due date
      actual_duration: 'number', // optional, in minutes
      source: 'string', // 'task_detail_sheet', 'home_screen', etc.
    },
  },
  TASK_COMPLETION_FAILED: {
    name: 'Task Completion Failed',
    properties: {
      task_id: 'string',
      task_type: 'string',
      error: 'string',
      source: 'string',
    },
  },
  
  // Task editing
  TASK_EDITED: {
    name: 'Task Edited',
    properties: {
      task_id: 'string',
      task_type: 'string',
      fields_changed: 'array', // ['title', 'due_date', 'description']
      source: 'string',
    },
  },
  TASK_EDIT_INITIATED: {
    name: 'Task Edit Initiated',
    properties: {
      task_id: 'string',
      task_type: 'string',
      task_title: 'string',
      source: 'string',
    },
  },
  
  // Task deletion
  TASK_DELETED: {
    name: 'Task Deleted',
    properties: {
      task_id: 'string',
      task_type: 'string',
      task_title: 'string',
      deletion_reason: 'string', // 'user_request', 'course_deleted', etc.
      was_completed: 'boolean',
    },
  },
  
  // Task viewing
  TASK_DETAILS_VIEWED: {
    name: 'Task Details Viewed',
    properties: {
      task_id: 'string',
      task_type: 'string',
      task_title: 'string',
      source: 'string', // 'home_screen', 'calendar', 'notification'
    },
  },
  
  // Task interaction
  TASK_STARTED: {
    name: 'Task Started',
    properties: {
      task_id: 'string',
      task_type: 'string',
      task_title: 'string',
      start_time: 'string', // ISO timestamp
    },
  },
  TASK_PAUSED: {
    name: 'Task Paused',
    properties: {
      task_id: 'string',
      task_type: 'string',
      duration_before_pause: 'number', // in minutes
    },
  },
  TASK_RESUMED: {
    name: 'Task Resumed',
    properties: {
      task_id: 'string',
      task_type: 'string',
      pause_duration: 'number', // in minutes
    },
  },
} as const;

// ============================================================================
// SUBSCRIPTION & PAYMENT EVENTS
// ============================================================================

export const SUBSCRIPTION_EVENTS = {
  // Subscription changes
  SUBSCRIPTION_UPGRADED: {
    name: 'Subscription Upgraded',
    properties: {
      from_tier: 'string', // 'free', 'premium', 'pro'
      to_tier: 'string',
      price: 'number',
      currency: 'string', // 'USD', 'EUR', etc.
      payment_method: 'string', // 'apple_pay', 'google_pay', 'credit_card'
      billing_period: 'string', // 'monthly'
    },
  },
  SUBSCRIPTION_DOWNGRADED: {
    name: 'Subscription Downgraded',
    properties: {
      from_tier: 'string',
      to_tier: 'string',
      reason: 'string', // 'user_request', 'payment_failed', 'expired'
    },
  },
  SUBSCRIPTION_CANCELLED: {
    name: 'Subscription Cancelled',
    properties: {
      tier: 'string',
      cancellation_reason: 'string', // 'user_request', 'payment_failed', etc.
      time_remaining: 'number', // days until expiration
    },
  },
  
  // Trial events
  TRIAL_STARTED: {
    name: 'Subscription Trial Started',
    properties: {
      user_id: 'string',
      trial_type: 'string', // 'free_trial', 'premium_trial'
      trial_duration: 'number', // in days
    },
  },
  TRIAL_ENDED: {
    name: 'Subscription Trial Ended',
    properties: {
      user_id: 'string',
      trial_type: 'string',
      converted_to_paid: 'boolean',
      final_tier: 'string', // 'free', 'premium', etc.
    },
  },
  
  // Payment events
  PAYMENT_COMPLETED: {
    name: 'Payment Completed',
    properties: {
      amount: 'number',
      currency: 'string',
      payment_method: 'string',
      subscription_tier: 'string',
      transaction_id: 'string',
      platform: 'string', // 'ios', 'android'
    },
  },
  PAYMENT_FAILED: {
    name: 'Payment Failed',
    properties: {
      amount: 'number',
      currency: 'string',
      payment_method: 'string',
      error: 'string',
      subscription_tier: 'string',
    },
  },
  PAYMENT_REFUNDED: {
    name: 'Payment Refunded',
    properties: {
      amount: 'number',
      currency: 'string',
      subscription_tier: 'string',
      refund_reason: 'string',
    },
  },
} as const;

// ============================================================================
// ONBOARDING EVENTS
// ============================================================================

export const ONBOARDING_EVENTS = {
  ONBOARDING_STARTED: {
    name: 'Onboarding Started',
    properties: {
      user_id: 'string',
      onboarding_version: 'string', // track different onboarding flows
    },
  },
  ONBOARDING_STEP_COMPLETED: {
    name: 'Onboarding Step Completed',
    properties: {
      step: 'string', // 'welcome', 'profile_setup', 'first_task', etc.
      step_number: 'number',
      total_steps: 'number',
      time_on_step: 'number', // in seconds
    },
  },
  ONBOARDING_COMPLETED: {
    name: 'Onboarding Completed',
    properties: {
      completion_time: 'number', // total time in seconds
      skipped_steps: 'array', // steps that were skipped
      onboarding_version: 'string',
    },
  },
  ONBOARDING_ABANDONED: {
    name: 'Onboarding Abandoned',
    properties: {
      last_step: 'string',
      step_number: 'number',
      time_spent: 'number', // in seconds
      abandonment_reason: 'string', // optional
    },
  },
} as const;

// ============================================================================
// FEATURE USAGE EVENTS
// ============================================================================

export const FEATURE_EVENTS = {
  FEATURE_USED: {
    name: 'Feature Used',
    properties: {
      feature_name: 'string', // 'dark_mode_toggle', 'export_data', etc.
      screen: 'string',
      user_type: 'string', // subscription tier
      usage_count: 'number', // how many times used in session
    },
  },
  FEATURE_ACCESSED: {
    name: 'Feature Accessed',
    properties: {
      feature_name: 'string',
      access_method: 'string', // 'navigation', 'shortcut', 'notification'
      user_eligible: 'boolean', // based on subscription tier
    },
  },
  
  // Specific feature events
  DARK_MODE_TOGGLED: {
    name: 'Dark Mode Toggled',
    properties: {
      new_state: 'boolean', // true = dark, false = light
      previous_state: 'boolean',
    },
  },
  DATA_EXPORTED: {
    name: 'Data Exported',
    properties: {
      export_type: 'string', // 'all_data', 'tasks_only', 'calendar'
      export_format: 'string', // 'json', 'csv', 'pdf'
      data_size: 'number', // in bytes
    },
  },
  NOTIFICATION_PREFERENCES_UPDATED: {
    name: 'Notification Preferences Updated',
    properties: {
      preference_type: 'string', // 'push', 'email', 'reminders'
      new_value: 'boolean',
      previous_value: 'boolean',
    },
  },
} as const;

// ============================================================================
// ERROR & PERFORMANCE EVENTS
// ============================================================================

export const ERROR_EVENTS = {
  ERROR_OCCURRED: {
    name: 'Error Occurred',
    properties: {
      error_type: 'string', // 'network', 'validation', 'permission', 'unknown'
      error_message: 'string',
      error_code: 'string', // optional
      screen: 'string',
      user_action: 'string', // what the user was doing when error occurred
      severity: 'string', // 'low', 'medium', 'high', 'critical'
    },
  },
  API_ERROR: {
    name: 'API Error',
    properties: {
      endpoint: 'string',
      method: 'string', // 'GET', 'POST', 'PUT', 'DELETE'
      status_code: 'number',
      error_message: 'string',
      request_id: 'string', // optional
    },
  },
} as const;

export const PERFORMANCE_EVENTS = {
  PERFORMANCE_METRIC: {
    name: 'Performance Metric',
    properties: {
      metric_name: 'string', // 'screen_load_time', 'api_response_time', etc.
      value: 'number', // in milliseconds or appropriate unit
      screen: 'string', // optional
      user_type: 'string', // subscription tier
      device_type: 'string', // 'iphone', 'ipad', 'android_phone', etc.
    },
  },
  SLOW_OPERATION: {
    name: 'Slow Operation',
    properties: {
      operation: 'string', // 'task_creation', 'data_sync', etc.
      duration: 'number', // in milliseconds
      threshold: 'number', // what we consider "slow"
      screen: 'string',
    },
  },
} as const;

// ============================================================================
// ENGAGEMENT EVENTS
// ============================================================================

export const ENGAGEMENT_EVENTS = {
  SIGN_UP_PROMPTED: {
    name: 'Sign Up Prompted',
    properties: {
      source: 'string', // 'home_screen', 'feature_gate', 'onboarding'
      user_type: 'string', // 'guest', 'authenticated'
      prompt_context: 'string', // what triggered the prompt
    },
  },
  PREMIUM_FEATURE_GATED: {
    name: 'Premium Feature Gated',
    properties: {
      feature_name: 'string',
      current_tier: 'string',
      required_tier: 'string',
      screen: 'string',
    },
  },
  APP_RATED: {
    name: 'App Rated',
    properties: {
      rating: 'number', // 1-5 stars
      platform: 'string', // 'ios', 'android'
      rating_source: 'string', // 'in_app', 'store_redirect'
    },
  },
  FEEDBACK_SUBMITTED: {
    name: 'Feedback Submitted',
    properties: {
      feedback_type: 'string', // 'bug_report', 'feature_request', 'general'
      rating: 'number', // optional, 1-5
      has_contact_info: 'boolean',
    },
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all event names as a union type for TypeScript support
 */
export type AnalyticsEventName = 
  | typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS]['name']
  | typeof APP_EVENTS[keyof typeof APP_EVENTS]['name']
  | typeof SCREEN_EVENTS[keyof typeof SCREEN_EVENTS]['name']
  | typeof TASK_EVENTS[keyof typeof TASK_EVENTS]['name']
  | typeof SUBSCRIPTION_EVENTS[keyof typeof SUBSCRIPTION_EVENTS]['name']
  | typeof ONBOARDING_EVENTS[keyof typeof ONBOARDING_EVENTS]['name']
  | typeof FEATURE_EVENTS[keyof typeof FEATURE_EVENTS]['name']
  | typeof ERROR_EVENTS[keyof typeof ERROR_EVENTS]['name']
  | typeof PERFORMANCE_EVENTS[keyof typeof PERFORMANCE_EVENTS]['name']
  | typeof ENGAGEMENT_EVENTS[keyof typeof ENGAGEMENT_EVENTS]['name'];

/**
 * Helper function to create event tracking calls
 * Usage: trackEvent(TASK_EVENTS.TASK_CREATED, { task_id: '123', ... })
 */
export const trackEvent = (eventConfig: { name: string; properties: Record<string, string> }, properties: Record<string, any>) => {
  return {
    eventName: eventConfig.name,
    properties,
  };
};

/**
 * Validate event properties against the schema
 * This can be used in development to catch property mismatches
 */
export const validateEventProperties = (eventName: string, properties: Record<string, any>): boolean => {
  // Implementation would validate properties against the schema
  // For now, just return true - this can be enhanced later
  console.log(`Validating event: ${eventName}`, properties);
  return true;
};
