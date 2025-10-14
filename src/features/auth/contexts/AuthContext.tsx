import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, authService as supabaseAuthService } from '@/services/supabase';
import { authService } from '@/features/auth/services/authService';
import { User, RootStackParamList } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getPendingTask } from '@/utils/taskPersistence';
// import { useData } from './DataContext'; // Removed to fix circular dependency

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

type AuthNavProp = StackNavigationProp<RootStackParamList>;

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
  const navigation = useNavigation<AuthNavProp>();
  // const { fetchInitialData } = useData(); // Removed to fix circular dependency

  // Social providers removed; email-only auth

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const userProfile = await supabaseAuthService.getUserProfile(userId);
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
            }
          } catch (e) {
            console.error('An unexpected error occurred while starting trial:', e);
          }
        }
        // --- END: NEW TRIAL LOGIC ---
        
        // Navigation logic based on onboarding status
        if (userProfile) {
          if (userProfile.onboarding_completed) {
            // fetchInitialData(); // Removed to fix circular dependency - will be called elsewhere
            navigation.replace('Main');
          } else {
            // Check for pending course before starting onboarding
            const pendingTask = await getPendingTask();
            
            // Pre-fill logic for social login users
            let params = {};
            const fullName = session.user?.user_metadata?.full_name;

            if (fullName) {
              const nameParts = fullName.split(' ');
              const firstName = nameParts[0];
              const lastName = nameParts.slice(1).join(' ');
              params = { firstName, lastName };
            }
            
            // If there's a pending course, skip to onboarding flow
            if (pendingTask && pendingTask.taskType === 'course') {
              navigation.replace('OnboardingFlow');
            } else {
              navigation.replace('Welcome', params);
            }
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigation]);

  const signIn = async (credentials: LoginCredentials) => {
    try {
      const result = await authService.login(credentials);
      
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
      return { error: null };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
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
