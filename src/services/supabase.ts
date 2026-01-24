import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { User } from '@/types';
import {
  executeSupabaseQuery,
  executeSupabaseQueryNullable,
  executeSupabaseMutation,
} from '@/utils/supabaseQueryWrapper';

/**
 * Get Supabase configuration from Constants (Expo's way).
 * Does NOT access process.env at runtime (not available in Release builds).
 *
 * @returns Configuration object with url and anonKey, or null if missing
 */
function getSupabaseConfig(): { url: string; anonKey: string } | null {
  // Only use Constants.expoConfig - process.env is not available in Release builds
  const extra = Constants.expoConfig?.extra;
  if (!extra) {
    return null;
  }

  const url = extra.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

/**
 * Custom fetch wrapper that enforces a timeout on all requests.
 * Uses AbortController to cancel requests that exceed the timeout duration.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (same as native fetch)
 * @param timeoutMs - Timeout duration in milliseconds (default: 15000ms / 15 seconds)
 * @returns Promise<Response> - The fetch response
 * @throws Error - If the request times out
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000,
): Promise<Response> => {
  // Create an AbortController for this request
  const controller = new AbortController();

  // Set up a timeout that will abort the request
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // Make the fetch request with the abort signal
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Clear the timeout if the request completes successfully
    clearTimeout(timeoutId);

    return response;
  } catch (error: unknown) {
    // Clear the timeout on error
    clearTimeout(timeoutId);

    // Check if the error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request timeout: The server did not respond within ${timeoutMs}ms`,
      );
    }

    // Re-throw other errors
    throw error;
  }
};

// Cached Supabase client instance (singleton pattern)
let supabaseClientInstance: SupabaseClient | null = null;
let initializationError: Error | null = null;

/**
 * Get or initialize the Supabase client (lazy initialization).
 * 
 * This function:
 * - Validates configuration at runtime (not at import time)
 * - Throws a controlled JS Error if config is missing (does NOT crash native)
 * - Caches the client instance for subsequent calls
 * - Only initializes once (singleton pattern)
 * 
 * @returns Supabase client instance
 * @throws Error if Supabase configuration is missing
 */
export function getSupabaseClient(): SupabaseClient {
  // Return cached instance if available
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  // Return cached error if initialization previously failed
  if (initializationError) {
    throw initializationError;
  }

  // Get configuration at runtime (not at import time)
  const config = getSupabaseConfig();

  if (!config) {
    const missing: string[] = [];
    const extra = Constants.expoConfig?.extra;
    
    if (!extra) {
      missing.push('Constants.expoConfig.extra is undefined');
    } else {
      if (!extra.EXPO_PUBLIC_SUPABASE_URL) {
        missing.push('EXPO_PUBLIC_SUPABASE_URL');
      }
      if (!extra.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
      }
    }

    const errorMessage = `Supabase configuration is missing: ${missing.join(', ')}. ` +
      `Make sure these are set as EAS secrets or in app.config.js extra section.`;
    
    console.error(`❌ ${errorMessage}`);
    
    // Store error to prevent repeated initialization attempts
    initializationError = new Error(errorMessage);
    throw initializationError;
  }

  // Validate that values are not empty strings
  if (!config.url || !config.anonKey || config.url.trim() === '' || config.anonKey.trim() === '') {
    const errorMessage = 'Supabase configuration values are empty. ' +
      `URL: ${config.url ? 'present' : 'missing'}, Key: ${config.anonKey ? 'present' : 'missing'}`;
    
    console.error(`❌ ${errorMessage}`);
    
    initializationError = new Error(errorMessage);
    throw initializationError;
  }

  try {
    // Initialize Supabase client with validated configuration
    supabaseClientInstance = createClient(config.url, config.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: fetchWithTimeout as unknown as typeof fetch,
      },
    });

    return supabaseClientInstance;
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to initialize Supabase client';
    
    console.error(`❌ Supabase client initialization failed: ${errorMessage}`);
    
    initializationError = new Error(`Supabase initialization error: ${errorMessage}`);
    throw initializationError;
  }
}

