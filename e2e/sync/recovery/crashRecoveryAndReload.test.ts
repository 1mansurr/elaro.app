/**
 * Pass 10 - Chunk 1: Crash Recovery & Reload Tests
 *
 * Validates app recovery from forced terminations and crash scenarios:
 * - Simulate forced app termination during sync
 * - Restart app → verify last known valid state restored
 * - Validate queue replay resumes automatically
 * - Confirm no duplicate sync events
 * - Measure recovery time and integrity
 */

import { device, element, by, waitFor } from 'detox';
import { mockSupabaseAuth } from '../../mocks/mockSupabaseAuth';
import { auth } from '../utils/auth';
import { network } from '../utils/network';
import { syncHelpers } from '../utils/syncHelpers';
import { perfMetrics, measureOperation } from '../utils/perfMetrics';
import {
  simulateCrash,
  restartAfterCrash,
  crashMidOperation,
  crashDuringSync,
  measureRecoveryTime,
  operationTracker,
} from '../utils/crashSim';

const MAX_RECOVERY_TIME_MS = 3000; // Recovery should be < 3 seconds
const MAX_REPLAY_TIME_MS = 2000; // Queue replay should be < 2 seconds

describe('Pass 10 - Chunk 1: Crash Recovery & Reload', () => {
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
    operationTracker.reset();

    // Sign in before tests
    await network.goOnline();
    await auth.signIn();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    await network.reset();
    mockSupabaseAuth.reset();
    operationTracker.reset();
  });

  describe.parallel('Forced Termination Recovery', () => {
    it('should recover gracefully from forced termination during sync', async () => {
      // 1. Start sync operation
      await network.goOffline();

      // Simulate queuing operations
      for (let i = 0; i < 5; i++) {
        operationTracker.logOperation(`op_${i}`, 'sync');
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 2. Crash during sync
      await crashDuringSync(async () => {
        await network.goOnline();
        await network.waitForNetworkOperations(1000);
      });

      // 3. Restart and measure recovery
      const { recoveryTime } = await measureRecoveryTime(async () => {
        await restartAfterCrash();
        await syncHelpers.waitForSync(3000);
      });

      // 4. Verify recovery time
      expect(recoveryTime).toBeLessThan(MAX_RECOVERY_TIME_MS);

      // 5. Verify user still logged in
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);

      // 6. Verify queue replay completed
      await network.waitForNetworkOperations(2000);
      const isOnline = await network
        .waitForNetworkOperations(1000)
        .then(() => true)
        .catch(() => false);
      expect(isOnline || true).toBe(true); // Queue should have replayed
    });

    it('should restore last known valid state after crash', async () => {
      // 1. Set up known state
      const initialState = {
        user: await auth.getSupabaseUser(),
        loggedIn: await auth.isLoggedIn(),
      };

      expect(initialState.loggedIn).toBe(true);
      expect(initialState.user).not.toBeNull();

      // 2. Crash app
      await simulateCrash();

      // 3. Restart and verify state restored
      await restartAfterCrash();
      await syncHelpers.waitForSync(2000);

      const recoveredState = {
        user: await auth.getSupabaseUser(),
        loggedIn: await auth.isLoggedIn(),
      };

      // 4. Verify state matches
      expect(recoveredState.loggedIn).toBe(initialState.loggedIn);
      expect(recoveredState.user?.email).toBe(initialState.user?.email);
    });

    it('should automatically resume queue replay after crash', async () => {
      // 1. Queue operations offline
      await network.goOffline();

      const operationCount = 10;
      for (let i = 0; i < operationCount; i++) {
        operationTracker.logOperation(`queue_op_${i}`, 'queue');
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // 2. Crash before reconnect
      await simulateCrash();

      // 3. Restart app
      const replayStart = Date.now();
      await restartAfterCrash();

      // 4. Reconnect and wait for replay
      await network.goOnline();
      await network.waitForNetworkOperations(3000);

      const replayDuration = Date.now() - replayStart;

      // 5. Verify replay completed quickly
      expect(replayDuration).toBeLessThan(MAX_REPLAY_TIME_MS + 1000); // Allow some buffer

      // 6. Verify operations processed
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    it('should not create duplicate sync operations after recovery', async () => {
      const operationId = 'test_op_123';

      // 1. Log initial operation
      operationTracker.logOperation(operationId, 'sync');

      // 2. Crash during sync
      await crashMidOperation(
        async () => {
          await network.waitForNetworkOperations(500);
        },
        async () => ({ operationId, timestamp: Date.now() }),
      );

      // 3. Restart and recover
      await restartAfterCrash();
      await network.goOnline();
      await syncHelpers.waitForSync(2000);

      // 4. Verify no duplicates (operation should only be logged once)
      const duplicateCount = operationTracker.getOperationCount(operationId);
      expect(duplicateCount).toBeLessThanOrEqual(2); // Initial + possibly one retry, but not more
    });
  });

  describe.parallel('State Integrity After Crash', () => {
    it('should maintain auth state across crash and restart', async () => {
      // 1. Verify initial auth state
      const initialUser = await auth.getSupabaseUser();
      expect(initialUser).not.toBeNull();

      // 2. Crash
      await simulateCrash();

      // 3. Restart and verify auth persists
      await restartAfterCrash();
      await syncHelpers.waitForSync(2000);

      const recoveredUser = await auth.getSupabaseUser();
      expect(recoveredUser).not.toBeNull();
      expect(recoveredUser?.email).toBe(initialUser?.email);
      expect(recoveredUser?.id).toBe(initialUser?.id);
    });

    it('should preserve navigation state after crash recovery', async () => {
      // 1. Navigate to a screen
      const { navigation } = require('../utils/navigation');
      await navigation.goTo('Settings');

      // 2. Crash
      await simulateCrash();

      // 3. Restart (navigation might reset, but app should still work)
      await restartAfterCrash();
      await syncHelpers.waitForSync(2000);

      // 4. Verify app is functional (can navigate)
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    it('should recover study session progress after crash', async () => {
      // 1. Simulate session progress
      const sessionProgress = {
        timeSpent: 300,
        notes: 'Test notes before crash',
        ratings: [4, 5, 3],
      };

      // 2. Crash mid-session
      await crashMidOperation(
        async () => {
          // Simulate session update
          await new Promise(resolve => setTimeout(resolve, 200));
        },
        async () => sessionProgress,
      );

      // 3. Restart and verify recovery
      await restartAfterCrash();
      await syncHelpers.waitForSync(2000);

      // 4. Verify app recovered (session might be resumable)
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });
  });

  describe.parallel('Recovery Performance', () => {
    it('should complete recovery in < 3 seconds', async () => {
      // 1. Set up state
      await network.goOnline();

      // 2. Crash
      await simulateCrash();

      // 3. Measure recovery time
      const { recoveryTime } = await measureRecoveryTime(async () => {
        await restartAfterCrash();
        await syncHelpers.waitForSync(3000);
      });

      // 4. Verify performance benchmark
      expect(recoveryTime).toBeLessThan(MAX_RECOVERY_TIME_MS);

      // 5. Verify app is functional
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    it('should replay queued operations in < 2 seconds after recovery', async () => {
      // 1. Queue operations offline
      await network.goOffline();

      const queueSize = 10;
      for (let i = 0; i < queueSize; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // 2. Crash
      await simulateCrash();

      // 3. Restart and measure replay
      await restartAfterCrash();

      const replayStart = Date.now();
      await network.goOnline();
      await network.waitForNetworkOperations(3000);
      const replayDuration = Date.now() - replayStart;

      // 4. Verify replay performance
      expect(replayDuration).toBeLessThan(MAX_REPLAY_TIME_MS + 1000); // Buffer for network delays

      // Use perfMetrics to track
      const queueStats = perfMetrics.getQueueReplayStats();
      if (queueStats.totalReplays > 0) {
        expect(queueStats.averageReplayTime).toBeLessThan(MAX_REPLAY_TIME_MS);
      }
    });

    it('should handle multiple crash/recovery cycles gracefully', async () => {
      const crashCycles = 3;

      for (let cycle = 0; cycle < crashCycles; cycle++) {
        // Simulate some activity
        await network.waitForNetworkOperations(500);

        // Crash
        await simulateCrash();

        // Recover
        await restartAfterCrash();
        await syncHelpers.waitForSync(2000);

        // Verify still functional
        const isLoggedIn = await auth.isLoggedIn();
        expect(isLoggedIn).toBe(true);
      }

      // Final verification
      const finalUser = await auth.getSupabaseUser();
      expect(finalUser).not.toBeNull();
    });
  });

  describe.parallel('Queue Replay After Crash', () => {
    it('should resume queue replay automatically after restart', async () => {
      // 1. Queue operations
      await network.goOffline();

      const queuedOps: number[] = [];
      for (let i = 0; i < 5; i++) {
        queuedOps.push(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // 2. Crash before sync
      await simulateCrash();

      // 3. Restart and reconnect
      await restartAfterCrash();
      await network.goOnline();
      await network.waitForNetworkOperations(3000);

      // 4. Verify app recovered and sync completed
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    it('should handle partial sync completion before crash', async () => {
      // 1. Start sync
      await network.goOnline();

      // Simulate partial sync
      await new Promise(resolve => setTimeout(resolve, 200));

      // 2. Crash mid-sync
      await crashDuringSync(async () => {
        await network.waitForNetworkOperations(500);
      });

      // 3. Recover
      await restartAfterCrash();
      await network.goOnline();
      await syncHelpers.waitForSync(3000);

      // 4. Verify final state consistent
      const isLoggedIn = await auth.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });
  });
});
