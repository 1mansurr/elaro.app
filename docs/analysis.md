I now have everything I need. Here is the complete analysis:

---

ELARO → Offline-First MVP: Simplification Plan

---

1. Dependency Audit  


dependencies in package.json

┌──────────────────────────────────────────────┬─────────────┬────────────────────────────────────────────────────────────────────────────────────────────┐
│ Package │ Status │ Reason │  
 ├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤  
 │ @supabase/supabase-js │ REMOVE │ Core of everything being stripped │  
 ├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤  
 │ @invertase/react-native-apple-authentication │ REMOVE │ Auth only │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-apple-authentication │ REMOVE │ Auth only │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-auth-session │ REMOVE │ OAuth auth flows only │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-local-authentication │ REMOVE │ Biometric unlock tied to auth sessions │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-purchases │ REMOVE │ RevenueCat, subscriptions entirely │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ mixpanel-react-native │ REMOVE │ Analytics for auth/user events; no user identity without auth │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @sentry/react-native │ REMOVE │ Not MVP; add back post-validation │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ jsonwebtoken │ REMOVE │ JWT parsing for auth sessions │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-qrcode-svg │ REMOVE │ MFA QR code enrollment only │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-web-browser │ REMOVE │ OAuth/auth redirect flows only │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-linking │ REMOVE │ Deep links used for auth callbacks and password reset │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-webview │ REMOVE │ Used only by InAppBrowserScreen (Intercom/support) │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-sharing │ REMOVE │ Not in MVP feature set │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-image-picker │ REMOVE │ Profile photo uploads only │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-image-manipulator │ REMOVE │ Profile photo processing only │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-av │ REMOVE │ Audio/video, no MVP use │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-clipboard │ REMOVE │ Used only in MFA code copying │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-confetti-cannon │ REMOVE │ Subscription upgrade celebration │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-copilot │ REMOVE │ Onboarding tutorial overlay │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ tinycolor2 │ REMOVE │ Color manipulation utility; not needed once auth-tier color logic (Oddity plan colors) is │
│ │ │ removed │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ dotenv │ REMOVE │ No remote env vars needed offline │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ nativewind │ REMOVE │ ⚠️ Verify: used minimally alongside theme.ts. If any screen uses className= props it must │
│ │ │ stay, otherwise remove to eliminate Tailwind build overhead │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ tailwindcss-react-native │ REMOVE │ Older Tailwind-for-RN package; dead weight if nativewind removed │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @react-native-community/netinfo │ REMOVE │ Offline-first; NetworkContext becomes a stub │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-updates │ REMOVE │ OTA updates; not needed for dev MVP │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-secure-store │ REMOVE │ Used only for biometric token storage (auth) — ⚠️ verify no other use │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-crypto │ INVESTIGATE │ Verify if used outside auth. If only used for key derivation/auth, remove. │
│ │ │ react-native-uuid handles UUID generation │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-device │ INVESTIGATE │ Used in Sentry and biometric check. If Sentry removed and biometric removed, likely safe │
│ │ │ to remove │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-file-system │ INVESTIGATE │ May be used for cache clearing or local file access. Check usages before removing │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-image │ KEEP │ General image rendering (avatars, assets) │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-notifications │ KEEP │ Core SRS local notification scheduling │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-blur │ KEEP │ Modal backdrop blur │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-haptics │ KEEP │ Gesture feedback │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-linear-gradient │ KEEP │ UI gradients │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-splash-screen │ KEEP │ App startup │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-constants │ KEEP │ App config access │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-font │ KEEP │ Font loading │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-status-bar │ KEEP │ Status bar control │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-build-properties │ KEEP │ Native build config │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ expo-dev-client / expo-dev-menu │ KEEP │ Dev tooling │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @expo/vector-icons │ KEEP │ Icons │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @expo/metro-config / @expo/metro-runtime │ KEEP │ Metro bundler │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @tanstack/react-query │ KEEP │ See Section 5 for justification │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @react-navigation/\* (all 4) │ KEEP │ Navigation remains the same │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @react-native-async-storage/async-storage │ KEEP │ Simple key-value preferences (theme, notification prefs) │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @react-native-community/datetimepicker │ KEEP │ Date/time picking in forms │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @react-native-picker/picker │ KEEP │ Dropdowns │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-calendars │ KEEP │ Calendar view │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-gesture-handler │ KEEP │ Navigation dependency │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-reanimated │ KEEP │ Animations │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-safe-area-context │ KEEP │ Layout │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-screens │ KEEP │ Navigation performance │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-modal │ KEEP │ Modal component │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-progress │ KEEP │ SRS progress indicators │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-select-dropdown │ KEEP │ Form dropdowns │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-svg │ KEEP │ SVG rendering │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-uuid │ KEEP │ UUID v4 generation for local IDs │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ react-native-vector-icons │ KEEP │ Icons │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ date-fns │ KEEP │ SRS interval date arithmetic │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ zod │ KEEP │ Form validation │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ @babel/runtime │ KEEP │ Runtime dependency │
├──────────────────────────────────────────────┼─────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ metro │ KEEP │ Bundler │
└──────────────────────────────────────────────┴─────────────┴────────────────────────────────────────────────────────────────────────────────────────────┘

