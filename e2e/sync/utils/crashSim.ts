/**
 * Crash Simulation Utilities for E2E Recovery Tests
 * 
 * Provides utilities to simulate app crashes and validate recovery behavior
 */

import { device } from 'detox';

/**
 * Simulates a forced app termination (crash)
 */
export async function simulateCrash(): Promise<void> {
  console.log('💥 Simulating app crash...');
  await device.terminateApp();
  // Wait a moment to simulate crash state
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Simulates crash during operation with state capture
 */
export async function crashMidOperation<T>(
  operation: () => Promise<T>,
  captureState?: () => Promise<any>
): Promise<{ stateBeforeCrash: any | null; crashed: boolean }> {
  let stateBeforeCrash: any | null = null;
  
  try {
    // Capture state before crash (if provided)
    if (captureState) {
      stateBeforeCrash = await captureState();
    }
    
    // Start operation
    const operationPromise = operation();
    
    // Wait a bit, then crash
    await new Promise(resolve => setTimeout(resolve, 100));
    await simulateCrash();
    
    // Wait for operation (which will fail due to crash)
    try {
      await operationPromise;
    } catch (error) {
      // Expected - operation interrupted by crash
    }
    
    return { stateBeforeCrash, crashed: true };
  } catch (error) {
    console.warn('⚠️ Crash simulation error:', error);
    return { stateBeforeCrash, crashed: false };
  }
}

/**
 * Restart app after crash simulation
 */
export async function restartAfterCrash(): Promise<void> {
  console.log('🔄 Restarting app after crash...');
  await device.launchApp({ newInstance: false }); // Relaunch existing app
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for initialization
}

/**
 * Simulate crash during sync operation
 */
export async function crashDuringSync(
  syncOperation: () => Promise<void>
): Promise<void> {
  console.log('💥 Simulating crash during sync...');
  
  // Start sync
  const syncPromise = syncOperation();
  
  // Wait briefly, then crash
  await new Promise(resolve => setTimeout(resolve, 200));
  await simulateCrash();
  
  // Sync will be interrupted (handled by try/catch in operation)
  try {
    await syncPromise;
  } catch (error) {
    // Expected - sync interrupted
  }
}

/**
 * Measure recovery time after crash
 */
export async function measureRecoveryTime<T>(
  recoveryOperation: () => Promise<T>
): Promise<{ result: T; recoveryTime: number }> {
  const startTime = Date.now();
  const result = await recoveryOperation();
  const recoveryTime = Date.now() - startTime;
  
  return { result, recoveryTime };
}

/**
 * Validate no duplicate operations after recovery
 */
export interface OperationLog {
  operationId: string;
  timestamp: number;
  type: string;
}

class OperationTracker {
  private operations: Map<string, OperationLog[]> = new Map();
  
  logOperation(operationId: string, type: string): void {
    if (!this.operations.has(operationId)) {
      this.operations.set(operationId, []);
    }
    this.operations.get(operationId)!.push({
      operationId,
      timestamp: Date.now(),
      type,
    });
  }
  
  getOperationCount(operationId: string): number {
    return this.operations.get(operationId)?.length || 0;
  }
  
  getDuplicates(): Array<{ operationId: string; count: number }> {
    const duplicates: Array<{ operationId: string; count: number }> = [];
    for (const [operationId, logs] of this.operations.entries()) {
      if (logs.length > 1) {
        duplicates.push({ operationId, count: logs.length });
      }
    }
    return duplicates;
  }
  
  reset(): void {
    this.operations.clear();
  }
}

export const operationTracker = new OperationTracker();

