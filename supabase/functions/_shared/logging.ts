/**
 * Centralized Logging with Supabase Storage
 *
 * Aggregates logs to Supabase Storage for centralized querying and analysis.
 * Supports different retention policies: 30 days for errors, 7 days for general logs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { redactPII } from './pii-redaction.ts';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  function?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

// Supabase Storage bucket name for logs
const LOG_BUCKET = Deno.env.get('LOG_STORAGE_BUCKET') || 'logs';

// Initialize Supabase admin client for storage
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  return supabaseAdmin;
}

/**
 * Get log file path based on date and level
 */
function getLogFilePath(level: LogLevel, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');

  // Separate paths for errors (30-day retention) and general logs (7-day retention)
  const retention = level === 'error' ? 'errors' : 'general';

  return `${retention}/${year}/${month}/${day}/${hour}.jsonl`;
}

/**
 * Append log entry to storage
 */
async function appendLogToStorage(logEntry: LogEntry): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const date = new Date(logEntry.timestamp);
    const filePath = getLogFilePath(logEntry.level, date);

    // Read existing logs if file exists
    let existingLogs: LogEntry[] = [];
    try {
      const { data, error } = await admin.storage
        .from(LOG_BUCKET)
        .download(filePath);

      if (!error && data) {
        const text = await data.text();
        existingLogs = text
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      }
    } catch (_error) {
      // File doesn't exist yet, start with empty array
      console.debug(`Log file ${filePath} doesn't exist yet, creating new one`);
    }

    // Add new log entry
    existingLogs.push(logEntry);

    // Convert back to JSONL format
    const jsonlContent =
      existingLogs.map(log => JSON.stringify(log)).join('\n') + '\n';

    // Upload to storage
    const { error: uploadError } = await admin.storage
      .from(LOG_BUCKET)
      .upload(filePath, jsonlContent, {
        contentType: 'application/x-ndjson',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error(`Failed to upload log to storage: ${uploadError.message}`);
      // Fallback to console
      console[logEntry.level](JSON.stringify(logEntry));
    }
  } catch (error) {
    console.error('Error in log aggregation:', error);
    // Fallback to console
    console[logEntry.level](JSON.stringify(logEntry));
  }
}

/**
 * Send log entry (to storage and console)
 *
 * @param level - Log level
 * @param message - Log message
 * @param metadata - Additional metadata (will be redacted)
 * @param traceContext - Trace context for distributed tracing
 */
export function sendLog(
  level: LogLevel,
  message: string,
  metadata: Record<string, unknown> = {},
  traceContext?: { traceId?: string; spanId?: string; parentSpanId?: string },
): void {
  // Redact PII from metadata
  const redactedMetadata = redactPII(metadata, {
    hashIds: true,
    maskEmails: true,
    redactIpAddresses: true,
  }) as Record<string, unknown>;

  const logEntry: LogEntry = {
    level,
    message,
    function: metadata.function,
    userId: metadata.userId
      ? (redactPII(metadata.userId, { hashIds: true }) as string)
      : undefined,
    traceId: traceContext?.traceId,
    spanId: traceContext?.spanId,
    metadata: redactedMetadata,
    timestamp: new Date().toISOString(),
    error: metadata.error
      ? {
          message: metadata.error.message || String(metadata.error),
          stack: metadata.error.stack,
          code: metadata.error.code,
        }
      : undefined,
  };

  // Send to storage (async, don't wait)
  appendLogToStorage(logEntry).catch(error => {
    console.error('Failed to send log to storage:', error);
  });

  // Also log to console for immediate visibility
  const consoleMessage = JSON.stringify({
    level,
    message,
    traceId: traceContext?.traceId,
    spanId: traceContext?.spanId,
    ...redactedMetadata,
    timestamp: logEntry.timestamp,
  });

  console[level](consoleMessage);
}

/**
 * Convenience functions for different log levels
 */
export const logger = {
  info: (
    message: string,
    metadata?: Record<string, unknown>,
    traceContext?: { traceId?: string; spanId?: string },
  ) => {
    return sendLog('info', message, metadata, traceContext);
  },
  warn: (
    message: string,
    metadata?: Record<string, unknown>,
    traceContext?: { traceId?: string; spanId?: string },
  ) => {
    return sendLog('warn', message, metadata, traceContext);
  },
  error: (
    message: string,
    metadata?: Record<string, unknown>,
    traceContext?: { traceId?: string; spanId?: string },
  ) => {
    return sendLog('error', message, metadata, traceContext);
  },
  debug: (
    message: string,
    metadata?: Record<string, unknown>,
    traceContext?: { traceId?: string; spanId?: string },
  ) => {
    return sendLog('debug', message, metadata, traceContext);
  },
};

/**
 * Clean up old logs based on retention policy
 * Errors: 30 days, General: 7 days
 */
export async function cleanupOldLogs(): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const now = new Date();

    // Calculate cutoff dates
    const errorCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const generalCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // List all files in logs bucket
    const { data: files, error } = await admin.storage
      .from(LOG_BUCKET)
      .list('', { recursive: true });

    if (error || !files) {
      console.error('Failed to list log files:', error);
      return;
    }

    // Delete old files
    for (const file of files) {
      const filePath = file.name;
      const fileDate = file.created_at ? new Date(file.created_at) : new Date();

      // Determine retention based on path
      const isErrorLog = filePath.startsWith('errors/');
      const cutoff = isErrorLog ? errorCutoff : generalCutoff;

      if (fileDate < cutoff) {
        const { error: deleteError } = await admin.storage
          .from(LOG_BUCKET)
          .remove([filePath]);

        if (deleteError) {
          console.error(
            `Failed to delete old log file ${filePath}:`,
            deleteError,
          );
        } else {
          console.log(`Deleted old log file: ${filePath}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old logs:', error);
  }
}