Add (not yet installed):

- expo-sqlite — the replacement persistence layer

---

2. Feature Folder Audit

src/features/auth/ — REMOVE ENTIRELY

All 37 files go. This includes:

- All screens (AuthScreen, EnhancedAuthScreen, MFAEnrollmentScreen, MFAVerificationScreen, ForgotPasswordScreen, ResetPasswordScreen, AppWelcomeScreen)
- All services (authService, UserProfileService, BiometricAuthService, SessionTimeoutService, AuthAnalyticsService)
- All hooks (useUserProfile, useBiometricAuth, useSessionTimeout)
- The entire permissions/ subdirectory (PermissionService, PermissionCacheService, PermissionConstants, permissionGuard) — the permission system is
  subscription-tier-gated and meaningless without auth

src/features/onboarding/ — REMOVE ENTIRELY

All 11 files go. Onboarding exists purely to collect a username and link the user to their Supabase account/courses on first launch.

src/features/subscription/ — REMOVE ENTIRELY

All 5 files go. PaywallScreen, OddityWelcomeScreen, RevenueCat integration.

src/features/user-profile/ — REMOVE ENTIRELY

All 17 files go. AccountScreen, DeviceManagementScreen, LoginHistoryScreen, DeleteAccountScreen are all auth-dependent. SubscriptionManagementCard is
RevenueCat. QuietHoursSettings and notification prefs can be reimplemented in a simple local-only settings screen later.

src/features/support/ — REMOVE ENTIRELY

3 files. Intercom chat requires a logged-in user identity.

src/features/system-health/ — REMOVE ENTIRELY

3 files. Checks backend connectivity. Meaningless offline.

src/features/data-management/ — REMOVE ENTIRELY

3 files. RecycleBinScreen is a soft-delete restore UI backed by Supabase.

src/features/admin/ — REMOVE ENTIRELY

1 file. AnalyticsAdminDashboard reads from Supabase analytics tables.

src/features/settings/ — REMOVE ENTIRELY

1 file, AnalyticsToggle.tsx. Toggles Mixpanel, which is being removed.

src/features/dev/ — KEEP

NotificationTestScreen.tsx is useful for testing local SRS notifications. Keep it gated behind a dev menu.

---

src/features/dashboard/ — PARTIALLY KEEP

Keep:

- HomeScreen.tsx (or its OptimizedHomeScreen variant — pick one, delete the others)
- DraftsScreen.tsx
- TemplatesScreen.tsx
- All sub-components in HomeScreen/ that render tasks and navigation
- SwipeableTaskCard.tsx, TaskCardSkeleton.tsx, HomeScreenEmptyState.tsx
- HomeScreenFAB.tsx, HomeScreenHeader.tsx, HomeScreenContent.tsx

Remove from this feature:

- MonthlyLimitCard.tsx — subscription limit display
- UpcomingTaskItem references to "locked" items (LockedItemsBanner)
- Any usePermissions() call checking task creation limits

⚠️ There are 3 duplicate HomeScreen files (HomeScreen, OptimizedHomeScreen, RefactoredHomeScreen). Verify which one is actually rendered by the navigator
before deleting the others.

---

src/features/assignments/ — PARTIALLY KEEP

Keep:

- All screens (AddAssignmentScreen and all flow screens)
- All components (form sections, ReminderModal)

Rewrite:

- services/queries.ts — replace Supabase calls with SQLite queries
- services/mutations.ts — replace Supabase calls with SQLite mutations

---

src/features/lectures/ — PARTIALLY KEEP

Same pattern as assignments. Keep all screens and components, rewrite services/queries.ts and services/mutations.ts to use SQLite.

---

src/features/courses/ — PARTIALLY KEEP

Keep:

- All screens (CoursesScreen, CourseDetailScreen, EditCourseModal, AddCourseInfoScreen, AddLectureScreen flows)
- All components
- AddCourseContext.tsx

