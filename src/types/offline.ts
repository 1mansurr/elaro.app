/**
 * Types for Offline Support System (Level 2)
 * 
 * This file defines the structure for offline actions that are queued
 * when the user performs mutations while offline. These actions are
 * stored in AsyncStorage and processed when connectivity is restored.
 */

/**
 * The type of operation being performed
 */
export type OfflineOperationType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'RESTORE' 
  | 'COMPLETE'
  | 'BATCH_DELETE'
  | 'BATCH_RESTORE';

/**
 * The type of resource being modified
 */
export type OfflineResourceType = 
  | 'assignment' 
  | 'lecture' 
  | 'study_session' 
  | 'course';

/**
 * Status of an offline action
 */
export type OfflineActionStatus = 
  | 'pending'    // Waiting to be synced
  | 'syncing'    // Currently being synced
  | 'success'    // Successfully synced
  | 'failed'     // Failed to sync (will retry)
  | 'cancelled'; // User cancelled the action

/**
 * Base structure for an offline action
 */
export interface OfflineAction {
  /** Unique identifier for this offline action (client-generated UUID) */
  id: string;
  
  /** Type of operation (CREATE, UPDATE, DELETE, etc.) */
  operation: OfflineOperationType;
  
  /** Type of resource (assignment, lecture, etc.) */
  resourceType: OfflineResourceType;
  
  /** The actual data for the mutation */
  payload: OfflineActionPayload;
  
  /** Timestamp when the action was created (offline) */
  timestamp: number;
  
  /** Current status of the action */
  status: OfflineActionStatus;
  
  /** Number of times we've attempted to sync this action */
  retryCount: number;
  
  /** Maximum number of retry attempts before giving up */
  maxRetries: number;
  
  /** User ID who created this action */
  userId: string;
  
  /** Optional error message if sync failed */
  error?: string;
  
  /** Temporary ID used locally (for CREATE operations) */
  tempId?: string;
}

/**
 * Payload types for different operations
 */
export type OfflineActionPayload = 
  | CreatePayload
  | UpdatePayload
  | DeletePayload
  | RestorePayload
  | CompletePayload
  | BatchPayload;

/**
 * Payload for CREATE operations
 */
export interface CreatePayload {
  type: 'CREATE';
  data: Record<string, any>; // The data to create (assignment, lecture, etc.)
}

/**
 * Payload for UPDATE operations
 */
export interface UpdatePayload {
  type: 'UPDATE';
  resourceId: string; // Server ID of the resource to update
  updates: Record<string, any>; // Fields to update
}

/**
 * Payload for DELETE operations
 */
export interface DeletePayload {
  type: 'DELETE';
  resourceId: string; // Server ID of the resource to delete
}

/**
 * Payload for RESTORE operations
 */
export interface RestorePayload {
  type: 'RESTORE';
  resourceId: string; // Server ID of the resource to restore
}

/**
 * Payload for COMPLETE operations (marking a task as complete)
 */
export interface CompletePayload {
  type: 'COMPLETE';
  resourceId: string; // Server ID of the task to complete
}

/**
 * Payload for BATCH operations (batch delete/restore)
 */
export interface BatchPayload {
  type: 'BATCH';
  action: 'DELETE' | 'RESTORE';
  items: Array<{
    id: string;
    type: OfflineResourceType;
  }>;
}

/**
 * Result of processing an offline action
 */
export interface SyncResult {
  /** The action that was processed */
  action: OfflineAction;
  
  /** Whether the sync was successful */
  success: boolean;
  
  /** Error message if sync failed */
  error?: string;
  
  /** Server response data (if successful) */
  data?: any;
}

/**
 * Statistics about the offline queue
 */
export interface QueueStats {
  /** Total number of actions in the queue */
  total: number;
  
  /** Number of pending actions */
  pending: number;
  
  /** Number of actions currently syncing */
  syncing: number;
  
  /** Number of failed actions */
  failed: number;
  
  /** Oldest action timestamp */
  oldestTimestamp?: number;
}

/**
 * Options for adding an action to the queue
 */
export interface AddToQueueOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  
  /** Whether to immediately try to sync if online (default: true) */
  syncImmediately?: boolean;
}

/**
 * Configuration for the Sync Manager
 */
export interface SyncManagerConfig {
  /** Maximum number of concurrent sync operations (default: 3) */
  maxConcurrentSyncs?: number;
  
  /** Delay between retries in milliseconds (default: 5000) */
  retryDelay?: number;
  
  /** Whether to sync automatically when coming online (default: true) */
  autoSyncOnline?: boolean;
  
  /** Maximum queue size (default: 100) */
  maxQueueSize?: number;
}

