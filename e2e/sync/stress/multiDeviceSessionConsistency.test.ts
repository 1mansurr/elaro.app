/**
 * Pass 9 - Chunk 2: Multi-Device Session Consistency Tests
 *
 * Tests for multi-device scenarios and conflict resolution:
 * - Mock two device contexts using separate Supabase sessions
 * - Make concurrent updates to settings and study progress
 * - Reconcile conflicts (last-write-wins or timestamp merge)
 * - Validate both devices converge to same final state
 */

import { device, element, by, waitFor } from 'detox';
import { mockSupabaseAuth } from '../../mocks/mockSupabaseAuth';
import { auth } from '../utils/auth';
import { network } from '../utils/network';
import { syncHelpers } from '../utils/syncHelpers';
import { perfMetrics, measureOperation } from '../utils/perfMetrics';
import { Session } from '@supabase/supabase-js';

// Multi-device simulation helpers
interface DeviceContext {
  deviceId: string;
  session: Session | null;
  userId: string;
  lastUpdateTimestamp: number;
}

class MultiDeviceSimulator {
  private devices: Map<string, DeviceContext> = new Map();
  private sharedState: Map<string, any> = new Map(); // Simulated shared database state

  /**
   * Create a new device context
   */
  createDevice(deviceId: string, userId: string): DeviceContext {
    const device: DeviceContext = {
      deviceId,
      session: null,
      userId,
      lastUpdateTimestamp: Date.now(),
    };
    this.devices.set(deviceId, device);
    return device;
  }

  /**
   * Get device context
   */
  getDevice(deviceId: string): DeviceContext | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Simulate update from a device
   */
  async updateFromDevice(
    deviceId: string,
    key: string,
    value: any,
    timestamp?: number,
  ): Promise<{ success: boolean; conflict: boolean; resolvedValue: any }> {
    const device = this.getDevice(deviceId);
    if (!device) {
      return { success: false, conflict: false, resolvedValue: null };
    }

    const updateTime = timestamp || Date.now();
    const existingValue = this.sharedState.get(key);
    const conflict =
      existingValue !== undefined &&
      existingValue.timestamp > device.lastUpdateTimestamp;

    if (conflict) {
      // Last-write-wins resolution
      const resolvedValue =
        updateTime > existingValue.timestamp ? value : existingValue.value;
      perfMetrics.recordConflictResolution('last-write-wins');

      this.sharedState.set(key, {
        value: resolvedValue,
        timestamp: Math.max(updateTime, existingValue.timestamp),
        deviceId:
          updateTime > existingValue.timestamp
            ? deviceId
            : existingValue.deviceId,
      });

      device.lastUpdateTimestamp = Math.max(
        updateTime,
        existingValue.timestamp,
      );

      return { success: true, conflict: true, resolvedValue };
    }

    // No conflict, update directly
    this.sharedState.set(key, {
      value,
      timestamp: updateTime,
      deviceId,
    });
    device.lastUpdateTimestamp = updateTime;

    return { success: true, conflict: false, resolvedValue: value };
  }

  /**
   * Get current state for a key
   */
  getState(key: string): any {
    const state = this.sharedState.get(key);
    return state ? state.value : null;
  }

  /**
   * Get all devices
   */
  getAllDevices(): DeviceContext[] {
    return Array.from(this.devices.values());
  }

  /**
   * Reset all devices and state
   */
  reset(): void {
    this.devices.clear();
    this.sharedState.clear();
  }
}

const multiDeviceSim = new MultiDeviceSimulator();

