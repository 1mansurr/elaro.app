/**
 * Cache Mutation Utilities for E2E Recovery Tests
 * 
 * Provides utilities to corrupt local cache and validate self-healing behavior
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage keys used by sync services
 */
const SYNC_STORAGE_KEYS = [
  '@elaro_auth_state_v1',
  '@elaro_navigation_state_v1',
  '@elaro_active_session_v1',
  '@elaro_srs_queue_v1',
  '@elaro_settings_cache_v1',
  '@elaro_settings_pending_v1',
  '@elaro_sync_queue',
];

/**
 * Corrupt a specific storage key with invalid JSON
 */
export async function corruptStorageKey(key: string, corruptionType: 'invalid-json' | 'empty' | 'malformed' = 'invalid-json'): Promise<void> {
  console.log(`🔧 Corrupting storage key: ${key} (type: ${corruptionType})`);
  
  switch (corruptionType) {
    case 'invalid-json':
      await AsyncStorage.setItem(key, '{{invalid json{{');
      break;
    case 'empty':
      await AsyncStorage.setItem(key, '');
      break;
    case 'malformed':
      await AsyncStorage.setItem(key, '{version:"",invalid}');
      break;
  }
}

/**
 * Corrupt all sync-related storage keys
 */
export async function corruptAllSyncStorage(): Promise<void> {
  console.log('🔧 Corrupting all sync storage keys...');
  
  for (const key of SYNC_STORAGE_KEYS) {
    await corruptStorageKey(key, 'invalid-json');
  }
}

/**
 * Corrupt specific key with random data
 */
export async function corruptWithRandomData(key: string): Promise<void> {
  const randomData = Math.random().toString(36).substring(7);
  await AsyncStorage.setItem(key, randomData);
}

/**
 * Remove a specific storage key (simulate missing cache)
 */
export async function removeStorageKey(key: string): Promise<void> {
  console.log(`🗑️ Removing storage key: ${key}`);
  await AsyncStorage.removeItem(key);
}

/**
 * Remove all sync-related storage keys
 */
export async function clearAllSyncStorage(): Promise<void> {
  console.log('🗑️ Clearing all sync storage keys...');
  
  for (const key of SYNC_STORAGE_KEYS) {
    await AsyncStorage.removeItem(key);
  }
  
  // Also clear SecureStore items
  try {
    await SecureStore.deleteItemAsync('auth_session_token');
  } catch (error) {
    // Ignore if doesn't exist
  }
}

/**
 * Corrupt cache with version mismatch
 */
export async function corruptCacheVersion(key: string): Promise<void> {
  const corruptedData = JSON.stringify({
    version: 'invalid_version_v999',
    data: { test: 'corrupted' },
  });
  await AsyncStorage.setItem(key, corruptedData);
}

/**
 * Simulate partial cache (some keys present, some missing)
 */
export async function simulatePartialCache(presentKeys: string[]): Promise<void> {
  console.log(`🔧 Simulating partial cache (${presentKeys.length} keys present)...`);
  
  // Clear all first
  await clearAllSyncStorage();
  
  // Set only specified keys with valid (empty) structure
  for (const key of presentKeys) {
    await AsyncStorage.setItem(key, JSON.stringify({ version: 'v1', data: {} }));
  }
}

/**
 * Get storage key value (for validation)
 */
export async function getStorageValue(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`⚠️ Failed to read storage key ${key}:`, error);
    return null;
  }
}

/**
 * Verify storage key is valid JSON
 */
export async function verifyStorageIntegrity(key: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return false; // Missing is considered invalid for sync keys
    
    JSON.parse(value); // Will throw if invalid JSON
    return true;
  } catch (error) {
    return false; // Invalid JSON or missing
  }
}

/**
 * Verify all sync storage keys are intact
 */
export async function verifyAllStorageIntegrity(): Promise<{
  total: number;
  valid: number;
  invalid: string[];
}> {
  const invalid: string[] = [];
  let valid = 0;
  
  for (const key of SYNC_STORAGE_KEYS) {
    const isValid = await verifyStorageIntegrity(key);
    if (isValid) {
      valid++;
    } else {
      invalid.push(key);
    }
  }
  
  return {
    total: SYNC_STORAGE_KEYS.length,
    valid,
    invalid,
  };
}

/**
 * Restore valid cache structure (for recovery validation)
 */
export async function restoreValidCacheStructure(): Promise<void> {
  console.log('🔧 Restoring valid cache structure...');
  
  // Restore with valid empty structures
  const validStructures: Record<string, any> = {
    '@elaro_auth_state_v1': { version: 'v1', userId: null, lastSyncedAt: 0 },
    '@elaro_navigation_state_v1': { version: 'v1', state: null, savedAt: Date.now() },
    '@elaro_active_session_v1': null, // Can be null
    '@elaro_srs_queue_v1': [],
    '@elaro_settings_cache_v1': { version: 'v1', lastSyncedAt: 0 },
    '@elaro_settings_pending_v1': [],
    '@elaro_sync_queue': [],
  };
  
  for (const [key, value] of Object.entries(validStructures)) {
    if (value !== null) {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
}

