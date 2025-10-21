import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { supabase, authService as supabaseAuthService } from '@/services/supabase';
import { authService } from '@/features/auth/services/authService';
import { User } from '@/types';
import { getPendingTask } from '@/utils/taskPersistence';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { isSessionExpired, clearLastActiveTimestamp, updateLastActiveTimestamp } from '@/utils/sessionTimeout';
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
  signIn: (credentials: LoginCredentials) => Promise<{ error: any; requiresMFA?: boolean; factors?: any[] }>;
  signUp: (credentials: SignUpCredentials) => Promise<{ error: any }>;
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

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const userProfile = await supabaseAuthService.getUserProfile(userId);
      
      if (!userProfile) {
        return null;
      }
      
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
    }
  };

  useEffect(() => {
    // Get initial session
    authService.getSession().then((session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUser(profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('❌ Error getting initial session:', error);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const subscription = authService.onAuthChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setUser(userProfile);

        // Identify user in Mixpanel and set user properties
        if (userProfile) {
          mixpanelService.identifyUser(userProfile.id);
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

        // --- START: NEW TRIAL LOGIC ---
        if (userProfile && userProfile.subscription_tier === 'free' && userProfile.subscription_expires_at === null) {
          console.log('New free user detected. Attempting to start trial...');
          try {
            const { error } = await supabase.functions.invoke('start-user-trial');
            if (error) {
              console.error('Failed to start user trial:', error.message);
            } else {
              console.log('Trial started successfully. Refreshing user profile...');
              // Refresh the user profile to get the new subscription status
              const refreshedUserProfile = await fetchUserProfile(session.user.id);
              setUser(refreshedUserProfile);
              
              // Track trial start
              mixpanelService.track(AnalyticsEvents.TRIAL_STARTED, {
                trial_type: 'free_trial',
                trial_duration: 7,
              });
            }
          } catch (e) {
            console.error('An unexpected error occurred while starting trial:', e);
          }
        }
        // --- END: NEW TRIAL LOGIC ---
        
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

    return () => subscription.unsubscribe();
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
      const result = await authService.login(credentials);
      
      // Set the initial last active timestamp on successful login
      await updateLastActiveTimestamp();
      
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
      console.error('❌ Sign in error:', error);
      
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
        error_message: error.message,
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
      
      // Clear the last active timestamp
      await clearLastActiveTimestamp();
      
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
