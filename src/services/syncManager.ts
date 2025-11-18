/**
 * Sync Manager - Offline Queue Management and Synchronization
 *
 * This service manages the offline action queue. When the app is offline,
 * mutation actions are added to a queue in AsyncStorage. When connectivity
 * is restored, this manager processes the queue and syncs actions with the server.
 *
 * Phase 3: Full implementation with sync logic, network listeners, and temp ID replacement.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '@/services/supabase';
import { cache } from '@/utils/cache';
import { isTempId } from '@/utils/uuid';
import { CircuitBreaker } from '@/utils/circuitBreaker';
import {
  OfflineAction,
  OfflineActionStatus,
  AddToQueueOptions,
  QueueStats,
  SyncResult,
  SyncManagerConfig,
  OfflineOperationType,
  OfflineResourceType,
  OfflineActionPayload,
} from '@/types/offline';

/**
 * Storage key for the offline queue in AsyncStorage
 */
const OFFLINE_QUEUE_KEY = '@elaro_offline_queue_v1';

/**
 * Storage key for sync manager configuration
 */
const SYNC_CONFIG_KEY = '@elaro_sync_config_v1';

/**
 * Storage key for temporary ID to real ID mappings
 */
const ID_MAPPING_KEY = '@elaro_id_mapping_v1';

/**
 * Default configuration for the Sync Manager
 */
const DEFAULT_CONFIG: SyncManagerConfig = {
  maxConcurrentSyncs: 3,
  retryDelay: 5000, // 5 seconds
  autoSyncOnline: true,
  maxQueueSize: 100,
};

/**
 * Extended OfflineAction with retry scheduling and priority
 */
interface ExtendedOfflineAction extends OfflineAction {
  nextRetryAt?: number;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * SyncManager Class
 *
 * Manages offline actions and their synchronization with the server.
 */
class SyncManager {
  private queue: OfflineAction[] = [];
  private isProcessing: boolean = false;
  private isSyncing: boolean = false;
  private config: SyncManagerConfig = DEFAULT_CONFIG;
  private listeners: Array<(stats: QueueStats) => void> = [];
  private networkUnsubscribe: (() => void) | null = null;
  private idMapping: Map<string, string> = new Map(); // tempId -> realId
  private circuitBreaker: CircuitBreaker;

  /**
   * Initialize the Sync Manager
   * Loads the queue from AsyncStorage and sets up listeners
   * Sets up network change listener to auto-sync when coming online
   */
  constructor() {
    // Initialize circuit breaker for sync operations
    this.circuitBreaker = CircuitBreaker.getInstance('sync-manager', {
      failureThreshold: 5,
      successThreshold: 2,
      resetTimeout: 30000, // 30 seconds
    });
  }

  async start(): Promise<void> {
    console.log('🔄 SyncManager: Starting...');

    try {
      // Load configuration from storage
      await this.loadConfig();

      // Load existing queue from AsyncStorage
      await this.loadQueue();

      // Load ID mapping from storage
      await this.loadIdMapping();

      console.log(
        `✅ SyncManager: Started with ${this.queue.length} queued actions`,
      );

      // Notify listeners about initial state
      this.notifyListeners();

      // Set up network change listener
      this.setupNetworkListener();

      // Process queue on startup if there are pending actions
      if (this.queue.length > 0) {
        console.log('📦 SyncManager: Processing existing queue on startup...');
        // Check if we're online first
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected && netInfo.isInternetReachable) {
          // Don't await - let it run in background
          this.processQueue().catch(err => {
            console.error(
              '❌ SyncManager: Error processing startup queue:',
              err,
            );
          });
        } else {
          console.log('📴 SyncManager: Device offline, will sync when online');
        }
      }
    } catch (error) {
      console.error('❌ SyncManager: Failed to start:', error);
    }
  }

