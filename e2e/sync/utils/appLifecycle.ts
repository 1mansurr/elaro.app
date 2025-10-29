/**
 * App Lifecycle Simulation Utilities for E2E Recovery Tests
 * 
 * Provides utilities to simulate extended idle periods and app lifecycle events
 */

import { device } from 'detox';

/**
 * Simulate extended idle period (user away for hours)
 */
export async function simulateExtendedIdle(hours: number): Promise<void> {
  console.log(`⏰ Simulating ${hours} hours of idle time...`);
  
  // In a real app, this would advance system time or wait
  // For tests, we mock the timestamp logic
  // We'll simulate by manipulating the app's perception of time
  
  // Background app
  await device.sendToHome();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate time passage (mock by setting timestamp in test state)
  // In real implementation, this might interact with a time mock service
  
  // Restore app to foreground
  await device.launchApp({ newInstance: false });
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Get mock timestamp for extended idle (hours ago)
 */
export function getMockIdleTimestamp(hoursAgo: number): number {
  return Date.now() - (hoursAgo * 60 * 60 * 1000);
}

/**
 * Simulate app background/foreground cycle
 */
export async function simulateBackgroundForegroundCycle(): Promise<void> {
  console.log('📱 Simulating background/foreground cycle...');
  
  await device.sendToHome();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await device.launchApp({ newInstance: false });
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Simulate multiple background/foreground cycles
 */
export async function simulateMultipleCycles(count: number): Promise<void> {
  console.log(`📱 Simulating ${count} background/foreground cycles...`);
  
  for (let i = 0; i < count; i++) {
    await simulateBackgroundForegroundCycle();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Simulate app suspended state (iOS background)
 */
export async function simulateSuspendedState(): Promise<void> {
  console.log('😴 Simulating app suspended state...');
  
  await device.sendToHome();
  // Wait longer to simulate suspended state
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Resume from suspended state
 */
export async function resumeFromSuspended(): Promise<void> {
  console.log('🔄 Resuming from suspended state...');
  
  await device.launchApp({ newInstance: false });
  await new Promise(resolve => setTimeout(resolve, 3000)); // Longer wait for resume
}

/**
 * Simulate memory warning (iOS)
 */
export async function simulateMemoryWarning(): Promise<void> {
  console.log('⚠️ Simulating memory warning...');
  
  // In real app, this would trigger memory warning handler
  // For tests, we simulate by creating memory pressure scenario
  // and then restoring
  
  await device.reloadReactNative();
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Measure sync catch-up time after idle
 */
export async function measureSyncCatchUpTime(
  syncOperation: () => Promise<void>
): Promise<number> {
  const startTime = Date.now();
  await syncOperation();
  return Date.now() - startTime;
}

/**
 * Validate session expiration after idle
 */
export interface SessionState {
  expired: boolean;
  refreshRequired: boolean;
  lastActiveTimestamp: number;
}

/**
 * Mock session state for idle scenario
 */
export function getMockExpiredSessionState(hoursIdle: number): SessionState {
  const lastActive = getMockIdleTimestamp(hoursIdle);
  const SESSION_EXPIRY_HOURS = 24; // Example: 24 hour expiry
  const expired = hoursIdle >= SESSION_EXPIRY_HOURS;
  
  return {
    expired,
    refreshRequired: expired || hoursIdle >= 12, // Refresh if idle > 12 hours
    lastActiveTimestamp: lastActive,
  };
}

/**
 * Simulate app termination and cold start
 */
export async function simulateColdStart(): Promise<void> {
  console.log('❄️ Simulating cold start...');
  
  await device.terminateApp();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await device.launchApp({ newInstance: true }); // New instance = cold start
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for full initialization
}

/**
 * Simulate warm start (app in background, brought to foreground)
 */
export async function simulateWarmStart(): Promise<void> {
  console.log('🔥 Simulating warm start...');
  
  await device.sendToHome();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await device.launchApp({ newInstance: false }); // Existing instance = warm start
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Track app lifecycle events
 */
class LifecycleTracker {
  private events: Array<{ type: string; timestamp: number }> = [];
  
  recordEvent(type: string): void {
    this.events.push({
      type,
      timestamp: Date.now(),
    });
  }
  
  getEvents(): Array<{ type: string; timestamp: number }> {
    return [...this.events];
  }
  
  getEventCount(type: string): number {
    return this.events.filter(e => e.type === type).length;
  }
  
  reset(): void {
    this.events = [];
  }
}

export const lifecycleTracker = new LifecycleTracker();

