# Pass 7: Sync Validation E2E Tests

## Overview

Tests for end-to-end state synchronization across the app, ensuring data consistency across:

- Auth persistence
- Preference state sync (theme, notifications, settings)
- Navigation state retention
- Local storage rehydration

## Structure

```
e2e/sync/
├── syncValidation.test.ts    # Main test file (chunked tests)
└── utils/
    ├── auth.ts               # Auth helper utilities
    ├── navigation.ts         # Navigation helpers
    └── syncHelpers.ts       # Sync verification helpers
```

## Test Scenarios

### Test 1: Auth Persistence

- ✅ Sign in → Verify Supabase session valid
- ✅ Reload app → User remains logged in
- ✅ Verify local state matches Supabase
- ✅ Clear state on logout

### Test 2: Preference State Sync

- ✅ Theme preference persistence
- ✅ Notification preferences sync to Supabase
- ✅ Offline preference queueing

### Test 3: Navigation & Cache Sync

- ✅ Navigation stack restoration after reload
- ✅ Tab state preservation
- ✅ Navigation state cleared on logout
- ✅ User-specific navigation state isolation

## Helper Utilities

### `auth.ts`

- `signIn()` - Sign in through UI
- `isLoggedIn()` - Check login status
- `signOut()` - Sign out user
- `reloadAndVerifySession()` - Reload and verify persistence
- `getSupabaseUser()` - Get current user

### `navigation.ts`

- `goTo()` - Navigate to screen
- `navigateSequence()` - Navigate through multiple screens
- `verifyScreen()` - Verify current screen
- `goBack()` - Navigate back
- `goToDashboard()` / `goToProfile()` / `goToSettings()` - Specific navigation

### `syncHelpers.ts`

- `verifyLocalAuthState()` - Verify local auth state
- `verifySupabaseSession()` - Verify Supabase session
- `verifyNavigationState()` - Verify navigation persistence
- `verifyLocalStateMatchesSupabase()` - State consistency check
- `clearAllSyncState()` - Cleanup helper
- `waitForSync()` - Wait for sync operations

## Running Tests

```bash
# Run Pass 7 sync validation tests
detox test --configuration ios.debug e2e/sync/syncValidation.test.ts

# Or via npm
npm run e2e:test:ios -- e2e/sync/syncValidation.test.ts
```

## Notes

