import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, authService } from '../services/supabase';
import { User } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
            session.data.session.user.email || ''
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

      console.log('🔐 Initial session state:', session ? 'Authenticated' : 'Not authenticated');
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session ? 'Session present' : 'No session');
        setSession(session);
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id);
          setUser(userProfile);
          console.log('AuthContext: setUser after auth change', userProfile);
        } else {
          setUser(null);
        }
        setLoading(false);
        console.log('AuthContext: setLoading(false) after auth change');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
        console.log('📧 User signed up successfully. Please check email for confirmation.');
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

