// Monetization constants
export const ODDITY_AMOUNT = 5; // GHS 5.00 per week
export const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
export const PAYSTACK_SECRET_KEY = process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY || '';
export const PAYSTACK_PLAN_CODE = process.env.EXPO_PUBLIC_PAYSTACK_PLAN_CODE || '';

// Subscription limits
export const SUBSCRIPTION_LIMITS = {
  FREE: {
    maxCourses: 3,
    maxTasksPerWeek: 14,
    maxRemindersPerWeek: 10,
  },
  ODDITY: {
    maxCourses: 9,
    maxTasksPerWeek: 30,
    maxRemindersPerWeek: 30,
  },
} as const;
