/**
 * Navigation State Synchronization Service
 *
 * Manages synchronization between:
 * - React Navigation state
 * - AsyncStorage persistence
 * - Auth-aware routing
 * - Route validation and recovery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationState, PartialState } from '@react-navigation/native';
import { RootStackParamList } from '@/types/navigation';
import { AUTHENTICATED_ROUTES } from '@/navigation/utils/RouteGuards';

// Storage keys
const NAVIGATION_STATE_KEY = '@elaro_navigation_state_v1';
const NAVIGATION_VERSION_KEY = '@elaro_navigation_version';

// Current navigation version (increment on breaking changes)
const NAVIGATION_VERSION = 'v1';

// Valid route names (from RootStackParamList)
const VALID_ROUTES: Set<keyof RootStackParamList> = new Set([
  'Launch',
  'Auth',
  'Main',
  'OnboardingFlow',
  'Courses',
  'Drafts',
  'Templates',
  'CourseDetail',
  'Calendar',
  'RecycleBin',
  'Profile',
  'Settings',
  'DeleteAccountScreen',
  'DeviceManagement',
  'LoginHistory',
  'MFAEnrollmentScreen',
  'MFAVerificationScreen',
  'AddCourseFlow',
  'AddLectureFlow',
  'AddAssignmentFlow',
  'AddStudySessionFlow',
  'EditCourseModal',
  'TaskDetailModal',
  'InAppBrowserScreen',
  'AnalyticsAdmin',
  'PaywallScreen',
  'OddityWelcomeScreen',
  'StudyResult',
  'StudySessionReview',
]);

// Valid nested route names for each parent navigator
// These are routes that exist within nested navigators (e.g., MainTabNavigator)
const VALID_NESTED_ROUTES: Record<string, Set<string>> = {
  Main: new Set(['Home', 'Calendar', 'Account']), // MainTabNavigator routes
};

// Routes that should NOT be restored on app startup (modal flows)
// These are temporary screens that shouldn't persist across app restarts
const MODAL_FLOW_ROUTES: Set<keyof RootStackParamList> = new Set([
  'AddCourseFlow',
  'AddLectureFlow',
  'AddAssignmentFlow',
  'AddStudySessionFlow',
  'TaskDetailModal',
  'EditCourseModal',
  'InAppBrowserScreen',
  'PaywallScreen',
  'OddityWelcomeScreen',
  'StudyResult',
  'StudySessionReview',
  'ForgotPassword',
  'ResetPassword',
  'Auth', // Auth screen shouldn't be restored either
]);

interface NavigationSnapshot {
  state: NavigationState;
  version: string;
  savedAt: number;
  userId?: string; // Track which user this state belongs to
}

/**
 * NavigationSyncService - Centralized navigation state synchronization
 */
class NavigationSyncService {
  private currentState: NavigationState | null = null;
  private listeners: Set<(state: NavigationState | null) => void> = new Set();
  private currentUserId: string | undefined = undefined;

  /**
   * Set current user ID (called when user changes)
   */
  setUserId(userId: string | undefined): void {
    this.currentUserId = userId;
  }

  /**
   * Save navigation state to AsyncStorage
   */
  async saveState(
    state: NavigationState | undefined,
    userId?: string,
  ): Promise<void> {
    if (!state) return;

    try {
      this.currentState = state;

      // Use provided userId or current tracked userId
      const userIdToSave = userId || this.currentUserId;

      const snapshot: NavigationSnapshot = {
        state,
        version: NAVIGATION_VERSION,
        savedAt: Date.now(),
        userId: userIdToSave,
      };

      await AsyncStorage.setItem(
        NAVIGATION_STATE_KEY,
        JSON.stringify(snapshot),
      );
      await AsyncStorage.setItem(NAVIGATION_VERSION_KEY, NAVIGATION_VERSION);

      console.log('💾 NavigationSync: State saved', {
        routeCount: state.routes?.length || 0,
        currentRoute: this.getCurrentRouteName(state),
        userId: userIdToSave ? 'present' : 'none',
      });

      // Notify listeners
      this.notifyListeners(state);
    } catch (error) {
      console.error('❌ NavigationSync: Failed to save state:', error);
      // Don't throw - navigation should continue even if save fails
    }
  }

