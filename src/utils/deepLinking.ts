/**
 * Deep Linking Utilities
 *
 * Provides utilities for handling deep links, URL parsing, and navigation.
 */

import { Linking } from 'react-native';

export interface DeepLinkParams {
  screen?: string;
  params?: Record<string, any>;
}

/**
 * Parse deep link URL
 *
 * @example
 * parseDeepLink('elaro://assignment/abc-123')
 * // Returns: { screen: 'TaskDetailModal', params: { taskId: 'abc-123', taskType: 'assignment' } }
 */
export function parseDeepLink(url: string): DeepLinkParams | null {
  try {
    // Remove scheme
    const urlWithoutScheme = url.replace(/^elaro:\/\//, '');

    // Handle home route
    if (urlWithoutScheme === 'home' || urlWithoutScheme === '') {
      return {
        screen: 'Main',
        params: {},
      };
    }

    // Parse path
    const [path, ...queryParts] = urlWithoutScheme.split('?');
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    // Parse query parameters
    const queryParams: Record<string, string> = {};
    if (queryParts.length > 0) {
      queryParts
        .join('?')
        .split('&')
        .forEach(param => {
          const [key, value] = param.split('=');
          if (key) {
            queryParams[decodeURIComponent(key)] = decodeURIComponent(
              value || '',
            );
          }
        });
    }

    // Map URL paths to screens
    const routeMap: Record<string, { screen: string; paramKey?: string }> = {
      assignment: { screen: 'TaskDetailModal', paramKey: 'taskId' },
      lecture: { screen: 'TaskDetailModal', paramKey: 'taskId' },
      'study-session': { screen: 'TaskDetailModal', paramKey: 'taskId' },
      task: { screen: 'TaskDetailModal', paramKey: 'taskId' },
      course: { screen: 'CourseDetail', paramKey: 'courseId' },
      courses: { screen: 'Courses', paramKey: undefined },
      calendar: { screen: 'Calendar', paramKey: undefined },
      profile: { screen: 'Profile', paramKey: undefined },
      settings: { screen: 'Settings', paramKey: undefined },
      'recycle-bin': { screen: 'RecycleBin', paramKey: undefined },
      paywall: { screen: 'PaywallScreen', paramKey: undefined },
    };

    const route = routeMap[segments[0]];
    if (!route) {
      console.warn(`Unknown deep link route: ${segments[0]}`);
      return null;
    }

    const params: Record<string, any> = { ...queryParams };

    // Add ID parameter if present
    if (segments.length > 1 && route.paramKey) {
      params[route.paramKey] = segments[1];
    }

    // Add taskType for task-related routes
    if (route.screen === 'TaskDetailModal') {
      if (segments[0] === 'assignment') {
        params.taskType = 'assignment';
      } else if (segments[0] === 'lecture') {
        params.taskType = 'lecture';
      } else if (segments[0] === 'study-session' || segments[0] === 'task') {
        params.taskType =
          segments[0] === 'study-session' ? 'study_session' : 'task';
      }
    }

    return {
      screen: route.screen,
      params,
    };
  } catch (error) {
    console.error('Failed to parse deep link:', error);
    return null;
  }
}

/**
 * Generate deep link URL
 *
 * @example
 * generateDeepLink('TaskDetailModal', { taskId: 'abc-123', taskType: 'assignment' })
 * // Returns: 'elaro://assignment/abc-123'
 */
export function generateDeepLink(
  screen: string,
  params?: Record<string, any>,
): string | null {
  try {
    // Map screens to URL paths
    const screenMap: Record<string, { path: string; idParam?: string }> = {
      TaskDetailModal: { path: 'task', idParam: 'taskId' },
      CourseDetail: { path: 'course', idParam: 'courseId' },
      Courses: { path: 'courses' },
      Calendar: { path: 'calendar' },
      Profile: { path: 'profile' },
      Settings: { path: 'settings' },
      RecycleBin: { path: 'recycle-bin' },
      PaywallScreen: { path: 'paywall' },
      Main: { path: 'home' },
    };

    const mapping = screenMap[screen];
    if (!mapping) {
      console.warn(`No deep link mapping for screen: ${screen}`);
      return null;
    }

    let url = `elaro://${mapping.path}`;

    // Add ID if present
    if (mapping.idParam && params?.[mapping.idParam]) {
      url += `/${params[mapping.idParam]}`;
    }

    // Add query parameters
    if (params) {
      const queryParams: string[] = [];
      Object.entries(params).forEach(([key, value]) => {
        // Skip idParam (already in path) and taskType (determined by path)
        if (
          key !== mapping.idParam &&
          key !== 'taskType' &&
          value !== undefined
        ) {
          queryParams.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
          );
        }
      });
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
    }

    return url;
  } catch (error) {
    console.error('Failed to generate deep link:', error);
    return null;
  }
}

/**
 * Check if URL is a deep link
 */
export function isDeepLink(url: string): boolean {
  return url.startsWith('elaro://');
}

/**
 * Get initial URL (if app was opened via deep link)
 */
export async function getInitialURL(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();
    return url;
  } catch (error) {
    console.error('Failed to get initial URL:', error);
    return null;
  }
}

/**
 * Listen for deep links
 */
export function addDeepLinkListener(
  callback: (url: string) => void,
): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    if (isDeepLink(url)) {
      callback(url);
    }
  });

  return () => subscription.remove();
}