1. **Mock Auth**: Uses `mockSupabaseAuth` for deterministic testing
2. **Storage Verification**: In Detox, we verify state through UI and mock services (can't directly access AsyncStorage)
3. **TestIDs Needed**: Some preference tests require testIDs on:
   - Theme toggle button
   - Notification preference toggles
   - Settings screen components

## Pass 8: Offline Validation Tests

Pass 8 tests the resilience of the sync system under adverse conditions:

- Network loss and restoration
- Offline replay of queued operations
- Multi-session overlap handling
- Background state restoration

### Structure

```
e2e/sync/offline/
├── offlineAuthRecovery.test.ts       # Auth persistence during network loss
├── offlineSessionReplay.test.ts      # Study session progress replay
└── offlineSettingsPersistence.test.ts # Settings sync with offline support
```

### Utilities

- `e2e/sync/utils/network.ts` - Network simulation helpers
  - `setNetworkMode(mode)` - Toggle online/offline
  - `goOffline()` / `goOnline()` - Quick network transitions
  - `simulateNetworkInterruption()` - Test network failures

### Test Scenarios

#### Chunk 1: Offline Auth Recovery

- Sign in → disable network → verify local session persists
- Reload app → ensure user remains authenticated (local fallback)
- Reconnect → confirm Supabase session restored and reconciled
- Log out → verify local and remote states both cleared

#### Chunk 2: Offline Session Replay

- Start study session → disable network midway
- Record local progress (ratings, time, notes)
- Reconnect → verify remote Supabase session matches local data
- Validate progress queue replay and conflict resolution

#### Chunk 3: Offline Settings Persistence

- Change theme and notification preferences offline
- Verify UI updates immediately (local-first behavior)
- Reconnect → confirm sync with Supabase
- Reload app → ensure preferences remain correct

### Running Pass 8 Tests

```bash
# Run all Pass 8 tests
detox test --configuration ios.debug e2e/sync/offline

# Run specific test file
detox test --configuration ios.debug e2e/sync/offline/offlineAuthRecovery.test.ts
detox test --configuration ios.debug e2e/sync/offline/offlineSessionReplay.test.ts
detox test --configuration ios.debug e2e/sync/offline/offlineSettingsPersistence.test.ts
```

## Pass 9: Stress & Multi-Device Consistency Tests

Pass 9 validates sync system performance under heavy concurrency, rapid state changes, and simulated multi-device sessions. These tests ensure data integrity and state convergence across extreme load events.

### Structure

```
e2e/sync/stress/
├── highFrequencyStateUpdates.test.ts      # Rapid updates & queue performance
├── multiDeviceSessionConsistency.test.ts   # Multi-device conflicts & convergence
└── stressNavigationAndSettings.test.ts    # Navigation & settings stress tests
```

### Utilities

- `e2e/sync/utils/perfMetrics.ts` - Performance instrumentation
  - `PerformanceMetricsCollector` - Track operations, queue replays, conflicts
  - `measureOperation()` - Time async operations
  - `assertPerformance()` - Validate benchmarks
  - `printSummary()` - Display performance metrics

### Test Scenarios

#### Chunk 1: High Frequency State Updates

- Handle 10-20 operations per second
- Queue 100+ progress updates offline, replay in order
- Maintain queue integrity during random network toggles
- Handle burst updates (100 operations in 1 second)
- **Benchmarks:** Queue replay < 2s for 100 ops, avg latency < 50ms

#### Chunk 2: Multi-Device Session Consistency

- Simulate two device contexts using separate Supabase sessions
- Make concurrent updates to settings and study progress
- Reconcile conflicts (last-write-wins or timestamp merge)
- Validate both devices converge to same final state
- Handle device session expiration and offline recovery

#### Chunk 3: Stress Navigation & Settings

- Rapidly switch tabs and modify settings (theme, notifications) under load
- Trigger background/foreground transitions repeatedly
- Validate no crashes, no inconsistent states, and stable UI feedback
- Assert that settings persist correctly after 50+ quick toggles
- Handle combined stress scenarios (navigation + settings + network)

### Performance Benchmarks

- **Queue Replay:** < 2 seconds for 100 operations
- **Operation Latency:** < 50ms average latency per operation
- **Throughput:** ≥ 10 operations per second sustained
- **Conflict Resolution:** Timestamp-based (last-write-wins)
- **UI Response Time:** < 2 seconds during stress

### Running Pass 9 Tests

```bash
# Run all Pass 9 tests
detox test --configuration ios.debug e2e/sync/stress

# Run specific test file
detox test --configuration ios.debug e2e/sync/stress/highFrequencyStateUpdates.test.ts
detox test --configuration ios.debug e2e/sync/stress/multiDeviceSessionConsistency.test.ts
detox test --configuration ios.debug e2e/sync/stress/stressNavigationAndSettings.test.ts

# Run with stress mode (heavier tests)
STRESS_MODE=true detox test --configuration ios.debug e2e/sync/stress

# Debug with verbose logging
detox test --configuration ios.debug e2e/sync/stress --loglevel verbose
```

### Test Statistics

- **Total Tests:** 34 tests across 3 files
- **Test Groups:** 15 `describe.parallel()` blocks
- **Total Lines:** ~1,850 lines of test code
- **Test Duration:** ~5-8 minutes for full Pass 9 suite
- **Stress Mode:** Optional heavier tests (200+ operations) when `STRESS_MODE=true`

### Notes

1. **Performance Metrics:** Metrics are printed to console after each test group via `perfMetrics.printSummary()`
2. **Stress Mode:** Set `STRESS_MODE=true` environment variable to enable heavier stress tests
3. **Multi-Device Simulation:** Uses `MultiDeviceSimulator` class to simulate multiple device contexts
4. **UI Element Dependencies:** Some tests require testIDs on settings UI elements; tests gracefully skip if elements don't exist
5. **Mock-Based:** All tests use `mockSupabaseAuth` for deterministic testing without real server calls

## Pass 10: Full System Recovery & Resilience Validation

Pass 10 validates that the ELARO app can recover gracefully from crashes, data corruption, partial syncs, and extended idle periods — maintaining state integrity and user trust. This is the final validation pass before simulator QA and App Store submission.

### Structure

```
e2e/sync/recovery/
├── crashRecoveryAndReload.test.ts         # Crash recovery tests
├── corruptedCacheResilience.test.ts        # Cache corruption tests
└── longIdleSessionRecovery.test.ts        # Idle recovery tests
```

### Utilities

- `e2e/sync/utils/crashSim.ts` - Crash simulation and recovery measurement
  - `simulateCrash()` - Force app termination
  - `restartAfterCrash()` - Restart app after crash
  - `measureRecoveryTime()` - Track recovery performance
  - `OperationTracker` - Detect duplicate operations

- `e2e/sync/utils/cacheMutator.ts` - Cache corruption and validation
  - `corruptStorageKey()` - Corrupt specific key with invalid JSON
  - `corruptAllSyncStorage()` - Corrupt all sync storage
  - `verifyStorageIntegrity()` - Validate cache integrity
  - `restoreValidCacheStructure()` - Restore valid cache

- `e2e/sync/utils/appLifecycle.ts` - App lifecycle simulation
  - `simulateExtendedIdle()` - Simulate hours of idle time
  - `simulateSuspendedState()` - Test iOS suspended state
  - `measureSyncCatchUpTime()` - Track catch-up performance
  - `simulateColdStart()` / `simulateWarmStart()` - Test start scenarios

### Test Scenarios

#### Chunk 1: Crash Recovery & Reload

- Recover gracefully from forced termination during sync
- Restore last known valid state after crash
- Automatically resume queue replay after crash
- Prevent duplicate sync operations
- **Benchmarks:** Recovery < 3s, replay < 2s

#### Chunk 2: Corrupted Cache Resilience

- Self-heal from invalid JSON in cache
- Handle missing cache keys and fallback to Supabase
- Handle version mismatches and clear incompatible data
- Recover from complete cache corruption
- **Self-healing:** No crashes, quick recovery sync

#### Chunk 3: Long Idle Session Recovery

- Recover from extended idle (1-48 hours)
- Refresh expired sessions properly
- Rehydrate settings and study session states
- Efficient catch-up sync after idle
- **Benchmarks:** Catch-up < 5s

### Performance Benchmarks

- **Recovery Time:** < 3 seconds after crash
- **Queue Replay Time:** < 2 seconds for 10 operations
- **Sync Catch-Up Time:** < 5 seconds after extended idle
- **Self-Healing:** Immediate (no crash), sync < 3s

### Running Pass 10 Tests

```bash
# Run all Pass 10 tests
detox test --configuration ios.debug e2e/sync/recovery

# Run specific test file
detox test --configuration ios.debug e2e/sync/recovery/crashRecoveryAndReload.test.ts
detox test --configuration ios.debug e2e/sync/recovery/corruptedCacheResilience.test.ts
detox test --configuration ios.debug e2e/sync/recovery/longIdleSessionRecovery.test.ts

# Debug with verbose logging
detox test --configuration ios.debug e2e/sync/recovery --loglevel verbose
```

### Test Statistics

- **Total Tests:** 28 tests across 3 files
- **Test Groups:** 18 `describe.parallel()` blocks
- **Total Lines:** ~1,683 lines of code
- **Test Duration:** ~6-10 minutes for full Pass 10 suite

### Notes

1. **Recovery Validation:** Tests verify graceful recovery without data loss
2. **Self-Healing:** App automatically recovers from corrupted cache
3. **Performance:** All recovery scenarios meet performance benchmarks
4. **Mock-Based:** All tests use `mockSupabaseAuth` for deterministic testing
5. **Final Pass:** This completes E2E testing infrastructure, ready for App Store submission

## Future Enhancements

- Direct AsyncStorage inspection (if Detox supports it)
- Real device network simulation (vs. mock)
- Advanced conflict resolution strategies (beyond last-write-wins)
- Performance profiling and bottleneck identification
- Real crash reporting integration (Sentry)