  /**
   * Load navigation state from AsyncStorage
   */
  async loadState(userId?: string): Promise<NavigationState | null> {
    try {
      const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
      const savedVersion = await AsyncStorage.getItem(NAVIGATION_VERSION_KEY);

      if (!savedStateString) {
        console.log('ℹ️ NavigationSync: No saved state found');
        return null;
      }

      // Check version compatibility
      if (savedVersion !== NAVIGATION_VERSION) {
        console.log(
          `⚠️ NavigationSync: Version mismatch (saved: ${savedVersion}, current: ${NAVIGATION_VERSION}). Clearing old state.`,
        );
        await this.clearState();
        return null;
      }

      const snapshot: NavigationSnapshot = JSON.parse(savedStateString);

      // Validate state structure
      if (!snapshot.state || !snapshot.state.routes) {
        console.warn('⚠️ NavigationSync: Invalid state structure. Clearing.');
        await this.clearState();
        return null;
      }

      // Check if state belongs to different user (auth change)
      if (userId && snapshot.userId && snapshot.userId !== userId) {
        console.log(
          '👤 NavigationSync: State belongs to different user. Clearing.',
        );
        await this.clearState();
        return null;
      }

      // Validate routes
      const validatedState = this.validateState(snapshot.state);
      if (!validatedState) {
        console.warn(
          '⚠️ NavigationSync: Invalid routes detected. Clearing state.',
        );
        await this.clearState();
        return null;
      }

      // Check if state is too old (more than 7 days - might be stale)
      const stateAge = Date.now() - snapshot.savedAt;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (stateAge > maxAge) {
        console.log('⏰ NavigationSync: State is too old. Clearing.');
        await this.clearState();
        return null;
      }

      console.log('✅ NavigationSync: State loaded successfully', {
        routeCount: validatedState.routes?.length || 0,
        currentRoute: this.getCurrentRouteName(validatedState),
        age: Math.floor(stateAge / 1000 / 60), // minutes
      });

      this.currentState = validatedState;
      return validatedState;
    } catch (error) {
      console.error('❌ NavigationSync: Failed to load state:', error);
      // Clear potentially corrupted state
      await this.clearState();
      return null;
    }
  }

  /**
   * Validate navigation state structure and routes
   */
  private validateState(state: NavigationState): NavigationState | null {
    try {
      if (!state || !state.routes || !Array.isArray(state.routes)) {
        return null;
      }

      // Recursively validate routes
      const validateRoute = (
        route: PartialState<NavigationState>['routes'][number] | undefined,
        parentRouteName?: string,
      ): boolean => {
        if (!route || !route.name) {
          return false;
        }

        // If this is a nested route, check against parent's valid nested routes first
        if (parentRouteName && VALID_NESTED_ROUTES[parentRouteName]) {
          if (VALID_NESTED_ROUTES[parentRouteName].has(route.name)) {
            // Valid nested route, continue validation of its children
            if (
              route.state &&
              'routes' in route.state &&
              Array.isArray(route.state.routes)
            ) {
              return route.state.routes.every(nestedRoute =>
                validateRoute(nestedRoute, route.name),
              );
            }
            return true;
          }
          // Nested route not in parent's valid routes - invalid
          console.warn(
            `⚠️ NavigationSync: Invalid nested route "${route.name}" under parent "${parentRouteName}"`,
          );
          return false;
        }

        // Check if route name is valid top-level route
        if (!VALID_ROUTES.has(route.name as keyof RootStackParamList)) {
          console.warn(`⚠️ NavigationSync: Invalid route name: ${route.name}`);
          return false;
        }

        // Validate nested routes (for nested navigators)
        if (
          route.state &&
          'routes' in route.state &&
          Array.isArray(route.state.routes)
        ) {
          return route.state.routes.every(nestedRoute =>
            validateRoute(nestedRoute, route.name),
          );
        }

        return true;
      };

      const allRoutesValid = state.routes.every(route => validateRoute(route));
      if (!allRoutesValid) {
        console.warn(
          '⚠️ NavigationSync: Invalid routes detected. Clearing state.',
        );
        return null;
      }

      return state;
    } catch (error) {
      console.error('❌ NavigationSync: State validation error:', error);
      return null;
    }
  }