/**
 * Backward-compatible export: supabase
 * 
 * This is a lazy getter that calls getSupabaseClient().
 * It does NOT initialize at import time - only when first accessed.
 * 
 * WARNING: If you import this at module level and use it at module level,
 * it will still initialize synchronously. Prefer using getSupabaseClient()
 * inside functions/effects for better control.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  },
});

// Authentication Services
// Note: This authService is being migrated to use API layer
// Using dynamic imports to break circular dependency with authService.ts
// (authService.ts imports supabase, so we can't import authService at module level)

export const authService = {
  async signUp(email: string, password: string, name?: string) {
    // Dynamic import to break circular dependency
    const { authService: migratedAuthService } =
      await import('@/services/authService');
    // Use migrated auth service
    const result = await migratedAuthService.signUp({
      email,
      password,
      firstName: name || '',
      lastName: '',
    });

    // Note: User profile is automatically created by database trigger
    // No need to manually create it

    return result;
  },

  async signIn(email: string, password: string) {
    // Dynamic import to break circular dependency
    const { authService: migratedAuthService } =
      await import('@/services/authService');
    // Use migrated auth service
    return await migratedAuthService.login({ email, password });
  },

  async signOut() {
    // Dynamic import to break circular dependency
    const { authService: migratedAuthService } =
      await import('@/services/authService');
    // Use migrated auth service
    return await migratedAuthService.signOut();
  },

  async getCurrentUser() {
    // Dynamic import to break circular dependency
    const { authService: migratedAuthService } =
      await import('@/services/authService');
    // Use migrated auth service
    return await migratedAuthService.getCurrentUser();
  },

  // Note: createUserProfile removed - handled by database trigger automatically
  // If needed, user profile is created automatically when auth user is created

  async getUserProfile(userId: string): Promise<User | null> {
    // Try API layer first with timeout
    try {
      const { versionedApiClient } = await import('./VersionedApiClient');

      // Add timeout to API call (5 seconds)
      const apiPromise = versionedApiClient.getUserProfile();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API timeout')), 5000);
      });

      const response = await Promise.race([apiPromise, timeoutPromise]);

      if (response.error || !response.data) {
        const errorMsg = response.error || 'No data in API response';
        const httpStatus =
          (response as any)?.status || (response as any)?.statusCode;
        const statusInfo = httpStatus ? ` (HTTP ${httpStatus})` : '';
        throw new Error(`${errorMsg}${statusInfo}`);
      }

      // Map API response to User type
      const data = response.data as any;
      const userProfile: User = {
        id: data.id,
        email: data.email ?? '',
        name: data.name,
        first_name: data.first_name,
        last_name: data.last_name,
        university: data.university,
        program: data.program,
        role: (data.role as 'user' | 'admin') ?? 'user',
        onboarding_completed: data.onboarding_completed ?? false,
        subscription_tier:
          (data.subscription_tier as 'free' | 'oddity' | null) ?? null,
        subscription_status:
          (data.subscription_status as
            | 'active'
            | 'past_due'
            | 'canceled'
            | null) ?? null,
        subscription_expires_at: data.subscription_expires_at ?? null,
        account_status:
          (data.account_status as 'active' | 'deleted' | 'suspended') ??
          'active',
        deleted_at: data.deleted_at ?? null,
        deletion_scheduled_at: data.deletion_scheduled_at ?? null,
        suspension_end_date: data.suspension_end_date ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_metadata: {
          first_name: data.first_name,
          last_name: data.last_name,
          name: data.name,
          university: data.university,
          program: data.program,
        },
      };

      return userProfile;
    } catch (apiError) {
      // FALLBACK: API failed or timed out, use direct Supabase query
      const errorMessage =
        apiError instanceof Error ? apiError.message : String(apiError);
      const isTimeout =
        errorMessage.includes('timeout') || errorMessage.includes('Timeout');
      const errorType = isTimeout ? 'timeout' : 'API error';

      // Log error with full details for debugging
      console.warn(
        `⚠️ [supabaseAuthService] API getUserProfile ${errorType}, using direct Supabase fallback:`,
        errorMessage,
      );
      if (apiError instanceof Error && apiError.stack) {
        console.warn('API Error stack:', apiError.stack);
      }

      try {
        // Direct Supabase query as fallback
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          // Log errors with full details for debugging
          console.error(
            '❌ [supabaseAuthService] Direct Supabase query failed:',
            {
              code: error.code || 'Unknown error',
              message: error.message || '',
              details: error.details || '',
              hint: error.hint || '',
            },
          );

          // Check if it's an RLS policy error or permission issue
          if (
            error.code === 'PGRST301' ||
            error.message?.includes('permission') ||
            error.message?.includes('policy') ||
            error.message?.includes('RLS') ||
            error.code === '42501'
          ) {
            if (__DEV__) {
              console.warn(
                '⚠️ [supabaseAuthService] RLS policy may be blocking direct query - user profile may not exist yet or RLS is restricting access',
              );
            }
          }

          // Check if user doesn't exist (common after signup before trigger runs)
          if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
            if (__DEV__) {
              console.warn(
                '⚠️ [supabaseAuthService] User profile not found in database - may need to wait for database trigger',
              );
            }
          }

          return null;
        }

        if (!data) {
          return null;
        }

        // Map database response to User type
        const userProfile: User = {
          id: data.id,
          email: data.email ?? '',
          name: data.name,
          first_name: data.first_name,
          last_name: data.last_name,
          university: data.university,
          program: data.program,
          role: (data.role as 'user' | 'admin') ?? 'user',
          onboarding_completed: data.onboarding_completed ?? false,
          subscription_tier:
            (data.subscription_tier as 'free' | 'oddity' | null) ?? null,
          subscription_status:
            (data.subscription_status === 'trialing'
              ? 'active'
              : (data.subscription_status as
                  | 'active'
                  | 'past_due'
                  | 'canceled'
                  | null)) ?? null,
          subscription_expires_at: data.subscription_expires_at ?? null,
          account_status:
            (data.account_status as 'active' | 'deleted' | 'suspended') ??
            'active',
          deleted_at: data.deleted_at ?? null,
          deletion_scheduled_at: data.deletion_scheduled_at ?? null,
          suspension_end_date: data.suspension_end_date ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
          user_metadata: {
            first_name: data.first_name,
            last_name: data.last_name,
            name: data.name,
            university: data.university,
            program: data.program,
          },
        };

        if (__DEV__) {
          console.log(
            '✅ [supabaseAuthService] Fallback: User profile fetched via direct Supabase',
          );
        }
        return userProfile;
      } catch (fallbackError) {
        // Only log in development to reduce production noise
        if (__DEV__) {
          console.error(
            '❌ [supabaseAuthService] Both API and fallback failed:',
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
          );
        }
        return null;
      }
    }
  },

  async updateUserProfile(userId: string, updates: Partial<User>) {
    // Use API layer instead of direct Supabase
    const { versionedApiClient } = await import('./VersionedApiClient');
    // Convert null to undefined for subscription_tier to match API expectations
    const apiUpdates = {
      ...updates,
      subscription_tier: updates.subscription_tier ?? undefined,
    };
    const response = await versionedApiClient.updateUserProfile(apiUpdates);

    if (response.error) {
      throw new Error(
        response.message || response.error || 'Failed to update user profile',
      );
    }
  },
};

// Study Session Services - removed (uses deleted StudySession type)
export const sessionService = {
  // Methods removed as they reference deleted StudySession type
};

// Task/Event Services - removed (uses deleted TaskEvent type)
export const taskService = {
  // Methods removed as they reference deleted TaskEvent type
};

// Spaced Repetition Services - removed (uses deleted SpacedRepetitionReminder type)
export const srService = {
  // Methods removed as they reference deleted SpacedRepetitionReminder type
};

// TODO: Streak service logic was here. Re-implement from scratch if/when streaks are reintroduced.

// Analytics Services - removed (uses deleted UserEvent type)
export const analyticsService = {
  // Methods removed as they reference deleted UserEvent type
};

// Subscription Services - removed (uses deleted Subscription type)
export const subscriptionService = {
  // Methods removed as they reference deleted Subscription type
};

// Utility Functions
export const dbUtils = {
  async deleteUserAccount(userId: string) {
    // Note: Account deletion should use the soft-delete-account endpoint
    // This method is kept for backward compatibility but should be migrated
    // Use: versionedApiClient.softDeleteAccount() or users Edge Function
    console.warn(
      'deleteUserAccount: This method should use API layer. Use soft-delete-account endpoint instead.',
    );

    // For now, use batch operations API if available
    const { versionedApiClient } = await import('./VersionedApiClient');
    // Note: Admin operations like deleteUser require admin-system Edge Function
    // This should be handled server-side, not from client
    throw new Error(
      'Account deletion must be done through admin-system Edge Function, not from client',
    );
  },

  async getUserStats(userId: string) {
    // Simplified stats - services removed due to deleted types
    return {
      totalSessions: 0,
      completedSessions: 0,
      totalTasks: 0,
      completedTasks: 0,
      activeReminders: 0,
    };
  },
};