  /**
   * Set up network change listener
   * Automatically triggers sync when device comes online
   */
  private setupNetworkListener(): void {
    console.log('📡 SyncManager: Setting up network listener...');

    let wasOffline = false;

    this.networkUnsubscribe = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const isOnline =
          state.isConnected === true &&
          (state.isInternetReachable === true ||
            state.isInternetReachable === null);

        console.log(
          `📡 Network state changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`,
        );

        // Trigger sync when transitioning from offline to online
        if (isOnline && wasOffline && this.config.autoSyncOnline) {
          console.log('🌐 Device came online! Triggering sync...');

          // Process queue in background
          this.processQueue().catch(err => {
            console.error(
              '❌ SyncManager: Error processing queue after coming online:',
              err,
            );
          });
        }

        wasOffline = !isOnline;
      },
    );

    console.log('✅ SyncManager: Network listener active');
  }

  /**
   * Stop the Sync Manager and cleanup
   */
  async stop(): Promise<void> {
    console.log('🛑 SyncManager: Stopping...');
    this.isProcessing = false;
    this.isSyncing = false;
    this.listeners = [];

    // Unsubscribe from network listener
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
      console.log('📡 SyncManager: Network listener cleaned up');
    }

    console.log('✅ SyncManager: Stopped');
  }

  /**
   * Add an action to the offline queue
   *
   * @param operation - The type of operation (CREATE, UPDATE, DELETE, etc.)
   * @param resourceType - The type of resource (assignment, lecture, etc.)
   * @param payload - The data for the mutation
   * @param userId - The ID of the user performing the action
   * @param options - Optional configuration
   * @returns The created offline action
   */
  async addToQueue(
    operation: OfflineOperationType,
    resourceType: OfflineResourceType,
    payload: OfflineActionPayload,
    userId: string,
    options?: AddToQueueOptions,
  ): Promise<OfflineAction> {
    console.log(
      `📝 SyncManager: Adding ${operation} action for ${resourceType} to queue`,
    );

    // Generate a unique ID for this action
    const actionId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine priority based on operation type
    const priority: 'high' | 'normal' | 'low' =
      operation === 'DELETE'
        ? 'high' // Deletions are high priority
        : operation === 'UPDATE'
          ? 'normal' // Updates are normal
          : 'low'; // Creates are low priority (can be retried more easily)

    // Create the offline action
    const action: ExtendedOfflineAction = {
      id: actionId,
      operation,
      resourceType,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
      userId,
      tempId: payload.type === 'CREATE' ? actionId : undefined,
      priority,
    };

    // Add to in-memory queue
    this.queue.push(action);

    // Check queue size limit and evict old low-priority items if needed
    if (this.queue.length > (this.config.maxQueueSize ?? 100)) {
      console.warn(
        '⚠️ SyncManager: Queue size exceeded, evicting old low-priority actions',
      );
      await this.evictOldQueueItems();
    }

    // Persist to AsyncStorage
    await this.saveQueue();

    console.log(
      `✅ SyncManager: Action ${actionId} added to queue (total: ${this.queue.length})`,
    );

    // Notify listeners
    this.notifyListeners();

    // Monitor queue size
    this.monitorQueueSize();

    // Phase 3: Check if online and start sync immediately if requested
    if (options?.syncImmediately !== false) {
      this.syncImmediately().catch(err => {
        console.error('❌ SyncManager: Error in syncImmediately:', err);
        // Don't throw - queue will be processed on next network event
      });
    }

    return action;
  }

  /**
   * Sync immediately if online (Phase 3 implementation)
   * Checks network connectivity and processes queue if online
   */
  async syncImmediately(): Promise<void> {
    try {
      // Check if online
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('📱 SyncManager: Offline, cannot sync immediately');
        return;
      }

      // Check if already syncing
      if (this.isSyncing) {
        console.log('⚠️ SyncManager: Already syncing, skipping immediate sync');
        return;
      }

      // Check if queue has pending items
      const pendingCount = this.queue.filter(a => a.status === 'pending').length;
      if (pendingCount === 0) {
        console.log('✅ SyncManager: No pending items to sync');
        return;
      }

      // Start sync
      console.log(
        `🔄 SyncManager: Starting immediate sync for ${pendingCount} pending items`,
      );
      await this.processQueue();
    } catch (error) {
      console.error('❌ SyncManager: Error in syncImmediately:', error);
      // Don't throw - allow queue to be processed on next network event
    }
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get detailed queue status
   */
  getQueueStatus(): {
    length: number;
    pending: number;
    processing: number;
    failed: number;
  } {
    return {
      length: this.queue.length,
      pending: this.queue.filter(item => item.status === 'pending').length,
      processing: this.queue.filter(item => item.status === 'processing').length,
      failed: this.queue.filter(item => item.status === 'failed').length,
    };
  }

  /**
   * Process the offline queue and sync with server
   *
   * Main sync logic that processes all pending actions in FIFO order:
   * 1. Execute server mutations for each action
   * 2. Handle success: remove from queue, replace temp IDs, update caches
   * 3. Handle failure: increment retry count, handle max retries
   */
  async processQueue(): Promise<SyncResult[]> {
    console.log('🔄 SyncManager: processQueue() called');

    if (this.isProcessing) {
      console.log('⚠️ SyncManager: Already processing queue, skipping');
      return [];
    }

    this.isProcessing = true;
    this.isSyncing = true;

    const results: SyncResult[] = [];

    try {
      // Reload queue from storage to ensure we have latest
      await this.loadQueue();

      const pendingActions = this.queue.filter(a => a.status === 'pending');

      console.log(
        `📊 SyncManager: Found ${this.queue.length} total actions, ${pendingActions.length} pending`,
      );

      if (pendingActions.length === 0) {
        console.log('✅ SyncManager: No pending actions to process');
        return results;
      }

      // Sort queue by priority (high > normal > low), then by timestamp (oldest first)
      const sortedActions = pendingActions.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const aPriority = (a as ExtendedOfflineAction).priority || 'normal';
        const bPriority = (b as ExtendedOfflineAction).priority || 'normal';

        // Sort by priority first
        if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
          return priorityOrder[bPriority] - priorityOrder[aPriority];
        }

        // Then by timestamp (oldest first)
        return a.timestamp - b.timestamp;
      });

      // Process actions in priority order
      for (const action of sortedActions) {
        // Check if this action should be retried (has a scheduled retry time)
        const extendedAction = action as ExtendedOfflineAction;
        const nextRetryAt = extendedAction.nextRetryAt;
        if (nextRetryAt && Date.now() < nextRetryAt) {
          const waitTime = nextRetryAt - Date.now();
          console.log(
            `⏳ Action ${action.id} scheduled for retry in ${waitTime.toFixed(0)}ms, skipping for now`,
          );
          continue; // Skip this action for now, process it later
        }

        // Clear retry time if it exists
        if (nextRetryAt) {
          delete extendedAction.nextRetryAt;
        }

        console.log(
          `\n🔄 Processing action: ${action.operation} ${action.resourceType} (${action.id})`,
        );

        // Update status to syncing
        action.status = 'syncing';
        await this.saveQueue();
        this.notifyListeners();

        try {
          // Execute the server mutation
          const serverResponse = await this.executeServerMutation(action);

          // Success! Handle the successful sync
          console.log(`✅ Action ${action.id} synced successfully`);

          // If this was a CREATE action, we need to handle temp ID replacement
          if (action.operation === 'CREATE' && action.tempId) {
            const response = serverResponse as
              | { id?: string }
              | null
              | undefined;
            if (response?.id) {
              await this.handleTempIdReplacement(
                action.tempId,
                response.id,
                action.resourceType,
              );
            }
          }

          // Remove the action from the queue
          this.queue = this.queue.filter(a => a.id !== action.id);

          // Update cache to reflect server state
          await this.invalidateRelatedCaches(action.resourceType);

          results.push({
            action,
            success: true,
            data: serverResponse,
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ Action ${action.id} failed:`, errorMessage);

          // Check if error is from circuit breaker being open
          const isCircuitBreakerOpen = errorMessage.includes(
            'Circuit breaker is open',
          );

          if (isCircuitBreakerOpen) {
            // Don't increment retry count for circuit breaker errors
            // Just mark as pending and wait for circuit to recover
            action.status = 'pending';
            action.error = errorMessage;
            console.log(
              `⏸️ Action ${action.id} paused due to circuit breaker. Will retry when circuit recovers.`,
            );
          } else {
            // Handle failure normally
            action.retryCount += 1;
            action.error = errorMessage;

            if (action.retryCount >= action.maxRetries) {
              // Max retries reached - mark as failed
              action.status = 'failed';
              console.error(
                `🚫 Action ${action.id} has failed ${action.retryCount} times. Marking as failed.`,
              );
            } else {
              // Reset to pending for next retry
              action.status = 'pending';
              const retryDelay = this.calculateRetryDelay(
                action.retryCount - 1,
              );
              console.log(
                `↩️ Action ${action.id} will be retried (${action.retryCount}/${action.maxRetries}) after ${retryDelay.toFixed(0)}ms`,
              );

              // Store the retry delay in the action for use during processing
              const extendedAction = action as ExtendedOfflineAction;
              extendedAction.nextRetryAt = Date.now() + retryDelay;
            }
          }

          results.push({
            action,
            success: false,
            error: action.error,
          });
        }

        // Save queue after each action
        await this.saveQueue();
        this.notifyListeners();

        // Small delay between actions to avoid overwhelming the server
        await this.delay(100);
      }

      console.log(`\n✅ SyncManager: Processed ${results.length} actions`);
      console.log(`   - Succeeded: ${results.filter(r => r.success).length}`);
      console.log(`   - Failed: ${results.filter(r => !r.success).length}`);
    } catch (error) {
      console.error('❌ SyncManager: Error processing queue:', error);
    } finally {
      this.isProcessing = false;
      this.isSyncing = false;
      this.notifyListeners();
    }

    return results;
  }

  /**
   * Get statistics about the current queue
   */
  getQueueStats(): QueueStats {
    const pending = this.queue.filter(a => a.status === 'pending').length;
    const syncing = this.queue.filter(a => a.status === 'syncing').length;
    const failed = this.queue.filter(a => a.status === 'failed').length;
    const oldestTimestamp =
      this.queue.length > 0
        ? Math.min(...this.queue.map(a => a.timestamp))
        : undefined;

    return {
      total: this.queue.length,
      pending,
      syncing,
      failed,
      oldestTimestamp,
    };
  }

  /**
   * Get all actions in the queue
   */
  getQueue(): OfflineAction[] {
    return [...this.queue];
  }

  /**
   * Clear all actions from the queue (useful for testing or manual cleanup)
   */
  async clearQueue(): Promise<void> {
    console.log('🗑️ SyncManager: Clearing queue...');
    this.queue = [];
    await this.saveQueue();
    this.notifyListeners();
    console.log('✅ SyncManager: Queue cleared');
  }

  /**
   * Remove a specific action from the queue by ID
   */
  async removeAction(actionId: string): Promise<void> {
    console.log(`🗑️ SyncManager: Removing action ${actionId} from queue`);
    this.queue = this.queue.filter(a => a.id !== actionId);
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Subscribe to queue changes
   * Returns an unsubscribe function
   */
  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.push(listener);

    // Immediately notify the listener of the current state
    listener(this.getQueueStats());

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Check if the manager is currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Update the sync manager configuration
   */
  async updateConfig(config: Partial<SyncManagerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfig();
    console.log('✅ SyncManager: Configuration updated', this.config);
  }

  // ========== Private Helper Methods ==========

  /**
   * Load the queue from AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(
          `📂 SyncManager: Loaded ${this.queue.length} actions from storage`,
        );
      }
    } catch (error) {
      console.error(
        '❌ SyncManager: Failed to load queue from storage:',
        error,
      );
      this.queue = [];
    }
  }

  /**
   * Save the queue to AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('❌ SyncManager: Failed to save queue to storage:', error);
    }
  }

  /**
   * Load configuration from AsyncStorage
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        console.log('📂 SyncManager: Loaded configuration from storage');
      }
    } catch (error) {
      console.error(
        '❌ SyncManager: Failed to load config from storage:',
        error,
      );
    }
  }

  /**
   * Save configuration to AsyncStorage
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('❌ SyncManager: Failed to save config to storage:', error);
    }
  }

  /**
   * Notify all listeners about queue changes
   */
  private notifyListeners(): void {
    const stats = this.getQueueStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('❌ SyncManager: Error notifying listener:', error);
      }
    });
  }

  /**
   * Execute the appropriate server mutation for an action
   * Returns the server response
   * Protected by circuit breaker to prevent cascading failures
   */
  private async executeServerMutation(action: OfflineAction): Promise<unknown> {
    console.log(
      `🌐 Executing ${action.operation} ${action.resourceType} on server...`,
    );

    return await this.circuitBreaker.execute(async () => {
      const { operation, resourceType, payload } = action;

      switch (operation) {
        case 'CREATE':
          return await this.executeCreate(resourceType, payload);

        case 'UPDATE':
          return await this.executeUpdate(resourceType, payload);

        case 'DELETE':
          return await this.executeDelete(resourceType, payload);

        case 'RESTORE':
          return await this.executeRestore(resourceType, payload);

        case 'COMPLETE':
          return await this.executeComplete(resourceType, payload);

        case 'BATCH_DELETE':
        case 'BATCH_RESTORE':
          return await this.executeBatch(operation, payload);

        default:
          throw new Error(`Unknown operation type: ${operation}`);
      }
    });
  }

  /**
   * Execute CREATE mutation
   */
  private async executeCreate(
    resourceType: OfflineResourceType,
    payload: OfflineActionPayload,
  ): Promise<unknown> {
    if (payload.type !== 'CREATE') {
      throw new Error('Invalid payload type for CREATE operation');
    }

    const createPayload = payload as {
      type: 'CREATE';
      data: Record<string, unknown>;
    };
    const functionName = `create-${resourceType.replace('_', '-')}`;
    console.log(`  → Calling ${functionName}...`);

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: createPayload.data,
    });

    if (error) throw new Error(error.message || 'Create operation failed');
    return data;
  }

  /**
   * Execute UPDATE mutation
   */
  private async executeUpdate(
    resourceType: OfflineResourceType,
    payload: OfflineActionPayload,
  ): Promise<unknown> {
    if (payload.type !== 'UPDATE') {
      throw new Error('Invalid payload type for UPDATE operation');
    }

    // Support both old format (resourceId/updates) and new format (id/data)
    const updatePayload = payload as {
      type: 'UPDATE';
      resourceId?: string;
      id?: string;
      updates?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };
    
    // Use new format (id/data) if available, fallback to old format (resourceId/updates)
    const resourceId = this.resolveId(updatePayload.id || updatePayload.resourceId || '');
    const updates = updatePayload.data || updatePayload.updates || {};
    
    // Validate that we have both ID and updates
    if (!resourceId) {
      throw new Error('UPDATE payload must include either "id" or "resourceId"');
    }
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('UPDATE payload must include either "data" or "updates"');
    }
    
    const functionName = `update-${resourceType.replace('_', '-')}`;
    console.log(`  → Calling ${functionName} for ${resourceId}...`);

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        [`${resourceType}Id`]: resourceId,
        ...updates, // Spread updates directly instead of wrapping in 'updates' key
      },
    });

    if (error) throw new Error(error.message || 'Update operation failed');
    return data;
  }

  /**
   * Execute DELETE mutation
   */
  private async executeDelete(
    resourceType: OfflineResourceType,
    payload: OfflineActionPayload,
  ): Promise<unknown> {
    if (payload.type !== 'DELETE') {
      throw new Error('Invalid payload type for DELETE operation');
    }

    const deletePayload = payload as { type: 'DELETE'; resourceId: string };
    const resourceId = this.resolveId(deletePayload.resourceId);
    const functionName = `delete-${resourceType.replace('_', '-')}`;
    console.log(`  → Calling ${functionName} for ${resourceId}...`);

    const { error } = await supabase.functions.invoke(functionName, {
      body: { [`${resourceType}Id`]: resourceId },
    });

    if (error) throw new Error(error.message || 'Delete operation failed');
    return { success: true };
  }

  /**
   * Execute RESTORE mutation
   */
  private async executeRestore(
    resourceType: OfflineResourceType,
    payload: OfflineActionPayload,
  ): Promise<unknown> {
    if (payload.type !== 'RESTORE') {
      throw new Error('Invalid payload type for RESTORE operation');
    }

    const restorePayload = payload as { type: 'RESTORE'; resourceId: string };
    const resourceId = this.resolveId(restorePayload.resourceId);
    const functionName = `restore-${resourceType.replace('_', '-')}`;
    console.log(`  → Calling ${functionName} for ${resourceId}...`);

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { [`${resourceType}Id`]: resourceId },
    });

    if (error) throw new Error(error.message || 'Restore operation failed');
    return data;
  }

  /**
   * Execute COMPLETE mutation
   */
  private async executeComplete(
    resourceType: OfflineResourceType,
    payload: OfflineActionPayload,
  ): Promise<unknown> {
    if (payload.type !== 'COMPLETE') {
      throw new Error('Invalid payload type for COMPLETE operation');
    }

    const completePayload = payload as { type: 'COMPLETE'; resourceId: string };
    const resourceId = this.resolveId(completePayload.resourceId);
    const functionName = `update-${resourceType.replace('_', '-')}`;
    console.log(
      `  → Calling ${functionName} to mark ${resourceId} as complete...`,
    );

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        [`${resourceType}Id`]: resourceId,
        updates: { status: 'completed' },
      },
    });

    if (error) throw new Error(error.message || 'Complete operation failed');
    return data;
  }

  /**
   * Execute BATCH mutation
   */
  private async executeBatch(
    operation: 'BATCH_DELETE' | 'BATCH_RESTORE',
    payload: OfflineActionPayload,
  ): Promise<unknown> {
    if (payload.type !== 'BATCH') {
      throw new Error('Invalid payload type for BATCH operation');
    }

    // Resolve any temp IDs in the batch items
    const batchPayload = payload as {
      type: 'BATCH';
      items: Array<{ id: string; type: string }>;
    };
    const resolvedItems = batchPayload.items.map(item => ({
      id: this.resolveId(item.id),
      type: item.type,
    }));

    console.log(
      `  → Calling batch-action for ${resolvedItems.length} items...`,
    );

    const { data, error } = await supabase.functions.invoke('batch-action', {
      body: {
        action: payload.action,
        items: resolvedItems,
      },
    });

    if (error) throw new Error(error.message || 'Batch operation failed');
    return data;
  }

  /**
   * Resolve an ID (replace temp ID with real ID if mapping exists)
   */
  private resolveId(id: string): string {
    if (isTempId(id) && this.idMapping.has(id)) {
      const realId = this.idMapping.get(id)!;
      console.log(`  🔄 Resolved temp ID ${id} → ${realId}`);
      return realId;
    }
    return id;
  }

  /**
   * Public method to resolve a temp ID to a real ID
   * Used by external code to check if a temp ID has been synced
   */
  public resolveTempId(id: string): string {
    return this.resolveId(id);
  }

  /**
   * Handle temporary ID replacement after successful CREATE
   * Maps temp ID to real ID and updates all references in queue and cache
   */
  private async handleTempIdReplacement(
    tempId: string,
    realId: string,
    resourceType: OfflineResourceType,
  ): Promise<void> {
    console.log(`🔄 Replacing temp ID ${tempId} with real ID ${realId}`);

    // Store the mapping
    this.idMapping.set(tempId, realId);
    await this.saveIdMapping();

    // Update any subsequent actions in the queue that reference this temp ID
    this.queue.forEach(action => {
      if (action.status === 'pending') {
        // Check if payload contains the temp ID and replace it
        if (action.payload.type === 'UPDATE') {
          const updatePayload = action.payload as {
            type: 'UPDATE';
            id?: string;
            resourceId?: string;
            data?: Record<string, any>;
            updates?: Record<string, any>;
          };
          
          // Check both new format (id) and old format (resourceId)
          if (updatePayload.id === tempId) {
            updatePayload.id = realId;
            console.log(`  ↪️ Updated UPDATE action to use real ID (new format)`);
          } else if (updatePayload.resourceId === tempId) {
            updatePayload.resourceId = realId;
            console.log(`  ↪️ Updated UPDATE action to use real ID (old format)`);
          }
        } else if (
          action.payload.type === 'DELETE' &&
          action.payload.resourceId === tempId
        ) {
          action.payload.resourceId = realId;
          console.log(`  ↪️ Updated DELETE action to use real ID`);
        } else if (
          action.payload.type === 'COMPLETE' &&
          action.payload.resourceId === tempId
        ) {
          action.payload.resourceId = realId;
          console.log(`  ↪️ Updated COMPLETE action to use real ID`);
        } else if (action.payload.type === 'BATCH') {
          // Update batch items
          const batchPayload = action.payload as {
            type: 'BATCH';
            items: Array<{ id: string; type: string }>;
          };
          batchPayload.items = batchPayload.items.map(item => ({
            ...item,
            id: item.id === tempId ? realId : item.id,
          }));
        }
      }
    });

    await this.saveQueue();

    console.log(`✅ Temp ID replacement complete for ${tempId}`);
  }

  /**
   * Invalidate React Query and AsyncStorage caches for a resource type
   */
  private async invalidateRelatedCaches(
    resourceType: OfflineResourceType,
  ): Promise<void> {
    // Clear AsyncStorage caches
    switch (resourceType) {
      case 'assignment':
        await cache.remove('assignments');
        await cache.remove('homeScreenData');
        break;
      case 'lecture':
        await cache.remove('lectures');
        await cache.remove('homeScreenData');
        break;
      case 'study_session':
        await cache.remove('studySessions');
        await cache.remove('homeScreenData');
        break;
      case 'course':
        await cache.remove('courses:all');
        await cache.remove('homeScreenData');
        break;
    }

    console.log(`  🗑️ Cleared caches for ${resourceType}`);
  }

  /**
   * Load ID mapping from AsyncStorage
   */
  private async loadIdMapping(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ID_MAPPING_KEY);
      if (stored) {
        const mappingArray: [string, string][] = JSON.parse(stored);
        this.idMapping = new Map(mappingArray);
        console.log(
          `📂 SyncManager: Loaded ${this.idMapping.size} ID mappings`,
        );
      }
    } catch (error) {
      console.error('❌ SyncManager: Failed to load ID mapping:', error);
      this.idMapping = new Map();
    }
  }

  /**
   * Save ID mapping to AsyncStorage
   */
  private async saveIdMapping(): Promise<void> {
    try {
      const mappingArray = Array.from(this.idMapping.entries());
      await AsyncStorage.setItem(ID_MAPPING_KEY, JSON.stringify(mappingArray));
    } catch (error) {
      console.error('❌ SyncManager: Failed to save ID mapping:', error);
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * @param attemptIndex - Zero-based attempt index (0 = first retry)
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attemptIndex: number): number {
    const baseDelay = this.config.retryDelay * Math.pow(2, attemptIndex); // Exponential backoff
    const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1); // ±20% jitter
    const delay = baseDelay + jitter;
    // Cap at 30 seconds max delay
    return Math.min(Math.max(delay, this.config.retryDelay), 30000);
  }

  /**
   * Evict old queue items (older than 7 days, prioritizing low-priority items)
   */
  private async evictOldQueueItems(): Promise<void> {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    // First, remove items older than maxAge (starting with low priority)
    const oldItems = this.queue.filter(action => {
      const age = now - action.timestamp;
      return age > maxAge;
    });

    // Sort old items by priority (low first, then normal, then high)
    oldItems.sort((a, b) => {
      const priorityOrder = { low: 1, normal: 2, high: 3 };
      const aPriority = (a as ExtendedOfflineAction).priority || 'normal';
      const bPriority = (b as ExtendedOfflineAction).priority || 'normal';
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });

    // Remove old items (keep high priority items even if old)
    for (const item of oldItems) {
      const priority = (item as ExtendedOfflineAction).priority || 'normal';
      if (
        priority === 'low' ||
        (priority === 'normal' &&
          this.queue.length > this.config.maxQueueSize! * 1.2)
      ) {
        this.queue = this.queue.filter(a => a.id !== item.id);
        console.log(
          `🗑️ Evicted old queue item: ${item.id} (age: ${Math.floor((now - item.timestamp) / (24 * 60 * 60 * 1000))} days)`,
        );
      }
    }

    // If still over limit, remove oldest low-priority items
    if (this.queue.length > this.config.maxQueueSize!) {
      const lowPriorityItems = this.queue
        .filter(
          a => ((a as ExtendedOfflineAction).priority || 'normal') === 'low',
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      const toRemove = this.queue.length - this.config.maxQueueSize!;
      for (let i = 0; i < toRemove && i < lowPriorityItems.length; i++) {
        this.queue = this.queue.filter(a => a.id !== lowPriorityItems[i].id);
        console.log(
          `🗑️ Evicted low-priority queue item: ${lowPriorityItems[i].id}`,
        );
      }
    }

    await this.saveQueue();
  }

  /**
   * Monitor queue size and alert if approaching limit
   */
  private monitorQueueSize(): void {
    const threshold = (this.config.maxQueueSize ?? 100) * 0.8; // 80% of max
    if (this.queue.length > threshold) {
      console.warn(
        `⚠️ SyncManager: Queue size approaching limit: ${this.queue.length}/${this.config.maxQueueSize ?? 100}`,
      );

      // Send analytics event (sampled)
      if (Math.random() < 0.1) {
        // 10% sampling
        try {
          const { analyticsService } = require('@/services/analytics');
          analyticsService.track('sync_queue_size_warning', {
            queueSize: this.queue.length,
            maxSize: this.config.maxQueueSize ?? 100,
            percentage:
              (this.queue.length / (this.config.maxQueueSize ?? 100)) * 100,
          });
        } catch (error) {
          // Silently fail
        }
      }
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance of the Sync Manager
 */
export const syncManager = new SyncManager();

/**
 * Export the class for testing purposes
 */
export { SyncManager };