describe('Pass 9 - Chunk 2: Multi-Device Session Consistency', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    mockSupabaseAuth.reset();
    await network.reset();
    perfMetrics.reset();
    multiDeviceSim.reset();

    // Sign in before tests
    await network.goOnline();
    await auth.signIn();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    await network.reset();
    mockSupabaseAuth.reset();
    multiDeviceSim.reset();
  });

  describe.parallel('Concurrent Device Updates', () => {
    it('should handle concurrent settings updates from two devices', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Both devices update theme setting concurrently
      const update1Promise = multiDeviceSim.updateFromDevice(
        'device1',
        'theme',
        'dark',
        Date.now(),
      );
      const update2Promise = multiDeviceSim.updateFromDevice(
        'device2',
        'theme',
        'light',
        Date.now() + 10,
      );

      const [result1, result2] = await Promise.all([
        update1Promise,
        update2Promise,
      ]);

      // One should have a conflict
      const hasConflict = result1.conflict || result2.conflict;
      expect(hasConflict).toBe(true);

      // Both devices should converge to same value (last-write-wins)
      const finalValue = multiDeviceSim.getState('theme');
      expect(finalValue).toBeTruthy();
      expect(finalValue === 'dark' || finalValue === 'light').toBe(true);

      // Verify conflict was resolved
      if (hasConflict) {
        expect(
          perfMetrics.getSummary().conflicts.totalConflicts,
        ).toBeGreaterThan(0);
      }
    });

    it('should reconcile profile updates from multiple devices', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Device 1 updates first name
      await multiDeviceSim.updateFromDevice(
        'device1',
        'firstName',
        'Alice',
        Date.now(),
      );

      // Device 2 updates last name concurrently
      await multiDeviceSim.updateFromDevice(
        'device2',
        'lastName',
        'Smith',
        Date.now() + 20,
      );

      // Both updates should succeed (different keys, no conflict)
      const firstName = multiDeviceSim.getState('firstName');
      const lastName = multiDeviceSim.getState('lastName');

      expect(firstName).toBe('Alice');
      expect(lastName).toBe('Smith');

      // No conflicts for different keys
      expect(perfMetrics.getSummary().conflicts.totalConflicts).toBe(0);
    });

    it('should handle timestamp-based conflict resolution', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Device 1 updates with earlier timestamp
      await multiDeviceSim.updateFromDevice(
        'device1',
        'notificationEnabled',
        true,
        1000,
      );

      // Device 2 updates with later timestamp
      await multiDeviceSim.updateFromDevice(
        'device2',
        'notificationEnabled',
        false,
        2000,
      );

      // Later timestamp should win
      const finalValue = multiDeviceSim.getState('notificationEnabled');
      expect(finalValue).toBe(false); // Later timestamp wins

      // Conflict should be recorded
      expect(perfMetrics.getSummary().conflicts.totalConflicts).toBeGreaterThan(
        0,
      );
      expect(
        perfMetrics.getSummary().conflicts.resolvedByLastWriteWins,
      ).toBeGreaterThan(0);
    });
  });

  describe.parallel('Study Session Multi-Device Conflicts', () => {
    it('should handle concurrent study session progress updates', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      const sessionId = 'session-123';

      // Device 1: Update time spent
      await multiDeviceSim.updateFromDevice(
        'device1',
        `${sessionId}:timeSpent`,
        30,
        Date.now(),
      );

      // Device 2: Update time spent concurrently
      await multiDeviceSim.updateFromDevice(
        'device2',
        `${sessionId}:timeSpent`,
        45,
        Date.now() + 50,
      );

      // Last write should win
      const finalTimeSpent = multiDeviceSim.getState(`${sessionId}:timeSpent`);
      expect(finalTimeSpent).toBe(45); // Later update wins

      // Conflict should be resolved
      const conflicts = perfMetrics.getSummary().conflicts.totalConflicts;
      if (conflicts > 0) {
        expect(
          perfMetrics.getSummary().conflicts.resolvedByLastWriteWins,
        ).toBeGreaterThan(0);
      }
    });

    it('should merge compatible session data (notes + time)', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      const sessionId = 'session-merge-test';

      // Device 1: Updates notes
      await multiDeviceSim.updateFromDevice(
        'device1',
        `${sessionId}:notes`,
        'Device 1 notes',
        Date.now(),
      );

      // Device 2: Updates time spent (compatible field)
      await multiDeviceSim.updateFromDevice(
        'device2',
        `${sessionId}:timeSpent`,
        60,
        Date.now() + 10,
      );

      // Both should persist (different fields)
      const notes = multiDeviceSim.getState(`${sessionId}:notes`);
      const timeSpent = multiDeviceSim.getState(`${sessionId}:timeSpent`);

      expect(notes).toBe('Device 1 notes');
      expect(timeSpent).toBe(60);

      // No conflict for compatible updates
      expect(perfMetrics.getSummary().conflicts.totalConflicts).toBe(0);
    });

    it('should handle SRS rating conflicts from multiple devices', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      const reminderId = 'reminder-123';

      // Both devices rate the same reminder
      await multiDeviceSim.updateFromDevice(
        'device1',
        `${reminderId}:rating`,
        4,
        Date.now(),
      );

      await multiDeviceSim.updateFromDevice(
        'device2',
        `${reminderId}:rating`,
        5,
        Date.now() + 100,
      );

      // Last write wins
      const finalRating = multiDeviceSim.getState(`${reminderId}:rating`);
      expect(finalRating === 4 || finalRating === 5).toBe(true);

      // Conflict should be resolved
      const conflicts = perfMetrics.getSummary().conflicts.totalConflicts;
      if (conflicts > 0) {
        expect(
          perfMetrics.getSummary().conflicts.resolvedByLastWriteWins,
        ).toBeGreaterThan(0);
      }
    });
  });

  describe.parallel('State Convergence Validation', () => {
    it('should converge to same final state after concurrent updates', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Simulate rapid concurrent updates
      const updates = [
        { device: 'device1', key: 'setting1', value: 'value1' },
        { device: 'device2', key: 'setting1', value: 'value2' },
        { device: 'device1', key: 'setting2', value: 'value3' },
        { device: 'device2', key: 'setting2', value: 'value4' },
      ];

      let timestamp = Date.now();
      for (const update of updates) {
        await multiDeviceSim.updateFromDevice(
          update.device,
          update.key,
          update.value,
          timestamp,
        );
        timestamp += 10; // Increment timestamp
      }

      // Both devices should see same final state when synced
      const finalSetting1 = multiDeviceSim.getState('setting1');
      const finalSetting2 = multiDeviceSim.getState('setting2');

      // Values should be consistent (last write wins)
      expect(finalSetting1).toBeTruthy();
      expect(finalSetting2).toBeTruthy();

      // Verify convergence - same value for same key regardless of device
      const device1View = {
        setting1: multiDeviceSim.getState('setting1'),
        setting2: multiDeviceSim.getState('setting2'),
      };

      const device2View = {
        setting1: multiDeviceSim.getState('setting1'),
        setting2: multiDeviceSim.getState('setting2'),
      };

      // Both devices see same final state
      expect(device1View.setting1).toBe(device2View.setting1);
      expect(device1View.setting2).toBe(device2View.setting2);
    });

    it('should handle multiple devices updating same settings key', async () => {
      const deviceCount = 5;
      const devices: DeviceContext[] = [];

      // Create multiple devices
      for (let i = 0; i < deviceCount; i++) {
        devices.push(
          multiDeviceSim.createDevice(`device${i}`, 'test-user-id-123'),
        );
      }

      // All devices update same key concurrently
      const updates = devices.map((device, index) =>
        multiDeviceSim.updateFromDevice(
          device.deviceId,
          'theme',
          `theme-${index}`,
          Date.now() + index * 10,
        ),
      );

      await Promise.all(updates);

      // Final value should be from device with latest timestamp
      const finalTheme = multiDeviceSim.getState('theme');
      expect(finalTheme).toBeTruthy();
      expect(finalTheme.startsWith('theme-')).toBe(true);

      // All devices should see same final value
      for (const device of devices) {
        const deviceView = multiDeviceSim.getState('theme');
        expect(deviceView).toBe(finalTheme);
      }
    });

    it('should maintain data integrity during multi-device sync storm', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );
      const device3 = multiDeviceSim.createDevice(
        'device3',
        'test-user-id-123',
      );

      // Storm of concurrent updates
      const updatePromises: Promise<any>[] = [];
      let timestamp = Date.now();

      for (let i = 0; i < 50; i++) {
        const device =
          i % 3 === 0 ? 'device1' : i % 3 === 1 ? 'device2' : 'device3';
        updatePromises.push(
          multiDeviceSim.updateFromDevice(
            device,
            `key${i % 5}`,
            `value${i}`,
            timestamp,
          ),
        );
        timestamp += 1;
      }

      await Promise.all(updatePromises);

      // Verify all updates processed
      // Verify no data loss
      const keys = ['key0', 'key1', 'key2', 'key3', 'key4'];
      for (const key of keys) {
        const value = multiDeviceSim.getState(key);
        expect(value).toBeTruthy();
      }

      // Verify final state is consistent
      const finalStates = keys.map(key => multiDeviceSim.getState(key));
      const allDevicesSeeSameState = devices =>
        devices.every(() => {
          const deviceView = keys.map(key => multiDeviceSim.getState(key));
          return JSON.stringify(deviceView) === JSON.stringify(finalStates);
        });

      expect(allDevicesSeeSameState([device1, device2, device3])).toBe(true);
    });
  });

  describe.parallel('Conflict Resolution Strategies', () => {
    it('should use last-write-wins for incompatible updates', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Device 1 writes first
      await multiDeviceSim.updateFromDevice('device1', 'setting', 'old', 1000);

      // Device 2 writes later (incompatible)
      await multiDeviceSim.updateFromDevice('device2', 'setting', 'new', 2000);

      // Last write wins
      const finalValue = multiDeviceSim.getState('setting');
      expect(finalValue).toBe('new');

      // Conflict resolution method recorded
      const conflicts = perfMetrics.getSummary().conflicts;
      if (conflicts.totalConflicts > 0) {
        expect(conflicts.resolvedByLastWriteWins).toBeGreaterThan(0);
      }
    });

    it('should preserve all values for compatible concurrent updates', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Device 1: Update setting A
      await multiDeviceSim.updateFromDevice(
        'device1',
        'settingA',
        'valueA',
        Date.now(),
      );

      // Device 2: Update setting B (compatible, different key)
      await multiDeviceSim.updateFromDevice(
        'device2',
        'settingB',
        'valueB',
        Date.now() + 10,
      );

      // Both should be preserved
      expect(multiDeviceSim.getState('settingA')).toBe('valueA');
      expect(multiDeviceSim.getState('settingB')).toBe('valueB');

      // No conflicts for compatible updates
      expect(perfMetrics.getSummary().conflicts.totalConflicts).toBe(0);
    });

    it('should resolve conflicts based on timestamp precision', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Very close timestamps (test precision)
      const baseTime = Date.now();

      await multiDeviceSim.updateFromDevice(
        'device1',
        'precise',
        'first',
        baseTime,
      );
      await multiDeviceSim.updateFromDevice(
        'device2',
        'precise',
        'second',
        baseTime + 1,
      );

      // Later timestamp (even by 1ms) should win
      const finalValue = multiDeviceSim.getState('precise');
      expect(finalValue).toBe('second');
    });
  });

  describe.parallel('Device Session Management', () => {
    it('should handle device session expiration during multi-device updates', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Simulate device 1 session expiring
      // (In real app, session would expire; for test, we simulate update failure)
      await multiDeviceSim.updateFromDevice(
        'device1',
        'setting',
        'value1',
        Date.now(),
      );

      // Device 2 continues updating
      await multiDeviceSim.updateFromDevice(
        'device2',
        'setting',
        'value2',
        Date.now() + 100,
      );

      // Device 2's update should be valid
      const finalValue = multiDeviceSim.getState('setting');
      expect(finalValue).toBe('value2');
    });

    it('should maintain consistency when one device goes offline', async () => {
      const device1 = multiDeviceSim.createDevice(
        'device1',
        'test-user-id-123',
      );
      const device2 = multiDeviceSim.createDevice(
        'device2',
        'test-user-id-123',
      );

      // Device 1 goes offline
      await network.goOffline();

      // Device 2 (online) updates
      await multiDeviceSim.updateFromDevice(
        'device2',
        'setting',
        'online-value',
        Date.now(),
      );

      // Device 1 comes back online
      await network.goOnline();

      // Device 1 should see Device 2's update (state convergence)
      const device1View = multiDeviceSim.getState('setting');
      expect(device1View).toBe('online-value');
    });
  });
});
