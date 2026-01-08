import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser, Factor } from '@supabase/supabase-js';
import { Alert, AppState } from 'react-native';
import {
  supabase,
  authService as supabaseAuthService,
} from '@/services/supabase';
import { authService } from '@/services/authService';
import { authSyncService } from '@/services/authSync';
import { navigationSyncService } from '@/services/navigationSync';
import { User } from '@/types';
import { getPendingTask } from '@/utils/taskPersistence';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import {
  isSessionExpired,
  clearLastActiveTimestamp,
  updateLastActiveTimestamp,
} from '@/utils/sessionTimeout';
import { cache } from '@/utils/cache';
// import { errorTrackingService } from '@/services/ErrorTrackingService';
import {
  checkAccountLockout,
  recordFailedAttempt,
  recordSuccessfulLogin,
  getLockoutMessage,
  resetFailedAttempts,
} from '@/utils/authLockout';
import { Platform } from 'react-native';
import { logAuth, logWarn, logError } from '@/utils/logger';
import { addBreadcrumb, captureEvent, captureError, startSpan, finishSpan } from '@/services/monitoring/sentry';
// import { useData } from './DataContext'; // Removed to fix circular dependency
// import { useGracePeriod } from '@/hooks/useGracePeriod'; // Removed to fix circular dependency - moved to GracePeriodChecker component

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends LoginCredentials {
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isInitializing: boolean; // True while app is initializing and we don't have a valid profile yet
  isGuest: boolean;
  signIn: (credentials: LoginCredentials) => Promise<{
    error: Error | null;
    requiresMFA?: boolean;
    factors?: Factor[];
  }>;
  signUp: (credentials: SignUpCredentials) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true); // Track if we're still initializing with a valid profile
  // Navigation is handled in AppNavigator, not here
  // const { fetchInitialData } = useData(); // Removed to fix circular dependency
  // Grace period check moved to GracePeriodChecker component to avoid circular dependency

  // Social providers removed; email-only auth

  // Track ongoing profile fetches to prevent duplicates
  const profileFetchPromises = new Map<string, Promise<User | null>>();

  /**
   * Create a safe minimal user from session data
   * This ensures all required fields are present to prevent crashes
   */
  const createMinimalUserFromSession = (
    sessionUser: SupabaseUser,
  ): User | null => {
    try {
      if (!sessionUser?.id) {
        console.error(
          '❌ [AuthContext] Cannot create minimal user: session user missing id',
        );
        return null;
      }

      const minimalUser: User = {
        id: sessionUser.id,
        email: sessionUser.email ?? '',
        name: sessionUser.user_metadata?.name || undefined,
        first_name: sessionUser.user_metadata?.first_name || undefined,
        last_name: sessionUser.user_metadata?.last_name || undefined,
        university: sessionUser.user_metadata?.university || undefined,
        program: sessionUser.user_metadata?.program || undefined,
        role: 'user',
        onboarding_completed: false, // Safe default - will show onboarding
        subscription_tier: null,
        subscription_status: null,
        subscription_expires_at: null,
        account_status: 'active',
        deleted_at: null,
        deletion_scheduled_at: null,
        suspension_end_date: null,
        created_at: sessionUser.created_at,
        updated_at: sessionUser.updated_at || sessionUser.created_at,
        user_metadata: sessionUser.user_metadata || {},
      };

      console.log('✅ [AuthContext] Created safe minimal user from session', {
        id: minimalUser.id,
        email: minimalUser.email,
      });
      return minimalUser;
    } catch (error) {
      console.error(
        '❌ [AuthContext] Failed to create minimal user from session:',
        error,
      );
      return null;
    }
  };

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    // If already fetching for this user, return the existing promise
    const existingFetch = profileFetchPromises.get(userId);
    if (existingFetch) {
      if (__DEV__) {
        console.log('⏳ Profile fetch already in progress, reusing promise');
      }
      return existingFetch;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        // Try to get from cache first for instant load
        const cacheKey = `user_profile:${userId}`;
        const cachedProfile = await cache.get<User>(cacheKey);

        if (cachedProfile) {
          console.log('📱 Using cached user profile');
          // Set cached data immediately for instant UI
          setUser(cachedProfile);

          // Still fetch fresh data in background to stay up-to-date
          supabaseAuthService
            .getUserProfile(userId)
            .then(async freshProfile => {
              if (
                freshProfile &&
                JSON.stringify(freshProfile) !== JSON.stringify(cachedProfile)
              ) {
                console.log('🔄 Updating user profile from server');
                setUser(freshProfile as User);
                await cache.setLong(cacheKey, freshProfile);
              }
              // Ensure isInitializing is false even if background fetch completes
              setIsInitializing(false);
            })
            .catch(err => {
              console.error('Background profile fetch failed:', err);
              // Keep using cached data
              // Ensure isInitializing is false even on error
              setIsInitializing(false);
            });

          return cachedProfile;
        }

        // No cache - fetch from server with timeout
        console.log('🌐 Fetching user profile from server');

        // Add timeout wrapper (8 seconds total - 5s for API + 3s buffer)
        const profileFetchPromise = supabaseAuthService.getUserProfile(userId);
        const timeoutPromise = new Promise<null>(resolve => {
          setTimeout(() => {
            console.warn(
              '⚠️ [AuthContext] User profile fetch timeout - proceeding with minimal user data',
            );
            resolve(null);
          }, 8000);
        });

        const userProfile = await Promise.race([
          profileFetchPromise,
          timeoutPromise,
        ]);

        if (!userProfile) {
          // If profile fetch failed/timed out, try to create minimal user from session
          console.warn(
            '⚠️ [AuthContext] User profile fetch failed, checking session for minimal user data',
          );

          try {
            const {
              data: { session: currentSession },
            } = await supabase.auth.getSession();
            if (currentSession?.user) {
              // Create safe minimal user from session data
              const minimalUser = createMinimalUserFromSession(
                currentSession.user,
              );
              if (minimalUser) {
                console.log(
                  '✅ [AuthContext] Using minimal user data from session (timeout fallback)',
                );
                // DO NOT cache minimal users - they have incorrect onboarding_completed: false
                // Only cache real profiles fetched from the server
                return minimalUser;
              }
            }
          } catch (sessionError) {
            console.error(
              '❌ [AuthContext] Failed to get session for minimal user:',
              sessionError,
            );
          }

          console.error(
            '❌ [AuthContext] Cannot create minimal user - session unavailable',
          );
          return null;
        }

        // Cache the profile (24 hours) for future use
        await cache.setLong(cacheKey, userProfile);

        // Check if account is in deleted status
        if (userProfile.account_status === 'deleted') {
          // Check if restoration is still possible
          if (userProfile.deletion_scheduled_at) {
            const deletionDate = new Date(userProfile.deletion_scheduled_at);
            const now = new Date();

            if (now <= deletionDate) {
              // Show restoration option to user
              Alert.alert(
                'Account Deleted',
                'Your account was deleted but can still be restored. Would you like to restore it?',
                [
                  {
                    text: 'No',
                    style: 'cancel',
                    onPress: () => authService.signOut(),
                  },
                  {
                    text: 'Restore',
                    onPress: async () => {
                      try {
                        await authService.restoreAccount();
                        // Refresh user profile after restoration
                        const restoredProfile =
                          await supabaseAuthService.getUserProfile(userId);
                        setUser(restoredProfile as User);
                      } catch (error) {
                        console.error('Error restoring account:', error);
                        Alert.alert(
                          'Restoration Failed',
                          'Could not restore your account. Please contact support.',
                        );
                        await authService.signOut();
                      }
                    },
                  },
                ],
              );
              return null; // Don't set user as logged in
            } else {
              // Restoration period expired
              Alert.alert(
                'Account Permanently Deleted',
                'Your account has been permanently deleted and cannot be restored.',
              );
              await authService.signOut();
              return null;
            }
          }
        }

        // Check if account is suspended
        if (userProfile.account_status === 'suspended') {
          // Check if suspension has expired
          if (userProfile.suspension_end_date) {
            const endDate = new Date(userProfile.suspension_end_date);
            const now = new Date();

            if (now > endDate) {
              // Suspension expired, auto-unsuspend
              try {
                // Note: This would typically be handled by a cron job, but we can handle it here as a fallback
                console.log(
                  'Suspension expired, but auto-unsuspend should be handled by cron job',
                );
              } catch (error) {
                console.error('Error auto-unsuspending account:', error);
              }
            }
          }

          // Account is still suspended
          Alert.alert(
            'Account Suspended',
            'Your account has been suspended. Please contact support for assistance.',
          );
          await authService.signOut();
          return null;
        }

        return userProfile as User;
      } catch (error) {
        console.error('AuthContext: Error fetching user profile:', error);
        // If user profile doesn't exist, wait a moment for database trigger to create it
        // User profile is automatically created by database trigger when auth user is created
        try {
          // Wait a bit for trigger to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          const newProfile = await supabaseAuthService.getUserProfile(userId);
          return newProfile as User;
        } catch (createError) {
          console.error(
            'AuthContext: Error fetching user profile after creation:',
            createError,
          );
        }
        return null;
      } finally {
        // Remove from map when done
        profileFetchPromises.delete(userId);
      }
    })();

    // Store the promise
    profileFetchPromises.set(userId, fetchPromise);
    return fetchPromise;
  };

  const refreshUser = async () => {
    if (session?.user) {
      // Clear cache to ensure fresh data (especially after onboarding completion)
      const cacheKey = `user_profile:${session.user.id}`;
      await cache.remove(cacheKey);

      const userProfile = await fetchUserProfile(session.user.id);
      if (userProfile) {
        setUser(userProfile);
        // Ensure isInitializing is false after refresh (we have a valid profile)
        setIsInitializing(false);
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      logAuth('Auth initialization started');
      addBreadcrumb({ message: 'Auth initialization started' });
      
      try {
        // FAST PATH: Use direct Supabase client getSession() - no API round-trip
        // This reads from local storage immediately (no network latency)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logError('Error getting initial session', { error: String(error) });
          captureError(error, { context: 'auth_get_session' });
          setSession(null);
          setUser(null);
          setLoading(false);
          setIsInitializing(false);
          return;
        }

        // Set session state immediately - don't wait for anything else
        setSession(session);
        logAuth('Session retrieved', { hasSession: !!session });

        // If session exists, load user profile with proper caching strategy
        if (session?.user) {
          const userId = session.user.id;
          const cacheKey = `user_profile:${userId}`;

          // STEP 1: Try to load from AsyncStorage cache first (instant load)
          try {
            const cachedProfile = await cache.get<User>(cacheKey);

            if (cachedProfile) {
              // SMART CACHING: Only use cached profile if it has onboarding_completed: true
              // If cached profile has onboarding_completed: false, it might be stale or a minimal user
              // In that case, ignore it and fetch fresh from server
              if (cachedProfile.onboarding_completed === true) {
                logAuth('Using valid cached user profile', { onboardingCompleted: true });
                addBreadcrumb({ message: 'Using cached user profile' });
                // Set cached profile immediately - this prevents loading screen and shows correct UI
                // STEP 1 FIX: Eliminated background fetch to remove race condition
                // Using cached user directly, set isInitializing to false only when we have definitive state
                setUser(cachedProfile);
                setLoading(false);
                setIsInitializing(false); // We have a valid cached profile - definitive user state

                return; // Exit early - we have valid cached profile
              } else {
                // Cached profile has onboarding_completed: false - might be stale or minimal user
                // Ignore it and fetch fresh from server
                console.log(
                  '⚠️ [AuthContext] Cached profile has onboarding_completed: false, ignoring and fetching fresh',
                );
                // Clear the bad cache entry
                await cache.remove(cacheKey);
              }
            }
          } catch (cacheError) {
            if (__DEV__) {
              console.warn(
                '⚠️ [AuthContext] Error reading cache (non-critical):',
                cacheError,
              );
            }
            // Continue to fetch from server
          }

          // STEP 3: No valid cached profile exists - show loading and fetch from server
          logAuth('Fetching user profile from server');
          addBreadcrumb({ message: 'Fetching user profile from server' });
          // Keep loading=true and isInitializing=true while we fetch (shows loading indicator)

          try {
            // CRITICAL: Add timeout to prevent infinite loading on slow networks
            const profileFetchWithTimeout = Promise.race([
              fetchUserProfile(userId),
              new Promise<null>(resolve => {
                setTimeout(() => {
                  logWarn('Profile fetch timeout - proceeding unauthenticated');
                  captureEvent('startup_timeout_auth_profile_fetch', { timeout: 5000 });
                  resolve(null);
                }, 5000); // 5 second timeout
              }),
            ]);

            const userProfile = await profileFetchWithTimeout;

            if (userProfile) {
              // Profile fetched successfully - set it and cache it
              setUser(userProfile);
              setLoading(false);
              setIsInitializing(false); // We have a valid profile from server
              logAuth('User profile loaded from server');
              addBreadcrumb({ message: 'User profile loaded from server' });
            } else {
              // Profile fetch failed - create safe minimal user as last resort
              logWarn('Profile fetch returned null, creating safe minimal user');
              const minimalUserFromSession = createMinimalUserFromSession(
                session.user,
              );
              if (minimalUserFromSession) {
                setUser(minimalUserFromSession);
                setLoading(false);
                setIsInitializing(false); // Even minimal user is better than nothing
                console.log(
                  '✅ [AuthContext] Minimal user set - app will show onboarding',
                );
              } else {
                console.error(
                  '❌ [AuthContext] Failed to create minimal user - cannot proceed',
                );
                setLoading(false);
                // FIX: Set isInitializing to false after timeout to prevent white screen
                // The app can still function with null user - AuthenticatedNavigator will handle it
                setIsInitializing(false);
                console.warn(
                  '⚠️ [AuthContext] Setting isInitializing to false to prevent white screen - app will handle null user',
                );
              }
            }
          } catch (fetchError) {
            logError('Error fetching user profile', { error: String(fetchError) });
            captureError(fetchError, { context: 'auth_profile_fetch' });
            // Create safe minimal user as fallback
            const minimalUserFromSession = createMinimalUserFromSession(
              session.user,
            );
            if (minimalUserFromSession) {
              setUser(minimalUserFromSession);
              setLoading(false);
              setIsInitializing(false); // Even minimal user is better than nothing
              console.log(
                '✅ [AuthContext] Minimal user set after error - app will show onboarding',
              );
            } else {
              console.error(
                '❌ [AuthContext] Failed to create minimal user after error - cannot proceed',
              );
              setLoading(false);
              // FIX: Set isInitializing to false after error to prevent white screen
              setIsInitializing(false);
              console.warn(
                '⚠️ [AuthContext] Setting isInitializing to false after error - app will handle null user',
              );
            }
          }
        } else {
          logAuth('No session - user set to null');
          setUser(null);
          setLoading(false);
          setIsInitializing(false);
        }
        logAuth('Auth initialization completed');
        addBreadcrumb({ message: 'Auth initialization completed' });
      } catch (error) {
        logError('Error initializing auth', { error: String(error) });
        captureError(error, { context: 'auth_initialization' });
        // Don't block app - continue with no session
        setSession(null);
        setUser(null);
        setLoading(false);
        setIsInitializing(false);

        // Clear any saved navigation state that might reference authenticated routes
        // This prevents navigation errors when auth fails/times out
        navigationSyncService.clearState().catch(err => {
          console.warn('⚠️ Failed to clear navigation state:', err);
        });
      }
    };

    initializeAuth();

    // Set up auth state change listener (single source of truth)
    // This handles session changes from Supabase automatically
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (__DEV__) {
        console.log(`🔄 Auth event: ${event}`);
      }

      // Update session state (single update point)
      setSession(session);

      // IMPORTANT: Set loading to false when we receive auth state change
      // This ensures AppNavigator doesn't show white screen during sign-out
      // and allows AuthNavigator to render immediately when session becomes null
      setLoading(false);

      // Sync to authSyncService for local cache (non-blocking)
      if (session) {
        authSyncService.saveAuthState(session).catch(err => {
          if (__DEV__) {
            console.warn('⚠️ Failed to save auth state (non-blocking):', err);
          }
        });
      } else {
        authSyncService.clearAuthState().catch(() => {});
      }

      // STEP 1 FIX: Unify auth initialization - disable fetchUserProfile for INITIAL_SESSION
      // Only initializeAuth should handle the app's first load
      // This prevents the primary race condition between initializeAuth and onAuthStateChange
      if (event === 'INITIAL_SESSION') {
        // Don't fetch profile here - initializeAuth is handling it
        // Just update session state (already done above)
        if (!session) {
          setUser(null);
          setIsInitializing(false);
        }
        // If session exists, initializeAuth will handle profile fetch
        return;
      }

      // For other events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED), fetch profile
      if (session?.user) {
        fetchUserProfile(session.user.id)
          .then(userProfile => {
            if (userProfile) {
              setUser(userProfile);
              // Only set isInitializing to false if we have a definitive user state
              setIsInitializing(false);
            } else {
              // Profile fetch returned null (timeout or error)
              // FIX: Set isInitializing to false to prevent white screen
              // Try to create minimal user as fallback
              const minimalUser = createMinimalUserFromSession(session.user);
              if (minimalUser) {
                setUser(minimalUser);
                setIsInitializing(false);
                console.warn(
                  '⚠️ [AuthContext] Using minimal user after profile fetch failed in onAuthStateChange',
                );
              } else {
                setIsInitializing(false); // Still set to false to prevent white screen
                console.warn(
                  '⚠️ [AuthContext] Profile fetch failed, setting isInitializing to false to prevent white screen',
                );
              }
            }
          })
          .catch(() => {
            // FIX: Set isInitializing to false even on error to prevent white screen
            // Try to create minimal user as fallback
            const minimalUser = createMinimalUserFromSession(session.user);
            if (minimalUser) {
              setUser(minimalUser);
              setIsInitializing(false);
              console.warn(
                '⚠️ [AuthContext] Using minimal user after profile fetch error in onAuthStateChange',
              );
            } else {
              setIsInitializing(false); // Still set to false to prevent white screen
              console.warn(
                '⚠️ [AuthContext] Profile fetch error, setting isInitializing to false to prevent white screen',
              );
            }
          });
      } else {
        setUser(null);
        setIsInitializing(false);
      }
    });

    // Safety timeout: Force isInitializing to false after 5 seconds maximum
    // This prevents infinite white screen if something goes wrong during initialization
    // Reduced from 10s to 5s for better UX on physical devices with slower networks
    const safetyTimeout = setTimeout(() => {
      if (isInitializing) {
        console.warn(
          '⚠️ [AuthContext] Safety timeout: Forcing isInitializing to false after 5s to prevent white screen',
        );
        setIsInitializing(false);
        setLoading(false);
      }
    }, 5000); // 5 second maximum (reduced from 10s for better UX)

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Handle pending tasks and analytics after user profile is fetched
  useEffect(() => {
    if (!session?.user || !user) return;

    const handleUserProfileReady = async () => {
      // Complete any pending task after authentication
      if (user && session.user.id) {
        try {
          // Fire-and-forget: complete pending task in background
          const { getPendingTask, clearPendingTask } =
            await import('@/utils/taskPersistence');
          const { api } = await import('@/services/api');

          const pending = await getPendingTask();
          if (pending && pending.taskData) {
            const userId = session.user.id;
            const isOnline = true; // Server writes only happen when online

            try {
              let taskCreated = false;
              let taskTypeName = '';

              if (pending.taskType === 'assignment') {
                taskTypeName = 'assignment';
                // Use type assertion since the saved data structure doesn't match the TaskData type
                const taskData = pending.taskData as any;
                const {
                  course,
                  title,
                  description,
                  dueDate,
                  submissionMethod,
                  submissionLink,
                  reminders,
                } = taskData || {};
                if (course?.id && dueDate && title) {
                  await api.mutations.assignments.create(
                    {
                      course_id: course.id,
                      title: String(title).trim(),
                      description: String(description || '').trim(),
                      submission_method: submissionMethod || undefined,
                      submission_link:
                        submissionMethod === 'Online'
                          ? String(submissionLink || '').trim()
                          : undefined,
                      due_date: new Date(dueDate).toISOString(),
                      reminders: reminders || [120],
                    },
                    isOnline,
                    userId,
                  );
                  await clearPendingTask();
                  taskCreated = true;
                  console.log('✅ Pending assignment created after auth');
                } else {
                  console.warn(
                    '⚠️ Pending assignment missing required fields:',
                    {
                      hasCourse: !!course?.id,
                      hasDueDate: !!dueDate,
                      hasTitle: !!title,
                    },
                  );
                }
              } else if (pending.taskType === 'lecture') {
                taskTypeName = 'lecture';
                // Use type assertion since the saved data structure doesn't match the TaskData type
                const taskData = pending.taskData as any;
                const {
                  course,
                  title,
                  startTime,
                  endTime,
                  recurrence,
                  reminders,
                } = taskData || {};
                if (course?.id && startTime && endTime && title) {
                  await api.mutations.lectures.create(
                    {
                      course_id: course.id,
                      lecture_name: String(title).trim(),
                      description: course?.courseName
                        ? `A lecture for the course: ${course.courseName}.`
                        : '',
                      start_time: new Date(startTime).toISOString(),
                      end_time: new Date(endTime).toISOString(),
                      is_recurring: recurrence && recurrence !== 'none',
                      recurring_pattern: recurrence || 'none',
                      reminders: reminders || [30],
                    },
                    isOnline,
                    userId,
                  );
                  await clearPendingTask();
                  taskCreated = true;
                  console.log('✅ Pending lecture created after auth');
                } else {
                  console.warn('⚠️ Pending lecture missing required fields:', {
                    hasCourse: !!course?.id,
                    hasStartTime: !!startTime,
                    hasEndTime: !!endTime,
                    hasTitle: !!title,
                  });
                }
              } else if (pending.taskType === 'study_session') {
                taskTypeName = 'study session';
                // Use type assertion since the saved data structure doesn't match the TaskData type
                const taskData = pending.taskData as any;
                const {
                  course,
                  topic,
                  description,
                  sessionDate,
                  hasSpacedRepetition,
                  reminders,
                } = taskData || {};
                if (course?.id && sessionDate && topic) {
                  await api.mutations.studySessions.create(
                    {
                      course_id: course.id,
                      topic: String(topic).trim(),
                      notes: String(description || '').trim(),
                      session_date: new Date(sessionDate).toISOString(),
                      has_spaced_repetition: !!hasSpacedRepetition,
                      reminders: reminders || [15],
                    },
                    isOnline,
                    userId,
                  );
                  await clearPendingTask();
                  taskCreated = true;
                  console.log('✅ Pending study session created after auth');
                } else {
                  console.warn(
                    '⚠️ Pending study session missing required fields:',
                    {
                      hasCourse: !!course?.id,
                      hasSessionDate: !!sessionDate,
                      hasTopic: !!topic,
                    },
                  );
                }
              }

              if (!taskCreated && pending.taskType) {
                // Task data was incomplete - clear it to prevent retry loops
                console.warn(
                  `⚠️ Pending ${pending.taskType} had incomplete data, clearing it`,
                );
                await clearPendingTask();
              }
            } catch (createError) {
              // Don't block auth flow if pending task creation fails
              // Log error with more context for debugging
              console.error(
                `❌ Failed to create pending ${pending.taskType} after auth:`,
                createError,
              );
              // Note: We keep the pending task so user can try again manually
              // This is better than losing their data
            }
          }
        } catch (importError) {
          // Silently ignore import errors - pending task completion is optional
          console.log('Pending task completion skipped:', importError);
        }
      }

      // Identify user in Mixpanel and set user properties
      if (user) {
        mixpanelService.identify(user.id);
        mixpanelService.setUserProperties({
          subscription_tier: user.subscription_tier,
          onboarding_completed: user.onboarding_completed,
          created_at: user.created_at,
          university: user.university,
          program: user.program,
        });

        // Track login event
        mixpanelService.track(AnalyticsEvents.USER_LOGGED_IN, {
          subscription_tier: user.subscription_tier,
          onboarding_completed: user.onboarding_completed,
          login_method: 'email',
        });
      }
    };

    handleUserProfileReady();
  }, [session?.user?.id, user?.id]);

  // Track logout when user becomes null
  useEffect(() => {
    if (!session && user) {
      // User just logged out
      mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
        logout_reason: 'manual',
      });
    }
  }, [session, user]);

  // Check for session timeout on app load
  useEffect(() => {
    const checkSessionTimeout = async () => {
      try {
        const expired = await isSessionExpired();

        if (expired && session) {
          console.log('⏰ Session expired due to inactivity. Logging out...');

          // Track the session timeout event
          mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
            logout_reason: 'session_timeout',
            timeout_days: 30,
          });

          // Sign out the user
          await signOut();

          // Clear the last active timestamp
          await clearLastActiveTimestamp();

          // Show alert to user
          Alert.alert(
            'Session Expired',
            'Your session has expired due to inactivity. Please log in again.',
            [{ text: 'OK' }],
          );
        }
      } catch (error) {
        console.error('❌ Error checking session timeout:', error);
      }
    };

    // Only check if we have a session
    if (session) {
      checkSessionTimeout();
    }
  }, [session]);

  // Validate session on app resume (no custom inactivity timeout)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        try {
          const s = await authService.getSession();
          setSession(s || null);
          if (s?.user) {
            const userProfile = await fetchUserProfile(s.user.id);
            setUser(userProfile);
          } else {
            setUser(null);
          }
        } catch (e) {
          // Ignore errors; AppNavigator will handle based on context state
        }
      }
    });
    return () => sub.remove();
  }, []);

  const signIn = async (credentials: LoginCredentials) => {
    try {
      // Check if account is locked
      const lockoutStatus = await checkAccountLockout(credentials.email);
      if (lockoutStatus.isLocked && lockoutStatus.minutesRemaining) {
        const lockoutMessage = getLockoutMessage(
          lockoutStatus.minutesRemaining,
        );
        Alert.alert('Account Locked', lockoutMessage);
        return { error: new Error(lockoutMessage) };
      }

      // Add timeout wrapper for login to prevent indefinite hanging
      const loginTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 15000); // 15 second timeout
      });

      const loginPromise = authService.login(credentials);
      const result = await Promise.race([loginPromise, loginTimeoutPromise]);

      // Log the result to debug why session might be missing
      if (__DEV__) {
        console.log('🔍 [AuthContext] Login result:', {
          hasUser: !!result?.user,
          hasSession: !!result?.session,
          userId: result?.user?.id,
          sessionAccessToken: result?.session?.access_token
            ? result.session.access_token.substring(0, 20) + '...'
            : 'none',
        });
      }

      // Clear any saved navigation state that might reference 'Main' before navigator switches
      // This prevents navigation errors when AppNavigator switches to AuthenticatedNavigator
      navigationSyncService.clearState().catch(() => {});

      // Set the initial last active timestamp on successful login (non-blocking)
      updateLastActiveTimestamp().catch(() => {});

      // Record successful login with device info (non-blocking to prevent stalls)
      if (result?.user?.id) {
        Promise.all([
          recordSuccessfulLogin(result.user.id, 'email', {
            platform: Platform.OS,
            version: Platform.Version?.toString(),
          }),
          resetFailedAttempts(credentials.email),
        ]).catch(err => {
          console.warn('⚠️ Failed to record login metrics:', err);
        });
      }

      // Check if MFA is required (with timeout to prevent hanging)
      try {
        const mfaTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('MFA check timeout')), 5000); // 5 second timeout
        });

        const aalPromise = authService.mfa.getAuthenticatorAssuranceLevel();
        const aal = await Promise.race([aalPromise, mfaTimeoutPromise]);

        if (aal.currentLevel === 'aal2') {
          const mfaStatusPromise = authService.mfa.getStatus();
          const mfaStatus = await Promise.race([
            mfaStatusPromise,
            mfaTimeoutPromise,
          ]);
          return {
            error: null,
            requiresMFA: true,
            factors: mfaStatus.factors,
          };
        }
      } catch (mfaError) {
        // MFA might not be enabled or timed out - continue without MFA
        console.log('MFA check failed or timed out:', mfaError);
      }

      // Set session from login result FIRST (most reliable source)
      // This ensures AppNavigator immediately detects the session change
      if (result?.session) {
        console.log('✅ [AuthContext] Setting session from login result');
        setSession(result.session);

        // Save auth state (non-blocking)
        authSyncService.saveAuthState(result.session).catch(err => {
          console.warn('⚠️ Failed to save auth state (non-blocking):', err);
        });

        // Fetch user profile (non-blocking)
        if (result.user) {
          fetchUserProfile(result.user.id)
            .then(userProfile => {
              if (userProfile) {
                setUser(userProfile);
                setIsInitializing(false); // Profile loaded after sign in
              }
            })
            .catch(err => {
              console.warn(
                '⚠️ Failed to fetch user profile (non-blocking):',
                err,
              );
            });
        }

        // REMOVED: Don't call getSession() after login - it was causing duplicate setSession()
        // The session is already set by authService.login() via setSession()
        // Calling getSession() here would consume the refresh token again
        // The session from login result is already valid and persisted
      } else {
        // No session in login result - try to get it from Supabase client
        // Wait a moment for setSession to complete (if it was called in authService.login)
        console.warn(
          '⚠️ No session in login result, waiting briefly then fetching from Supabase client',
        );

        // Give setSession time to complete (if it was called)
        await new Promise(resolve => setTimeout(resolve, 500));

        const sessionTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000);
        });

        try {
          // Try getting session from Supabase client directly first (faster)
          const {
            data: { session: directSession },
          } = await supabase.auth.getSession();

          if (directSession) {
            console.log(
              '✅ [AuthContext] Setting session from Supabase client (direct)',
            );
            setSession(directSession);

            // Save auth state (non-blocking)
            authSyncService.saveAuthState(directSession).catch(err => {
              console.warn('⚠️ Failed to save auth state (non-blocking):', err);
            });

            // Fetch user profile (non-blocking)
            if (directSession.user) {
              fetchUserProfile(directSession.user.id)
                .then(userProfile => {
                  if (userProfile) setUser(userProfile);
                })
                .catch(err => {
                  console.warn(
                    '⚠️ Failed to fetch user profile (non-blocking):',
                    err,
                  );
                });
            }
          } else {
            // Try via authService.getSession as fallback
            const sessionPromise = authService.getSession();
            const currentSession = await Promise.race([
              sessionPromise,
              sessionTimeoutPromise,
            ]);

            if (currentSession) {
              console.log(
                '✅ [AuthContext] Setting session from Supabase client (via API)',
              );
              setSession(currentSession);

              // Save auth state (non-blocking)
              authSyncService.saveAuthState(currentSession).catch(err => {
                console.warn(
                  '⚠️ Failed to save auth state (non-blocking):',
                  err,
                );
              });

              // Fetch user profile (non-blocking)
              if (currentSession.user) {
                fetchUserProfile(currentSession.user.id)
                  .then(userProfile => {
                    if (userProfile) setUser(userProfile);
                  })
                  .catch(err => {
                    console.warn(
                      '⚠️ Failed to fetch user profile (non-blocking):',
                      err,
                    );
                  });
              }
            } else {
              // CRITICAL: No session found after login - this is an error
              console.error(
                '❌ [AuthContext] No session available after login - login failed',
                {
                  hasUser: !!result?.user,
                  userId: result?.user?.id,
                },
              );
              return {
                error: new Error(
                  'Login succeeded but no session was created. Please try again.',
                ),
              };
            }
          }
        } catch (sessionError) {
          // CRITICAL: Failed to get session after login - return error
          console.error(
            '❌ [AuthContext] Failed to get session after login:',
            sessionError,
            {
              hasUser: !!result?.user,
              userId: result?.user?.id,
            },
          );
          return {
            error: new Error(
              'Login succeeded but session could not be retrieved. Please try again.',
            ),
          };
        }
      }

      return { error: null };
    } catch (error: unknown) {
      // Log error for debugging
      console.error('Sign in error:', error);

      const err = error as { message?: string; code?: string };
      // Record failed login attempt
      if (credentials.email && err?.message) {
        await recordFailedAttempt(credentials.email, err.message);
      }

      // Check if this is an MFA-related error
      if (err?.message?.includes('MFA') || err?.message?.includes('aal2')) {
        try {
          const mfaStatus = await authService.mfa.getStatus();
          return {
            error: null,
            requiresMFA: true,
            factors: mfaStatus.factors,
          };
        } catch (mfaError) {
          // If we can't get MFA status, return the original error
          return { error: err as Error };
        }
      }

      return { error: err as Error };
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      const signUpResponse = await authService.signUp(credentials);

      // Check if signup returned a session (auto-confirm enabled)
      // If session exists, update auth state immediately
      if (signUpResponse?.session) {
        console.log('✅ Signup returned session immediately');
        // Use authSyncService to properly sync and notify all listeners
        await authSyncService.saveAuthState(signUpResponse.session);
        setSession(signUpResponse.session);
        if (signUpResponse.session.user) {
          const userProfile = await fetchUserProfile(
            signUpResponse.session.user.id,
          );
          if (userProfile) {
            setUser(userProfile);
            setIsInitializing(false); // Profile loaded after sign up
          }
        }
      } else {
        // No session in response - immediately sign in to create a session
        // This is more reliable than waiting for async session creation
        // Since email confirmation is disabled, sign in should work immediately
        console.log(
          '⏳ No session in signup response, signing in to create session...',
        );
        try {
          const signInResponse = await authService.login({
            email: credentials.email,
            password: credentials.password,
          });

          if (signInResponse?.session) {
            console.log('✅ Session created via sign in');
            await authSyncService.saveAuthState(signInResponse.session);
            setSession(signInResponse.session);
            if (signInResponse.session.user) {
              const userProfile = await fetchUserProfile(
                signInResponse.session.user.id,
              );
              setUser(userProfile);
            }
          } else {
            console.log('⚠️ Sign in did not return a session');
          }
        } catch (signInError) {
          console.error('❌ Error signing in after signup:', signInError);
          // If sign in fails, try refreshing session as fallback
          setTimeout(async () => {
            try {
              const session = await authSyncService.refreshSession();
              if (session) {
                console.log('✅ Session found after refresh fallback');
                setSession(session);
                if (session.user) {
                  const userProfile = await fetchUserProfile(session.user.id);
                  setUser(userProfile);
                }
              }
            } catch (refreshError) {
              console.error('❌ Error in refresh fallback:', refreshError);
            }
          }, 1000);
        }
      }

      // Track sign up event
      mixpanelService.track(AnalyticsEvents.USER_SIGNED_UP, {
        signup_method: 'email',
        has_first_name: !!credentials.firstName,
        has_last_name: !!credentials.lastName,
      });

      return { error: null };
    } catch (error) {
      console.error('❌ Sign up error:', error);

      // Track failed sign up
      mixpanelService.track(AnalyticsEvents.ERROR_OCCURRED, {
        error_type: 'signup_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };

  const signOut = async () => {
    try {
      // Track logout event before signing out
      mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
        logout_reason: 'manual',
      });

      // Clear all cached data on logout
      await cache.clearAll();

      // Clear the last active timestamp
      await clearLastActiveTimestamp();

      // Clear auth sync state
      await authSyncService.clearAuthState();

      await authService.signOut();
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  // Removed Google and Apple sign-in methods

  const value = {
    session,
    user,
    loading,
    isInitializing,
    isGuest: !session,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