  /**
   * Get the current route name from navigation state
   */
  private getCurrentRouteName(state: NavigationState): string | null {
    try {
      if (!state.routes || state.routes.length === 0) {
        return null;
      }

      const currentRoute = state.routes[state.index || 0];
      if (!currentRoute) {
        return null;
      }

      // If this route has nested state, get the nested route name
      if (currentRoute.state) {
        return this.getCurrentRouteName(currentRoute.state as NavigationState);
      }

      return currentRoute.name || null;
    } catch (error) {
      console.error(
        '❌ NavigationSync: Error getting current route name:',
        error,
      );
      return null;
    }
  }

  /**
   * Clear navigation state
   */
  async clearState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
      await AsyncStorage.removeItem(NAVIGATION_VERSION_KEY);
      this.currentState = null;
      this.currentUserId = undefined;
      this.notifyListeners(null);
      console.log('🗑️ NavigationSync: State cleared');
    } catch (error) {
      console.error('❌ NavigationSync: Failed to clear state:', error);
    }
  }

  /**
   * Get safe initial state (auth-aware)
   * Returns null if user should be redirected based on auth state
   */
  async getSafeInitialState(
    isAuthenticated: boolean,
    isLoading: boolean,
    userId?: string,
  ): Promise<NavigationState | null> {
    // Don't restore state while auth is loading
    if (isLoading) {
      console.log(
        '⏳ NavigationSync: Auth loading, skipping state restoration',
      );
      return null;
    }

    // Load saved state
    const savedState = await this.loadState(userId);

    if (!savedState) {
      return null;
    }

    // Auth-aware routing:
    // If user is logged out but state contains authenticated routes, clear it
    const currentRoute = this.getCurrentRouteName(savedState);
    const authenticatedRoutes = AUTHENTICATED_ROUTES as readonly string[];

    if (
      !isAuthenticated &&
      currentRoute &&
      authenticatedRoutes.includes(currentRoute)
    ) {
      console.log(
        '🔒 NavigationSync: Logged out user trying to access authenticated route. Clearing state.',
      );
      await this.clearState();
      return null;
    }

    // Don't restore modal flows - reset to Main screen instead
    // Modal flows are temporary screens that shouldn't persist across app restarts
    if (currentRoute && MODAL_FLOW_ROUTES.has(currentRoute as keyof RootStackParamList)) {
      console.log(
        `🚫 NavigationSync: Modal flow "${currentRoute}" detected. Resetting to Main screen.`,
      );
      // Return null to let the app start fresh with default navigation
      return null;
    }

    return savedState;
  }

  /**
   * Get current state (from memory)
   */
  getCurrentState(): NavigationState | null {
    return this.currentState;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: NavigationState | null) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(state: NavigationState | null): void {
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('❌ NavigationSync: Listener error:', error);
      }
    });
  }

  /**
   * Get navigation state statistics (for debugging)
   */
  async getStats(): Promise<{
    hasState: boolean;
    version: string | null;
    savedAt: number | null;
    routeCount: number;
    currentRoute: string | null;
  }> {
    try {
      const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
      const savedVersion = await AsyncStorage.getItem(NAVIGATION_VERSION_KEY);

      if (!savedStateString) {
        return {
          hasState: false,
          version: null,
          savedAt: null,
          routeCount: 0,
          currentRoute: null,
        };
      }

      const snapshot: NavigationSnapshot = JSON.parse(savedStateString);
      const routeCount = snapshot.state?.routes?.length || 0;
      const currentRoute = snapshot.state
        ? this.getCurrentRouteName(snapshot.state)
        : null;

      return {
        hasState: true,
        version: savedVersion || null,
        savedAt: snapshot.savedAt,
        routeCount,
        currentRoute,
      };
    } catch (error) {
      console.error('❌ NavigationSync: Error getting stats:', error);
      return {
        hasState: false,
        version: null,
        savedAt: null,
        routeCount: 0,
        currentRoute: null,
      };
    }
  }
}

export const navigationSyncService = new NavigationSyncService();