Rewrite:

- services/queries.ts and services/mutations.ts

Remove:

- Any reference to versionedApiClient (used for Supabase edge function routing)

---

src/features/calendar/ — KEEP ENTIRELY

The calendar screen itself is display-only logic on top of tasks. Rewrite useCalendarTasksWithLockState.ts to remove the "lock state" (premium feature
gating) and source data from SQLite instead of React Query + Supabase.

---

src/features/notifications/ — PARTIALLY KEEP

Keep:

- NotificationBell.tsx, NotificationSettings.tsx, SimpleNotificationSettings.tsx
- usePushNotifications.ts — but strip out Expo push token registration (server registration). Keep only local notification permission request.
- useNotificationPreferences.ts — rewrite to use AsyncStorage instead of Supabase

Remove:

- NotificationManagementScreen.tsx — if it shows server-side notification history
- NotificationHistoryModal.tsx — fetches from reminders table in Supabase

---

src/features/srs/ — PARTIALLY KEEP

Keep:

- All interfaces and algorithm logic
- useSRSAnalytics.ts, useSRSScheduling.ts

Rewrite:

- SRSSchedulingService.ts — currently makes 5+ Supabase calls (user subscription tier, srs_schedules table, srs_performance table, a Supabase RPC for
  timezone scheduling, and inserts into the reminders table). All of this moves to SQLite + expo-notifications.
- SRSAnalyticsService.ts — rewrite to read from local srs_items table

Remove:

- All subscription-tier branching (free vs. Oddity intervals). MVP gets a single fixed interval set: [1, 3, 7, 14, 30].

---

src/features/studySessions/ — PARTIALLY KEEP

Keep:

- AddStudySessionScreen.tsx, StudyResultScreen.tsx, StudySessionReviewScreen.tsx, SRSStatisticsScreen.tsx
- SRSReviewCard.tsx

Rewrite:

- services/queries.ts and services/mutations.ts

---

src/features/templates/ — KEEP ENTIRELY

The template logic is largely pure JavaScript (filtering, applying defaults). Rewrite useTemplateManagement.ts to persist to SQLite and pre-seed built-in
templates on first launch.

---

src/features/tasks/ — PARTIALLY KEEP

Keep and rewrite:

- RecurringTaskService.ts — currently makes 4 Supabase RPC calls. All pattern logic (daily/weekly/monthly calculation) can be done in pure JS. Rewrite to
  persist to SQLite.
- useRecurringTasks.ts, useAdvancedTemplates.ts

Remove:

- TaskDependencyService.ts and useTaskDependencies.ts — task blocking/dependency graph is not a core MVP feature and adds significant complexity

---

3. Shared Code Audit

src/contexts/

┌──────────────────────────────┬──────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Context │ Status │ Notes │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ AuthContext.tsx │ REMOVE │ The central casualty. All useAuth() calls in features need to be updated │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ OnboardingContext.tsx │ REMOVE │ Supports onboarding flow only │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ UsageLimitPaywallContext.tsx │ REMOVE │ Subscription gating │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SoftLaunchContext.tsx │ REMOVE │ Feature flags tied to backend │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ThemeContext.tsx │ KEEP │ Pure local state, AsyncStorage only │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ NotificationContext.tsx │ KEEP │ Pure local state │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ │ KEEP as │ Replace @react-native-community/netinfo with a stub that always returns isConnected: true. This prevents │
│ NetworkContext.tsx │ stub │ runtime crashes in any component still calling useNetwork() without requiring a full purge of every call │
│ │ │ site on day one │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ToastContext.tsx │ KEEP │ Pure local state │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LocaleContext.tsx │ KEEP │ Pure local state │
├──────────────────────────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CreationFlowContext.tsx │ KEEP │ Generic multi-step form context, no external deps │
└──────────────────────────────┴──────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

src/shared/components/

Components that break without auth:

- AuthIssueModal.tsx — REMOVE (auth error display)
- UpgradeSuccessModal.tsx — REMOVE (subscription)
- UsageLimitPaywall.tsx — REMOVE (subscription gating)
- LockedItemsBanner.tsx — REMOVE (premium tier locking)
- OfflineBanner.tsx — REMOVE (only relevant when network exists)
- SyncIndicator.tsx — REMOVE (sync state with Supabase)
- QueryStateWrapper.tsx / SimplifiedQueryStateWrapper.tsx — KEEP but remove any auth-error-specific handling

Components that depend on permissions:

- Any component calling usePermissions() — strip the permission call, replace with unconditional rendering. ⚠️ Do a grep for usePermissions across shared/ to
  find all callers.

