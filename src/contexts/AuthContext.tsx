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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  // Navigation is handled in AppNavigator, not here
  // const { fetchInitialData } = useData(); // Removed to fix circular dependency
  // Grace period check moved to GracePeriodChecker component to avoid circular dependency

  // Social providers removed; email-only auth

  // Track ongoing profile fetches to prevent duplicates
  const profileFetchPromises = new Map<string, Promise<User | null>>();

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
            })
            .catch(err => {
              console.error('Background profile fetch failed:', err);
              // Keep using cached data
            });

          return cachedProfile;
        }

        // No cache - fetch from server
        console.log('🌐 Fetching user profile from server');
        const userProfile = await supabaseAuthService.getUserProfile(userId);

        if (!userProfile) {
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
      await cache.delete(cacheKey);

      const userProfile = await fetchUserProfile(session.user.id);
      setUser(userProfile);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Add timeout wrapper to prevent indefinite hanging
        const timeoutPromise = new Promise<Session | null>((_, reject) => {
          setTimeout(
            () => reject(new Error('Auth initialization timeout')),
            10000,
          ); // 10 second timeout
        });

        // Initialize auth sync service (loads session from Supabase and syncs to local cache)
        const initPromise = authSyncService.initialize();
        const initialSession = await Promise.race([
          initPromise,
          timeoutPromise,
        ]);

        // Set initial session immediately
        setSession(initialSession);

        if (initialSession?.user) {
          // Fetch user profile with timeout - don't block app if it hangs
          const profileTimeoutPromise = new Promise<User | null>(
            (_, reject) => {
              setTimeout(
                () => reject(new Error('User profile fetch timeout')),
                8000,
              ); // 8 second timeout
            },
          );

          try {
            const profilePromise = fetchUserProfile(initialSession.user.id);
            const userProfile = await Promise.race([
              profilePromise,
              profileTimeoutPromise,
            ]);
            setUser(userProfile);

            // Force a background refresh after initial load to ensure data is up-to-date
            // This happens after the UI is already showing cached data, so it's non-blocking
            setTimeout(async () => {
              try {
                const freshProfile = await supabaseAuthService.getUserProfile(
                  initialSession.user.id,
                );
                if (
                  freshProfile &&
                  JSON.stringify(freshProfile) !== JSON.stringify(userProfile)
                ) {
                  console.log(
                    '🔄 Updating user profile from server (background refresh)',
                  );
                  setUser(freshProfile as User);
                  const cacheKey = `user_profile:${initialSession.user.id}`;
                  await cache.setLong(cacheKey, freshProfile);
                }
              } catch (error) {
                // Silently fail - we already have cached data
                if (__DEV__) {
                  console.warn('Background profile refresh failed:', error);
                }
              }
            }, 2000); // Wait 2 seconds after initial load
          } catch (profileError) {
            if (__DEV__) {
              console.warn(
                '⚠️ User profile fetch timed out, using cached data if available:',
                profileError instanceof Error
                  ? profileError.message
                  : 'Unknown error',
              );
            }
            // Continue without user profile - it can be fetched later
            setUser(null);
            // Try to fetch in background (non-blocking)
            fetchUserProfile(initialSession.user.id)
              .then(profile => {
                if (profile) {
                  console.log('✅ User profile fetched in background');
                  setUser(profile);
                }
              })
              .catch(err => {
                if (__DEV__) {
                  console.error('Background profile fetch failed:', err);
                }
              });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error);
        // Don't block app - continue with no session
        setSession(null);
        setUser(null);

        // Clear any saved navigation state that might reference authenticated routes
        // This prevents navigation errors when auth fails/times out
        navigationSyncService.clearState().catch(err => {
          console.warn('⚠️ Failed to clear navigation state:', err);
        });
      } finally {
        // Always set loading to false, even on error or timeout
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth sync service changes
    const unsubscribeAuthSync = authSyncService.onAuthChange(async session => {
      setSession(session);

      if (session?.user) {
        // Add timeout to prevent hanging on profile fetch
        const profileTimeoutPromise = new Promise<User | null>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 8000);
        });

        try {
          const profilePromise = fetchUserProfile(session.user.id);
          const userProfile = await Promise.race([
            profilePromise,
            profileTimeoutPromise,
          ]);
          setUser(userProfile);
        } catch (error) {
          if (__DEV__) {
            console.warn(
              '⚠️ User profile fetch timed out, using cached data if available:',
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
          setUser(null);
          // Try to fetch in background (non-blocking)
          fetchUserProfile(session.user.id)
            .then(profile => {
              if (profile) {
                console.log('✅ User profile fetched in background');
                setUser(profile);
              }
            })
            .catch(() => {});
        }
      } else {
        setUser(null);
      }
    });

    // Listen for Supabase auth changes (primary source of truth)
    const subscription = authService.onAuthChange(async (event, session) => {
      console.log(`🔄 Auth event: ${event}`);

      // Sync to authSyncService (updates local cache)
      if (session) {
        await authSyncService.saveAuthState(session);
      } else {
        await authSyncService.clearAuthState();
      }

      setSession(session);
      if (session?.user) {
        // Add timeout to prevent hanging on profile fetch
        const profileTimeoutPromise = new Promise<User | null>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 8000);
        });

        let userProfile: User | null = null; // Declare outside try block

        try {
          const profilePromise = fetchUserProfile(session.user.id);
          userProfile = await Promise.race([
            profilePromise,
            profileTimeoutPromise,
          ]);
          setUser(userProfile);
        } catch (error) {
          if (__DEV__) {
            console.warn(
              '⚠️ User profile fetch timed out in auth change listener:',
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
          setUser(null);
          // Try to fetch in background (non-blocking)
          fetchUserProfile(session.user.id)
            .then(profile => {
              if (profile) {
                console.log('✅ User profile fetched in background');
                setUser(profile);
              }
            })
            .catch(() => {});
          return; // Exit early to avoid processing pending tasks
        }

        // Complete any pending task after authentication
        if (userProfile && session.user.id) {
          try {
            // Fire-and-forget: complete pending task in background
            const { getPendingTask, clearPendingTask } = await import(
              '@/utils/taskPersistence'
            );
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
                  const {
                    course,
                    title,
                    description,
                    dueDate,
                    submissionMethod,
                    submissionLink,
                    reminders,
                  } = pending.taskData || {};
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
                  const {
                    course,
                    title,
                    startTime,
                    endTime,
                    recurrence,
                    reminders,
                  } = pending.taskData || {};
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
                    console.warn(
                      '⚠️ Pending lecture missing required fields:',
                      {
                        hasCourse: !!course?.id,
                        hasStartTime: !!startTime,
                        hasEndTime: !!endTime,
                        hasTitle: !!title,
                      },
                    );
                  }
                } else if (pending.taskType === 'study_session') {
                  taskTypeName = 'study session';
                  const {
                    course,
                    topic,
                    description,
                    sessionDate,
                    hasSpacedRepetition,
                    reminders,
                  } = pending.taskData || {};
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
        if (userProfile) {
          mixpanelService.identify(userProfile.id);
          mixpanelService.setUserProperties({
            subscription_tier: userProfile.subscription_tier,
            onboarding_completed: userProfile.onboarding_completed,
            created_at: userProfile.created_at,
            university: userProfile.university,
            program: userProfile.program,
          });

          // Track login event
          mixpanelService.track(AnalyticsEvents.USER_LOGGED_IN, {
            subscription_tier: userProfile.subscription_tier,
            onboarding_completed: userProfile.onboarding_completed,
            login_method: 'email',
          });
        }

        // Trial logic removed - all new users start on free plan

        // Navigation is now handled in AppNavigator based on auth state changes
      } else {
        // Track logout event
        mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
          logout_reason: 'manual',
        });
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuthSync();
      subscription.unsubscribe();
    };
  }, []);

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
        return { error: { message: lockoutMessage } };
      }

      // Add timeout wrapper for login to prevent indefinite hanging
      const loginTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 15000); // 15 second timeout
      });

      const loginPromise = authService.login(credentials);
      const result = await Promise.race([loginPromise, loginTimeoutPromise]);

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

      // Explicitly fetch and set session to ensure AppNavigator detects the change
      // This ensures immediate UI update after successful login
      try {
        const currentSession = await authService.getSession();
        if (currentSession) {
          console.log('✅ [AuthContext] Explicitly setting session after signIn');
          await authSyncService.saveAuthState(currentSession);
          setSession(currentSession);
          if (currentSession.user) {
            const userProfile = await fetchUserProfile(currentSession.user.id);
            setUser(userProfile);
          }
        }
      } catch (sessionError) {
        console.warn('⚠️ Failed to fetch session after signIn:', sessionError);
        // Don't fail the login - the auth state change listener will handle it
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
          setUser(userProfile);
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

      return { error };
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
    isGuest: !session,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
