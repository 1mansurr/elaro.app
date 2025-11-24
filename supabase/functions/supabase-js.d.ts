// Type declarations for @supabase/supabase-js ESM import
// This allows TypeScript to recognize the ESM import from esm.sh

declare module 'https://esm.sh/@supabase/supabase-js@2.39.3' {
  export interface SupabaseClientOptions {
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
      detectSessionInUrl?: boolean;
    };
    global?: {
      headers?: Record<string, string>;
    };
    db?: {
      schema?: string;
    };
    realtime?: {
      params?: {
        eventsPerSecond?: number;
      };
    };
  }

  export interface User {
    id: string;
    email?: string;
    phone?: string;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
    aud?: string;
    confirmation_sent_at?: string;
    recovery_sent_at?: string;
    email_change_sent_at?: string;
    new_email?: string;
    invited_at?: string;
    action_link?: string;
    email_change?: string;
    last_sign_in_at?: string;
    phone_change?: string;
    phone_change_token?: string;
    confirmed_at?: string;
    email_change_token?: string;
    is_anonymous?: boolean;
    created_at?: string;
    updated_at?: string;
  }

  export interface AuthResponse {
    data: {
      user: User | null;
    };
    error: Error | null;
  }

  export interface AuthClient {
    getUser(): Promise<AuthResponse>;
    signOut(): Promise<{ error: Error | null }>;
    signInWithPassword(credentials: {
      email?: string;
      password?: string;
      phone?: string;
    }): Promise<AuthResponse>;
  }

  export interface SupabaseClient {
    auth: AuthClient;
    from(table: string): any;
    rpc(functionName: string, args?: Record<string, any>): Promise<any>;
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions,
  ): SupabaseClient;

  export type { SupabaseClient, User };
}
