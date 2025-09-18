import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as Google from 'expo-auth-session/providers/google';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { supabase, authService } from '../services/supabase';
import { User } from '../types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
// import { useData } from './DataContext'; // Removed to fix circular dependency

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
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

  // Set up Google Auth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "304047164378-e45ushdl2io4cr9c4a7bbv1m6qvc3h0s.apps.googleusercontent.com",
    webClientId: "304047164378-ps1apl5jd7pd5phmkruaq3i8rlkfq50k.apps.googleusercontent.com",
  });

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const userProfile = await authService.getUserProfile(userId);
      console.log('AuthContext: fetched user profile', userProfile);
      return userProfile as User;
    } catch (error) {
      console.error('AuthContext: Error fetching user profile:', error);
      // If user profile doesn't exist, create it
      try {
        const session = await supabase.auth.getSession();
        if (session.data.session?.user) {
          await authService.createUserProfile(
            session.data.session.user.id,
            session.data.session.user.email || '',
          );
          const newProfile = await authService.getUserProfile(userId);
          console.log('AuthContext: created new user profile', newProfile);
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
      console.log('AuthContext: setUser in refreshUser', userProfile);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Error getting initial session:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
        console.log('AuthContext: setLoading(false) after error');
        return;
      }

      console.log(
        '🔐 Initial session state:',
        session ? 'Authenticated' : 'Not authenticated',
      );
      if (session?.user) {
        console.log('👤 User email:', session.user.email);
      }

      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUser(profile);
          console.log('AuthContext: setUser after fetchUserProfile', profile);
          setLoading(false);
          console.log('AuthContext: setLoading(false) after user fetch');
        });
      } else {
        setLoading(false);
        console.log('AuthContext: setLoading(false) no session.user');
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        '🔄 Auth state change:',
        event,
        session ? 'Session present' : 'No session',
      );
      setSession(session);
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        setUser(userProfile);
        console.log('AuthContext: setUser after auth change', userProfile);
        
        // Navigation logic based on onboarding status
        if (userProfile) {
          if (userProfile.onboarding_completed) {
            console.log('✅ User has completed onboarding, navigating to Main');
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
              console.log('🔤 Pre-filling names for social user:', { firstName, lastName });
            }
            
            console.log('🆕 New user, navigating to Welcome for onboarding');
            navigation.replace('Welcome', params);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      console.log('AuthContext: setLoading(false) after auth change');
    });

    return () => subscription.unsubscribe();
  }, [navigation]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        return { error };
      }

      console.log('✅ Sign in successful:', data.user?.email);
      return { error: null };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        return { error };
      }

      // User profile will be created automatically by the database trigger
      // But we can also create it manually if needed
      if (data.user && !data.user.email_confirmed_at) {
        console.log(
          '📧 User signed up successfully. Please check email for confirmation.',
        );
      }

      return { error: null };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Sign out successful');
      }
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();

      if (result.type === "success" && result.authentication?.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: result.authentication.idToken,
        });

        if (error) {
          console.error("Supabase sign-in error:", error);
          return { error };
        } else {
          console.log("Signed in with Google:", data);
          return { error: null };
        }
      }
      return { error: new Error('Google sign-in was cancelled or failed') };
    } catch (err) {
      console.error("Google sign-in error:", err);
      return { error: err };
    }
  };

  const signInWithApple = async () => {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });
      const { identityToken } = appleAuthRequestResponse;
      if (identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: identityToken,
        });
        if (error) throw error;
        return { error: null };
      }
      return { error: new Error('No identity token received') };
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      return { error };
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
    signInWithGoogle,
    signInWithApple,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