Everything else in shared/components/ — KEEP. The UI component library (buttons, inputs, modals, forms, cards, skeletons) has no auth or Supabase
dependencies.

src/shared/hooks/

- usePermissions.ts — REMOVE (auth + subscription tier checks)
- useQuickAddForm.ts — KEEP but remove usePermissions call inside it (the task-limit enforcement)
- useTemplateSelection.ts / useTemplateManagement.ts — KEEP, rewrite to use SQLite
- task-forms/ hooks — KEEP all 4 (form state only)

src/shared/utils/

- getSecureChatLink.ts — REMOVE (Intercom)
- templateUtils.ts — KEEP

src/services/ (root level)

┌────────────────────────────────────────────────────┬────────────────────────────────────────┐
│ File │ Status │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ supabase.ts │ REMOVE (after all callers migrated) │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ authService.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ authSync.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ syncManager.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ revenueCat.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ analytics.ts / mixpanel.ts / analyticsEvents.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ errorTracking.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ healthCheckService.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ navigationSync.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ settingsSync.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ studySessionSync.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ ApiVersioningService.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ RequestDeduplicationService.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ VersionedApiClient.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ bundleSizeTracking.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ cacheMonitoring.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ networkMonitoring.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ PerformanceMonitoringService.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ updateService.ts │ REMOVE │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ notifications.ts │ KEEP (local notification setup) │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ reminderRescheduling.ts │ KEEP (local notification rescheduling) │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ api/queries.ts + api/mutations.ts + api/mappers.ts │ REMOVE (Supabase API layer) │
├────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ api/errors.ts │ KEEP (generic error types) │
└────────────────────────────────────────────────────┴────────────────────────────────────────┘

---

4. Local Database Schema Design

Install: npx expo install expo-sqlite

Create src/services/database.ts as the single SQLite entry point.

-- ============================================================
-- ELARO LOCAL MVP SCHEMA (expo-sqlite)
-- Convention: TEXT for all UUIDs, TEXT for all timestamps (ISO8601),
-- INTEGER 0/1 for booleans, TEXT for JSON blobs
-- synced_at IS NULL means "not yet synced to Supabase"
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
id TEXT PRIMARY KEY, -- UUID v4
name TEXT NOT NULL,
code TEXT,
color TEXT, -- hex string from COLORS palette
icon TEXT, -- optional icon name
schedule TEXT, -- JSON: [{day:0-6, start:'HH:MM', end:'HH:MM', venue:TEXT}]
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
synced_at TEXT -- NULL = pending sync
);

CREATE TABLE IF NOT EXISTS tasks (
id TEXT PRIMARY KEY,
type TEXT NOT NULL CHECK(type IN ('assignment','lecture','study_session')),
title TEXT NOT NULL,
description TEXT,
course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
due_date TEXT, -- ISO8601 — deadline for assignments
start_time TEXT, -- ISO8601 — for lectures and sessions
end_time TEXT, -- ISO8601
is_completed INTEGER NOT NULL DEFAULT 0,
completed_at TEXT,
is_deleted INTEGER NOT NULL DEFAULT 0, -- soft delete
deleted_at TEXT,
metadata TEXT, -- JSON: type-specific fields
-- assignment: {submission_method, priority}
-- lecture: {venue, is_recurring, recurrence_rule}
-- study_session: {session_type, estimated_duration_mins}
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
synced_at TEXT
);

CREATE TABLE IF NOT EXISTS srs_items (
id TEXT PRIMARY KEY,
task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
topic TEXT NOT NULL,
interval_days INTEGER NOT NULL DEFAULT 1, -- current SM-2 interval
ease_factor REAL NOT NULL DEFAULT 2.5, -- SM-2 ease factor
repetitions INTEGER NOT NULL DEFAULT 0, -- successful reviews
next_review_date TEXT NOT NULL, -- ISO8601 date YYYY-MM-DD
last_reviewed_at TEXT,
last_quality_rating INTEGER, -- 1 (blackout) to 5 (perfect)
is_active INTEGER NOT NULL DEFAULT 1,
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
synced_at TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
id TEXT PRIMARY KEY,
task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
srs_item_id TEXT REFERENCES srs_items(id) ON DELETE CASCADE,
expo_notification_id TEXT, -- identifier returned by expo-notifications
-- NULL means not yet scheduled
title TEXT NOT NULL,
body TEXT NOT NULL,
scheduled_time TEXT NOT NULL, -- ISO8601 when to fire
reminder_type TEXT NOT NULL CHECK(reminder_type IN
('task_due','study_session','srs_review')),
is_cancelled INTEGER NOT NULL DEFAULT 0,
fired_at TEXT, -- set when notification fires
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
synced_at TEXT
);

