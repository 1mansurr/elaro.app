import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Smart Preloading Hook
 * Preloads likely next screens based on user behavior and authentication state
 */
export const useSmartPreloading = () => {
  const { session, user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const preloadBundles = async () => {
      try {
        if (session && user) {
          // User is authenticated - preload main app bundles
          if (user.onboarding_completed) {
            // Preload dashboard bundle for completed users
            await import('@/navigation/bundles/DashboardBundle');
            console.log('📦 Preloaded DashboardBundle');
          } else {
            // Preload auth bundle for users who need onboarding
            await import('@/navigation/bundles/AuthBundle');
            console.log('📦 Preloaded AuthBundle');
          }

          // Preload courses bundle (commonly used)
          await import('@/navigation/bundles/CoursesBundle');
          console.log('📦 Preloaded CoursesBundle');
        } else {
          // Guest user - preload guest-specific bundles
          await import('@/navigation/bundles/DashboardBundle');
          console.log('📦 Preloaded DashboardBundle for guest');
        }
      } catch (error) {
        console.warn('Failed to preload bundles:', error);
      }
    };

    // Delay preloading slightly to not interfere with initial load
    const timeoutId = setTimeout(preloadBundles, 1000);

    return () => clearTimeout(timeoutId);
  }, [session, user, loading]);

  // Preload additional bundles based on user behavior
  const preloadCalendarBundle = async () => {
    try {
      await import('@/navigation/bundles/CalendarBundle');
      console.log('📦 Preloaded CalendarBundle');
    } catch (error) {
      console.warn('Failed to preload CalendarBundle:', error);
    }
  };

  return {
    preloadCalendarBundle,
  };
};
