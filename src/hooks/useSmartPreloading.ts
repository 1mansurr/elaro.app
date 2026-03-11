import { useEffect } from 'react';

/**
 * Smart Preloading Hook
 * Preloads likely next screens based on user behavior
 */
export const useSmartPreloading = () => {
  useEffect(() => {
    const preloadBundles = async () => {
      try {
        // Preload main app bundles
        await import('@/navigation/bundles/DashboardBundle');
        console.log('📦 Preloaded DashboardBundle');

        // Preload courses bundle (commonly used)
        await import('@/navigation/bundles/CoursesBundle');
        console.log('📦 Preloaded CoursesBundle');
      } catch (error) {
        console.warn('Failed to preload bundles:', error);
      }
    };

    // Delay preloading slightly to not interfere with initial load
    const timeoutId = setTimeout(preloadBundles, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

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