CREATE TABLE IF NOT EXISTS templates (
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
description TEXT,
task_type TEXT NOT NULL CHECK(task_type IN ('assignment','lecture','study_session')),
template_data TEXT NOT NULL, -- JSON: pre-filled task fields
is_built_in INTEGER NOT NULL DEFAULT 0, -- 1 = shipped with app, never deleted
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
synced_at TEXT
);

CREATE TABLE IF NOT EXISTS recurring_patterns (
id TEXT PRIMARY KEY,
task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
interval_value INTEGER NOT NULL DEFAULT 1,
days_of_week TEXT, -- JSON array [0-6] for weekly
day_of_month INTEGER, -- for monthly
end_date TEXT, -- ISO8601 date
max_occurrences INTEGER,
last_generated TEXT, -- ISO8601 date of last generation
created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
synced_at TEXT
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_tasks_course ON tasks(course_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_srs_next_review ON srs_items(next_review_date) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_time) WHERE is_cancelled = 0;

Schema conventions for future Supabase compatibility:

- Column names use snake_case — matches Supabase/PostgreSQL
- All IDs are UUID v4 strings (use react-native-uuid)
- All timestamps are ISO8601 strings — PostgreSQL TIMESTAMPTZ accepts these directly
- Booleans as INTEGER 0/1 in SQLite become BOOLEAN in PostgreSQL with a trivial cast
- JSON blobs in SQLite become JSONB in PostgreSQL with no data change

---

5. State Management Simplification

Recommendation: Keep React Query. Swap only the queryFn internals.

Justification:

React Query's value is not the network — it is the query lifecycle: loading/error/success states, cache invalidation, and the invalidateQueries pattern for
triggering re-renders after mutations. All of that remains useful with SQLite as the backend.

The migration to Supabase later requires changing only the queryFn body in each service, not the component or hook code. A component calling useQuery({
queryKey: ['tasks'], queryFn: getTasks }) works identically whether getTasks reads from SQLite or calls Supabase. This is a zero-churn migration later.

What changes:
// Before (Supabase)
const queryFn = async () => {
const { data, error } = await supabase.from('tasks').select('\*');
if (error) throw error;
return data;
};

// After (SQLite) — component code unchanged
const queryFn = async () => {
const db = await getDatabase();
return db.getAllAsync<Task>('SELECT \* FROM tasks WHERE is_deleted = 0');
};

Reject Zustand for this phase. Zustand is a good fit for UI state (modals, filters) but is not a data persistence layer. You would still need SQLite
alongside it, duplicating state.

Reject plain React state. The app has 6+ screens that all need the same task/course data. Prop drilling or multiple useEffect fetches breaks the moment you
navigate away and back.

---

6. SRS + Notifications Architecture (Offline)

Data Storage

The srs_items table tracks each reviewable item. After a study session is completed, one srs_item row is created per topic. The SM-2 algorithm runs entirely
in JS on-device:

// Pure function — no network needed
function calculateNextInterval(item: SRSItem, qualityRating: 1|2|3|4|5): SRSItem {
// rating < 3: reset to interval=1, keep ease_factor
// rating >= 3: interval = prev_interval _ ease_factor
// ease_factor += 0.1 - (5 - rating) _ (0.08 + (5 - rating) _ 0.02)
// ease_factor = max(1.3, ease_factor)
const newItem = { ...item };
if (qualityRating < 3) {
newItem.repetitions = 0;
newItem.interval_days = 1;
} else {
newItem.repetitions += 1;
newItem.interval_days = newItem.repetitions === 1 ? 1
: newItem.repetitions === 2 ? 6
: Math.round(newItem.interval_days _ newItem.ease_factor);
newItem.ease_factor = Math.max(1.3,
newItem.ease_factor + 0.1 - (5 - qualityRating) _ (0.08 + (5 - qualityRating) _ 0.02)
);
}
newItem.last_quality_rating = qualityRating;
newItem.last_reviewed_at = new Date().toISOString();
newItem.next_review_date = addDays(new Date(), newItem.interval_days).toISOString();
return newItem;
}

Local Notification Scheduling

When an SRS item is created or a task reminder is set, call:

import \* as Notifications from 'expo-notifications';

async function scheduleLocalNotification(reminder: Reminder): Promise<string> {
const notificationId = await Notifications.scheduleNotificationAsync({
content: {
title: reminder.title,
body: reminder.body,
data: { reminderId: reminder.id, type: reminder.reminder_type },
},
trigger: { date: new Date(reminder.scheduled_time) },
});
// Store the notificationId in the reminders table
await db.runAsync(
'UPDATE reminders SET expo_notification_id = ? WHERE id = ?',
[notificationId, reminder.id]
);
return notificationId;
}

When a Task Is Rescheduled

This is the most critical flow. The steps must be:

1. Cancel the existing expo-notifications notification using the stored expo_notification_id
2. Update the reminders row with is_cancelled = 1, updated_at = now()
3. Create a new reminders row with the new scheduled_time
4. Schedule a new local notification, store the new expo_notification_id
5. Persist the task's updated due_date / start_time in the tasks table

async function rescheduleTaskReminder(taskId: string, newTime: Date) {
const db = await getDatabase();
// 1. Find existing reminder
const existing = await db.getFirstAsync<Reminder>(
'SELECT \* FROM reminders WHERE task_id = ? AND is_cancelled = 0', [taskId]
);
if (existing?.expo_notification_id) {
// 2. Cancel old notification
await Notifications.cancelScheduledNotificationAsync(existing.expo_notification_id);
await db.runAsync(
'UPDATE reminders SET is_cancelled = 1, updated_at = ? WHERE id = ?',
[now(), existing.id]
);
}
// 3-4. Create and schedule new reminder
const newReminder = buildReminder(taskId, newTime);
await db.runAsync('INSERT INTO reminders ...', [...]);
await scheduleLocalNotification(newReminder);
}

On app cold start: Call Notifications.getAllScheduledNotificationsAsync() and cross-reference against the reminders table. Any expo_notification_id in the DB
that is no longer in the OS-scheduled list means the notification fired or was cancelled by the OS. Mark those reminders as fired_at = now() and trigger any
SRS review prompts.

---

7. Migration Path to Supabase (Future)

Step 1 — Add auth without touching existing data

When auth is added:

1. Create a Supabase account for the user (sign-up)
2. Generate a user_id (UUID) from Supabase
3. Store it in AsyncStorage as the device's "owner id"
4. Update every local row: UPDATE tasks SET user_id = ? WHERE user_id IS NULL

Convention to follow NOW: Add a user_id TEXT column to every table in the SQLite schema, defaulting to a device-local UUID generated on first app launch.
Store this device UUID in AsyncStorage under @elaro/device_id. This UUID becomes the user_id when the user signs up.

// On app first launch
async function getOrCreateDeviceId(): Promise<string> {
const existing = await AsyncStorage.getItem('@elaro/device_id');
if (existing) return existing;
const newId = uuid.v4();
await AsyncStorage.setItem('@elaro/device_id', newId);
return newId;
}

Step 2 — Claiming local data after sign-up

The "claim" flow:

1. User signs up → Supabase returns a real user_id
2. App calls a Supabase Edge Function claim-device-data with { device_id, supabase_user_id }
3. Edge function accepts the sync payload (see Step 3) and inserts all rows into Supabase with the real user_id
4. On success, app updates AsyncStorage to replace device_id with supabase_user_id
5. All subsequent inserts use the real user_id

Step 3 — Sync protocol (UUID matching + conflict resolution)

Because every local row already uses UUID v4 as its id, you can use upsert with ON CONFLICT (id) DO UPDATE in Supabase. No ID translation needed.

async function syncToSupabase(tableName: string, rows: Row[]) {
const { error } = await supabase
.from(tableName)
.upsert(rows, { onConflict: 'id' });
if (!error) {
const ids = rows.map(r => r.id);
await db.runAsync(
`UPDATE ${tableName} SET synced_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
[now(), ...ids]
);
}
}

Conflict resolution policy: updated_at wins. In the upsert, only update the Supabase row if the local updated_at > supabase.updated_at. For the reverse
(Supabase → device), only overwrite local if supabase.updated_at > local.updated_at.

Sync query: To find unsynced rows: SELECT \* FROM tasks WHERE synced_at IS NULL OR updated_at > synced_at.

Conventions to follow NOW that make migration easy

┌─────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────┐
│ Convention │ Reason │
├─────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ Every table has id TEXT PRIMARY KEY (UUID v4) │ Maps directly to Supabase UUID PK — no ID translation │
├─────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ Every table has synced_at TEXT │ The sync query is just WHERE synced_at IS NULL │
├─────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ Every table has user_id TEXT (device UUID now, real UUID later) │ No schema change at migration time │
├─────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ created_at / updated_at in ISO8601 │ PostgreSQL accepts without conversion │
├─────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ JSON blobs use snake_case keys in the JSON too │ PostgreSQL JSONB queries will work the same │
├─────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ No auto-increment IDs anywhere │ Auto-increment IDs cannot be synced across devices │
├─────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ Business logic in pure JS functions, not SQL procedures │ SQLite has no stored procedures; Supabase Edge Functions replace them │
└─────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────┘

Supabase Edge Functions: Keep vs. Rebuild

┌──────────────────────────────────────────────────────┬──────────────┬─────────────────────────────────────────────────────┐
│ Function │ Verdict │ Notes │
├──────────────────────────────────────────────────────┼──────────────┼─────────────────────────────────────────────────────┤
│ auth-signup │ KEEP │ Needed for sign-up flow │
├──────────────────────────────────────────────────────┼──────────────┼─────────────────────────────────────────────────────┤
│ api-v2 │ REBUILD │ Too tightly coupled to current schema │
├──────────────────────────────────────────────────────┼──────────────┼─────────────────────────────────────────────────────┤
│ srs-system │ KEEP as base │ SRS logic is sound; adapt to accept local UUIDs │
├──────────────────────────────────────────────────────┼──────────────┼─────────────────────────────────────────────────────┤
│ migrate-encrypt-user-data │ KEEP │ Useful for data migration at claim time │
├──────────────────────────────────────────────────────┼──────────────┼─────────────────────────────────────────────────────┤
│ admin-\* │ KEEP │ Operational tooling │
├──────────────────────────────────────────────────────┼──────────────┼─────────────────────────────────────────────────────┤
│ check-username, restore-account, soft-delete-account │ KEEP │ Standard account ops │
├──────────────────────────────────────────────────────┼──────────────┼─────────────────────────────────────────────────────┤
│ All analytics/cost tracking functions │ REBUILD │ Depends on subscription tier logic being redesigned │
└──────────────────────────────────────────────────────┴──────────────┴─────────────────────────────────────────────────────┘

---

8. Deletion Checklist

Order from safest (leaf nodes, no dependents) to deepest (central infrastructure). Each step should leave the app compilable.

Phase 1 — External Analytics & Monitoring (no UI dependents)

1. Delete src/services/analytics.ts, src/services/mixpanel.ts, src/services/analyticsEvents.ts
2. Delete src/services/errorTracking.ts (src/services/monitoring/sentry.ts)
3. Delete src/services/revenueCat.ts
4. Delete src/services/healthCheckService.ts, src/services/networkMonitoring.ts, src/services/cacheMonitoring.ts, src/services/bundleSizeTracking.ts,
   src/services/PerformanceMonitoringService.ts
5. Remove the 3 initialize() calls from App.tsx (RevenueCat, Mixpanel, Sentry) and any imports of those services

Phase 2 — Standalone feature folders (nothing imports from them)

6. Delete src/features/admin/
7. Delete src/features/dev/ ⚠️ (keep if notification testing is wanted)
8. Delete src/features/support/ (and src/shared/utils/getSecureChatLink.ts)
9. Delete src/features/system-health/
10. Delete src/features/data-management/
11. Delete src/features/subscription/ — also remove PaywallScreen, OddityWelcomeScreen from AuthenticatedNavigator.tsx
12. Delete src/features/settings/AnalyticsToggle.tsx

Phase 3 — Contexts with no surviving dependents

13. Delete src/contexts/UsageLimitPaywallContext.tsx — remove from AppProviders.tsx
14. Delete src/contexts/SoftLaunchContext.tsx — remove from AppProviders.tsx
15. Delete src/contexts/OnboardingContext.tsx — remove from AppProviders.tsx

Phase 4 — Onboarding & user profile (auth-only screens)

16. Delete src/features/onboarding/ — remove OnboardingNavigator from navigation
17. Delete src/features/user-profile/screens/AccountScreen.tsx, DeviceManagementScreen.tsx, LoginHistoryScreen.tsx, DeleteAccountScreen.tsx
18. Delete src/features/user-profile/components/SubscriptionManagementCard.tsx
19. Remove the deleted screens from AuthenticatedNavigator.tsx

Phase 5 — Auth feature services (not the screens yet)

20. Delete src/features/auth/services/AuthAnalyticsService.ts
21. Delete src/features/auth/services/BiometricAuthService.ts, src/features/auth/hooks/useBiometricAuth.ts
22. Delete src/features/auth/services/SessionTimeoutService.ts, src/features/auth/hooks/useSessionTimeout.ts
23. Delete src/features/auth/permissions/ entirely (PermissionService, PermissionCacheService, PermissionConstants, permissionGuard)
24. Delete src/shared/hooks/usePermissions.ts — fix the 1 import in useQuickAddForm.ts (remove the task-limit check)
25. Remove LockedItemsBanner, UsageLimitPaywall, AuthIssueModal, UpgradeSuccessModal, SyncIndicator, OfflineBanner from src/shared/components/

Phase 6 — Auth screens and navigator

26. Delete all auth screens: AuthScreen, EnhancedAuthScreen, MFAEnrollmentScreen, MFAVerificationScreen, ForgotPasswordScreen, ResetPasswordScreen,
    AppWelcomeScreen
27. Delete src/navigation/AuthNavigator.tsx
28. Rewrite src/navigation/AppNavigator.tsx — remove auth gating entirely, always render AuthenticatedNavigator

Phase 7 — Install SQLite and build local data layer

29. npx expo install expo-sqlite
30. Create src/services/database.ts with schema and migration runner
31. Create src/services/localRepository.ts with generic CRUD helpers typed to the schema
32. Implement getOrCreateDeviceId() in src/utils/deviceId.ts

Phase 8 — Rewrite feature services (one feature at a time; keep app compiling)

33. Rewrite src/features/courses/services/queries.ts + mutations.ts → SQLite
34. Rewrite src/features/assignments/services/queries.ts + mutations.ts → SQLite
35. Rewrite src/features/lectures/services/queries.ts + mutations.ts → SQLite
36. Rewrite src/features/studySessions/services/queries.ts + mutations.ts → SQLite
37. Rewrite src/features/tasks/services/RecurringTaskService.ts → pure JS + SQLite
38. Rewrite src/features/srs/services/SRSSchedulingService.ts → pure JS + SQLite + expo-notifications
39. Rewrite src/features/srs/services/SRSAnalyticsService.ts → SQLite reads
40. Rewrite src/features/templates/hooks/useTemplateManagement.ts → SQLite

Phase 9 — Replace AuthContext

41. Delete src/contexts/AuthContext.tsx
42. Delete src/features/auth/services/UserProfileService.ts
43. Grep for every useAuth() call in the codebase. For each:


    - If it only uses user.id → replace with useDeviceId() hook
    - If it checks session or isLoading → remove the guard entirely
    - If it calls signOut() → remove the sign-out button/flow

Phase 10 — Remove Supabase core

44. Delete src/services/supabase.ts
45. Delete src/services/authService.ts
46. Delete src/services/authSync.ts
47. Delete src/services/syncManager.ts, src/services/navigationSync.ts, src/services/settingsSync.ts, src/services/studySessionSync.ts
48. Delete src/services/api/ directory (Supabase query/mutation/mapper layer)
49. Delete src/services/ApiVersioningService.ts, src/services/VersionedApiClient.ts, src/services/RequestDeduplicationService.ts
50. Delete src/services/updateService.ts (OTA updates)

Phase 11 — Package cleanup

51. npm uninstall @supabase/supabase-js @invertase/react-native-apple-authentication expo-apple-authentication expo-auth-session expo-local-authentication
    react-native-purchases mixpanel-react-native @sentry/react-native jsonwebtoken react-native-qrcode-svg react-native-webview react-native-copilot
    react-native-confetti-cannon tinycolor2 dotenv @react-native-community/netinfo expo-sharing expo-image-picker expo-image-manipulator expo-av expo-clipboard
    expo-linking expo-web-browser expo-updates
52. Verify nativewind / tailwindcss-react-native usage: grep -r "className=" src/ — if zero results, uninstall both
53. Run npx expo-doctor to catch any unresolved native module issues after uninstalling

Phase 12 — Final navigation cleanup

54. Audit AuthenticatedNavigator.tsx — remove any remaining auth/subscription screen registrations
55. Remove multi-HomeScreen duplicates (RefactoredHomeScreen, OptimizedHomeScreen) — keep one
56. Remove AppWelcomeScreen from startup if it still appears

---

⚠️ Items requiring verification before proceeding:

- expo-secure-store: grep for usage outside biometric auth — if used for any other sensitive storage, keep and replace the biometric usage only
- expo-crypto: grep for usage outside auth key derivation
- expo-device: grep for usage outside Sentry/biometric
- nativewind / className=: grep before uninstalling — the build will silently break without it if any component uses className props
- Which of the 3 HomeScreen variants is actually mounted by AuthenticatedNavigator — check line by line before deleting the others
- usePermissions callers: do a project-wide grep before deleting the service so no broken import is left behind
