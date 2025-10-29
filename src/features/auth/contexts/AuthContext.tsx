import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { supabase, authService as supabaseAuthService } from '@/services/supabase';
import { authService } from '@/features/auth/services/authService';
import { authSyncService } from '@/services/authSync';
import { User } from '@/types';
import { getPendingTask } from '@/utils/taskPersistence';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { isSessionExpired, clearLastActiveTimestamp, updateLastActiveTimestamp } from '@/utils/sessionTimeout';
import { cache } from '@/utils/cache';
// import { errorTrackingService } from '@/services/ErrorTrackingService';
import { 
  checkAccountLockout, 
  recordFailedAttempt, 
  recordSuccessfulLogin, 
  getLockoutMessage,
  resetFailedAttempts 
} from '@/utils/authLockout';
import { Platform } from 'react-native';
import { useNetwork } from '@/contexts/NetworkContext';
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

type AuthIssue = 'network' | 'backend' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (credentials: LoginCredentials) => Promise<{ error: any; requiresMFA?: boolean; factors?: any[] }>;
  signUp: (credentials: SignUpCredentials) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Error/timeout handling for auth init
  authIssue: AuthIssue;
  timedOut: boolean;
  retryAuth: () => Promise<void>;
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

  // Auth issue state
  const [authIssue, setAuthIssue] = useState<AuthIssue>(null);
  const [timedOut, setTimedOut] = useState(false);
  const { isOffline } = useNetwork();

  const classifyError = (err: any): AuthIssue => {
    const msg = String(err?.message || err || '').toLowerCase();
    if (isOffline || msg.includes('network') || msg.includes('connection') || msg.includes('timeout')) {
      return 'network';
    }
    return 'backend';
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number = 3000): Promise<T> => {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('Auth initialization timeout')),
        ms);
      promise
        .then((res) => {
          clearTimeout(id);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(id);
          reject(err);
        });
    });
  };

  const runInitialAuth = async () => {
    setAuthIssue(null);
    setTimedOut(false);

    try {
      const initialSession = await authSyncService.initialize();
      setSession(initialSession);

      if (initialSession?.user) {
        const userProfile = await fetchUserProfile(initialSession.user.id);
        setUser(userProfile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error getting initial session:', error);
      setSession(null);
      setUser(null);
      setAuthIssue(classifyError(error));
    } finally {
      setLoading(false);
    }
  };

  const retryAuth = async () => {
    setLoading(true);
    setAuthIssue(null);
    setTimedOut(false);
    try {
      await runInitialAuth();
    } catch {
      // handled in runInitialAuth
    }
  };

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      // Try to get from cache first for instant load
      const cacheKey = `user_profile:${userId}`;
      const cachedProfile = await cache.get<User>(cacheKey);
      
      if (cachedProfile) {
        console.log('📱 Using cached user profile');
        // Set cached data immediately for instant UI
        setUser(cachedProfile);
        
        // Still fetch fresh data in background to stay up-to-date
        supabaseAuthService.getUserProfile(userId).then(async freshProfile => {
          if (freshProfile && JSON.stringify(freshProfile) !== JSON.stringify(cachedProfile)) {
            console.log('🔄 Updating user profile from server');
            setUser(freshProfile as User);
            await cache.setLong(cacheKey, freshProfile);
          }
        }).catch(err => {
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
                { text: 'No', style: 'cancel', onPress: () => authService.signOut() },
                { 
                  text: 'Restore', 
                  onPress: async () => {
                    try {
                      await authService.restoreAccount();
                      // Refresh user profile after restoration
                      const restoredProfile = await supabaseAuthService.getUserProfile(userId);
                      setUser(restoredProfile as User);
                    } catch (error) {
                      console.error('Error restoring account:', error);
                      Alert.alert('Restoration Failed', 'Could not restore your account. Please contact support.');
                      await authService.signOut();
                    }
                  }
                }
              ]
            );
            return null; // Don't set user as logged in
          } else {
            // Restoration period expired
            Alert.alert(
              'Account Permanently Deleted',
              'Your account has been permanently deleted and cannot be restored.'
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
              console.log('Suspension expired, but auto-unsuspend should be handled by cron job');
            } catch (error) {
              console.error('Error auto-unsuspending account:', error);
            }
          }
        }
        
        // Account is still suspended
        Alert.alert(
          'Account Suspended',
          'Your account has been suspended. Please contact support for assistance.'
        );
        await authService.signOut();
        return null;
      }
      
      return userProfile as User;
    } catch (error) {
      console.error('AuthContext: Error fetching user profile:', error);
      // If user profile doesn't exist, create it
      try {
        const session = await authService.getSession();
        if (session?.user) {
          await supabaseAuthService.createUserProfile(
            session.user.id,
            session.user.email || '',
          );
          const newProfile = await supabaseAuthService.getUserProfile(userId);
          return newProfile as User;
        }
      } catch (createError) {
        console.error('AuthContext: Error creating user profile:', createError);
      }
      return null;
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      const userProfile = await fetchUserProfile(session.user.id);
      setUser(userProfile);
      
      // Clear cache to ensure fresh data after onboarding completion
      if (userProfile?.onboarding_completed) {
        const cacheKey = `user_profile:${session.user.id}`;
        // await cache.delete(cacheKey);
      }
    }
  };

  useEffect(() => {
    // Run auth init with a 3s timeout; if it times out, proceed and show issue modal
    (async () => {
      try {
        await withTimeout(runInitialAuth(), 3000);
      } catch (err) {
        const issue = classifyError(err);
        setAuthIssue(issue);
        setTimedOut(true);
        setLoading(false);
      }
    })();

    // Subscribe to auth sync service changes
    const unsubscribeAuthSync = authSyncService.onAuthChange(async (session) => {
      setSession(session);
      
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setUser(userProfile);
        setAuthIssue(null);
        setTimedOut(false);
      } else {
        setUser(null);
      }
    });

    // Listen for Supabase auth changes (primary source of truth)
    const subscription = authService.onAuthChange(async (event, session) => {
      console.log(`🔄 Auth event: ${event}`);
      
      try {
        // Sync to authSyncService (updates local cache)
        if (session) {
          await authSyncService.saveAuthState(session);
        } else {
          await authSyncService.clearAuthState();
        }
        
        setSession(session);
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id);
          setUser(userProfile);

          if (userProfile) {
            mixpanelService.identify(userProfile.id);
            mixpanelService.setUserProperties({
              subscription_tier: userProfile.subscription_tier,
              onboarding_completed: userProfile.onboarding_completed,
              created_at: userProfile.created_at,
              university: userProfile.university,
              program: userProfile.program,
            });
            mixpanelService.track(AnalyticsEvents.USER_LOGGED_IN, {
              subscription_tier: userProfile.subscription_tier,
              onboarding_completed: userProfile.onboarding_completed,
              login_method: 'email',
            });
          }

          if (userProfile && userProfile.subscription_tier === 'free' && userProfile.subscription_expires_at === null) {
            console.log('New free user detected. Attempting to start trial...');
            try {
              const { error } = await supabase.functions.invoke('start-user-trial');
              if (!error) {
                const refreshedUserProfile = await fetchUserProfile(session.user.id);
                setUser(refreshedUserProfile);
                mixpanelService.track(AnalyticsEvents.TRIAL_STARTED, {
                  trial_type: 'free_trial',
                  trial_duration: 7,
                });
              } else {
                console.error('Failed to start user trial:', error.message);
              }
            } catch (e) {
              console.error('An unexpected error occurred while starting trial:', e);
            }
          }

          setAuthIssue(null);
          setTimedOut(false);
        } else {
          mixpanelService.track(AnalyticsEvents.USER_LOGGED_OUT, {
            logout_reason: 'manual',
          });
          setUser(null);
        }
      } catch (e) {
        setAuthIssue(classifyError(e));
      } finally {
        setLoading(false);
      }
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
            [{ text: 'OK' }]
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

  const signIn = async (credentials: LoginCredentials) => {
    try {
      // Check if account is locked
      const lockoutStatus = await checkAccountLockout(credentials.email);
      if (lockoutStatus.isLocked && lockoutStatus.minutesRemaining) {
        const lockoutMessage = getLockoutMessage(lockoutStatus.minutesRemaining);
        Alert.alert('Account Locked', lockoutMessage);
        return { error: { message: lockoutMessage } };
      }
      
      const result = await authService.login(credentials);
      
      // Set the initial last active timestamp on successful login
      await updateLastActiveTimestamp();
      
      // Record successful login with device info
      if (result?.user?.id) {
        await recordSuccessfulLogin(result.user.id, 'email', {
          platform: Platform.OS,
          version: Platform.Version?.toString(),
        });
        
        // Reset failed attempts on successful login
        await resetFailedAttempts(credentials.email);
      }
      
      // Check if MFA is required
      try {
        const aal = await authService.mfa.getAuthenticatorAssuranceLevel();
        if (aal.currentLevel === 'aal2') {
          // Get available MFA factors
          const mfaStatus = await authService.mfa.getStatus();
          return { 
            error: null, 
            requiresMFA: true, 
            factors: mfaStatus.factors 
          };
        }
      } catch (mfaError) {
        // MFA might not be enabled or configured
        console.log('MFA check failed:', mfaError);
      }
      
      return { error: null };
    } catch (error: any) {
      // Log error for debugging
      console.error('Sign in error:', error);
      
      // Record failed login attempt
      if (credentials.email && error.message) {
        await recordFailedAttempt(credentials.email, error.message);
      }
      
      // Check if this is an MFA-related error
      if (error.message?.includes('MFA') || error.message?.includes('aal2')) {
        try {
          const mfaStatus = await authService.mfa.getStatus();
          return { 
            error: null, 
            requiresMFA: true, 
            factors: mfaStatus.factors 
          };
        } catch (mfaError) {
          // If we can't get MFA status, return the original error
          return { error };
        }
      }
      
      return { error };
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      await authService.signUp(credentials);
      
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
    authIssue,
    timedOut,
    retryAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
