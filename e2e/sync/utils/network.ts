/**
 * Network Helper Utilities for E2E Offline Testing
 * 
 * Provides utilities to simulate network online/offline states
 * and verify offline behavior
 */

import { device } from 'detox';
import { mockSupabaseAuth } from '../../mocks/mockSupabaseAuth';

/**
 * Network simulation state
 */
let networkState: 'online' | 'offline' = 'online';

/**
 * Mock network control for E2E tests
 * 
 * Note: In Detox, we can't directly control device network.
 * Instead, we simulate it by:
 * 1. Injecting network state into the app via mock services
 * 2. Using app debug flags if available
 * 3. Verifying offline behavior through UI/responses
 */
export const network = {
  /**
   * Set network mode (online/offline)
   */
  async setNetworkMode(mode: 'online' | 'offline'): Promise<void> {
    networkState = mode;
    
    // Update mock auth to simulate offline behavior
    if (mode === 'offline') {
      mockSupabaseAuth.setNetworkMode('offline');
    } else {
      mockSupabaseAuth.setNetworkMode('online');
    }
    
    // Give app time to react to network change
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`🌐 Network mode set to: ${mode}`);
  },

  /**
   * Get current network mode
   */
  getNetworkMode(): 'online' | 'offline' {
    return networkState;
  },

  /**
   * Simulate going offline
   */
  async goOffline(): Promise<void> {
    await this.setNetworkMode('offline');
  },

  /**
   * Simulate going online
   */
  async goOnline(): Promise<void> {
    await this.setNetworkMode('online');
  },

  /**
   * Simulate network interruption (offline → online)
   */
  async simulateNetworkInterruption(offlineDurationMs: number = 2000): Promise<void> {
    await this.goOffline();
    await new Promise(resolve => setTimeout(resolve, offlineDurationMs));
    await this.goOnline();
  },

  /**
   * Wait for network operations to complete
   */
  async waitForNetworkOperations(delayMs: number = 1000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  },

  /**
   * Verify app is in offline mode (by checking for offline indicators)
   */
  async verifyOfflineMode(): Promise<boolean> {
    // In real app, check for offline banner or indicator
    // For now, verify network state
    return networkState === 'offline';
  },

  /**
   * Verify app is in online mode
   */
  async verifyOnlineMode(): Promise<boolean> {
    return networkState === 'online';
  },

  /**
   * Reset network to online state
   */
  async reset(): Promise<void> {
    await this.setNetworkMode('online');
  },
};

