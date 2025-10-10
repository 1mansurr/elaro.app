import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, authService as supabaseAuthService } from '../services/supabase';
import { authService } from '../services/authService';
import { User } from '../types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
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
  signIn: (credentials: LoginCredentials) => Promise<{ error: any }>;
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
        
        // Navigation logic based on onboarding status
        if (userProfile) {
          if (userProfile.onboarding_completed) {
            // fetchInitialData(); // Removed to fix circular dependency - will be called elsewhere
            navigation.replace('Main');
          } else {
            // Pre-fill logic for social login users
            let params = {};
            const fullName = session.user?.user_metadata?.full_name;

            if (fullName) {
              const nameParts = fullName.split(' ');
              const firstName = nameParts[0];
              const lastName = nameParts.slice(1).join(' ');
              params = { firstName, lastName };
            }
            
            navigation.replace('Welcome', params);
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
      await authService.login(credentials);
      return { error: null };
    } catch (error) {
      console.error('❌ Sign in error:', error);
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
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
