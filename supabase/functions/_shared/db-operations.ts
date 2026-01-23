/**
 * Database Operations Wrapper with Retry Logic
 *
 * Provides retry logic for transient database failures while failing fast
 * on permanent errors (constraint violations, not found, etc.).
 */

import { retryWithBackoff } from './retry.ts';
import { AppError } from './function-handler.ts';
import {
  ERROR_CODES,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
} from './error-codes.ts';
import { mapDatabaseError } from './error-codes.ts';
import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.39.3';

/**
 * Execute database operation with automatic retry for transient errors
 *
 * @param operation - Database operation function that returns { data, error }
 * @param options - Retry configuration
 * @returns Resolved data from the operation
 * @throws AppError for non-retryable errors or after max retries
 */
export async function executeDbOperation<T>(
  operation: () => Promise<{ data: T | null; error: unknown }>,
  options: {
    maxRetries?: number;
    operationName: string;
  } = { operationName: 'database_operation' },
): Promise<T> {
  return await retryWithBackoff(
    async () => {
      const result = await operation();

      if (result.error) {
        const mappedError = mapDatabaseError(result.error);

        // Don't retry constraint violations, not found, or validation errors
        const errorTyped = result.error as { code?: string; message?: string };
        if (
          errorTyped.code === '23505' || // Unique violation
          errorTyped.code === '23503' || // Foreign key violation
          errorTyped.code === '23514' || // Check constraint
          errorTyped.code === '23502' || // Not null violation
          errorTyped.code === 'PGRST116' || // Not found
          mappedError.statusCode < 500 // 4xx errors shouldn't retry
        ) {
          throw new AppError(
            mappedError.message,
            mappedError.statusCode,
            mappedError.code,
          );
        }

        // Retry other database errors (connection issues, timeouts, etc.)
        throw new Error(`Database error: ${errorTyped.message || 'Unknown error'}`);
      }

      if (!result.data) {
        throw new AppError(
          ERROR_MESSAGES.DB_NOT_FOUND,
          ERROR_STATUS_CODES.DB_NOT_FOUND,
          ERROR_CODES.DB_NOT_FOUND,
        );
      }

      return result.data;
    },
    options.maxRetries || 3,
    1000, // base delay 1 second
    30000, // max delay 30 seconds
  );
}

/**
 * Insert a record into the database with retry logic
 *
 * @param supabaseClient - Supabase client instance
 * @param table - Table name
 * @param data - Data to insert
 * @returns Created record
 */
export async function dbInsert<T>(
  supabaseClient: SupabaseClient,
  table: string,
  data: Record<string, unknown>,
): Promise<T> {
  return await executeDbOperation<T>(
    async () => {
      const result = await supabaseClient.from(table).insert(data).select().single();
      return { data: result.data as T | null, error: result.error };
    },
    { operationName: `insert_${table}` },
  );
}

/**
 * Update a record in the database with retry logic
 *
 * @param supabaseClient - Supabase client instance
 * @param table - Table name
 * @param id - Record ID to update
 * @param updates - Update data
 * @returns Updated record
 */
export async function dbUpdate<T>(
  supabaseClient: SupabaseClient,
  table: string,
  id: string,
  updates: Record<string, unknown>,
): Promise<T> {
  return await executeDbOperation<T>(
    async () => {
      const result = await supabaseClient.from(table).update(updates).eq('id', id).select().single();
      return { data: result.data as T | null, error: result.error };
    },
    { operationName: `update_${table}` },
  );
}

/**
 * Delete a record from the database with retry logic
 *
 * @param supabaseClient - Supabase client instance
 * @param table - Table name
 * @param id - Record ID to delete
 */
export async function dbDelete(
  supabaseClient: SupabaseClient,
  table: string,
  id: string,
): Promise<void> {
  return await executeDbOperation(
    async () => {
      const { error } = await supabaseClient.from(table).delete().eq('id', id);
      return { data: undefined, error };
    },
    { operationName: `delete_${table}` },
  );
}

/**
 * Get a single record by ID with retry logic
 *
 * @param supabaseClient - Supabase client instance
 * @param table - Table name
 * @param id - Record ID
 * @returns Found record
 */
export async function dbGetById<T>(
  supabaseClient: SupabaseClient,
  table: string,
  id: string,
): Promise<T> {
  return await executeDbOperation<T>(
    async () => {
      const result = await supabaseClient.from(table).select('*').eq('id', id).single();
      return { data: result.data as T | null, error: result.error };
    },
    { operationName: `get_${table}_by_id` },
  );
}

/**
 * Query records with retry logic
 *
 * @param supabaseClient - Supabase client instance
 * @param table - Table name
 * @param queryBuilder - Function that builds the query
 * @returns Query result
 */
export async function dbQuery<T>(
  supabaseClient: ReturnType<typeof createClient>,
  table: string,
  queryBuilder: (
    query: ReturnType<ReturnType<typeof createClient>['from']>,
  ) => ReturnType<ReturnType<typeof createClient>['from']>,
): Promise<T[]> {
  return await executeDbOperation<T[]>(
    async () => {
      const query = supabaseClient.from(table).select('*');
      const builtQuery = queryBuilder(query);
      const result = await builtQuery;
      return { data: result.data as T[] | null, error: result.error };
    },
    { operationName: `query_${table}` },
  );
}
