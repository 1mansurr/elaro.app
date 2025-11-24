# Deferred Features Documentation

**Last Updated:** January 2025  
**Purpose:** Document features that have been intentionally deferred or removed

---

## Overview

This document tracks features that have been:

- Removed but may be reintroduced
- Deferred to future releases
- Soft-launched (coming soon)
- Disabled for business reasons

---

## Soft Launch Features (Coming Soon)

These features are implemented but disabled during the soft launch period. They will be enabled when the full launch occurs.

### 1. **Oddity Subscription**

**Status:** Soft Launch - Coming Soon  
**Expected Launch:** Next week  
**Context:** `src/contexts/SoftLaunchContext.tsx`

**Description:**

- Full Oddity plan subscription ($1.99/month)
- Payment flow is blocked during soft launch
- Coming soon modals shown to users

**Enabling:**

- Set `isFeatureFlaggingEnabled: false` in SoftLaunchContext
- Uncomment payment logic in `useSubscription.ts`
- Remove soft launch blocking

---

### 2. **AI Study Guide**

**Status:** Soft Launch - Coming Soon  
**Feature Flag:** `premiumFeatures.aiStudyGuide`  
**Context:** `src/contexts/SoftLaunchContext.tsx`

**Description:**

- Personalized learning strategies
- Advanced study techniques
- Free bonus for Oddity members

**Message to Users:**

> "🎁 Bonus: AI Study Guide is coming soon! You will get personalized learning strategies and advanced study techniques as a free bonus for Oddity members."

---

### 3. **Advanced Spaced Repetition**

**Status:** Soft Launch - Coming Soon  
**Feature Flag:** `premiumFeatures.advancedSpacedRepetition`  
**Context:** `src/contexts/SoftLaunchContext.tsx`

**Description:**

- Intelligent review scheduling
- Extended intervals
- Advanced SRS algorithms

**Message to Users:**

> "🧠 Advanced Spaced Repetition is coming soon! Get intelligent review scheduling and extended intervals."

---

### 4. **Premium Analytics**

**Status:** Soft Launch - Coming Soon  
**Feature Flag:** `premiumFeatures.premiumAnalytics`  
**Context:** `src/contexts/SoftLaunchContext.tsx`

**Description:**

- Detailed progress tracking
- Advanced insights and trends
- Enhanced data visualization

**Message to Users:**

> "📊 Premium Analytics launching soon! Track your progress with detailed insights and trends."

---

### 5. **Unlimited Tasks**

**Status:** Soft Launch - Coming Soon  
**Feature Flag:** `premiumFeatures.unlimitedTasks`  
**Context:** `src/contexts/SoftLaunchContext.tsx`

**Description:**

- Remove task limits
- Plan with fewer restrictions
- Better organization capabilities

**Message to Users:**

> "🗂️ More tasks coming next week! Plan with fewer limits and organize your academic life."

**Current Limit:** 14 tasks per week (Origin plan)

---

### 6. **Priority Support**

**Status:** Soft Launch - Coming Soon  
**Feature Flag:** `premiumFeatures.prioritySupport`  
**Context:** `src/contexts/SoftLaunchContext.tsx`

**Description:**

- Faster response times
- Personalized help
- Priority ticket handling

**Message to Users:**

> "🎯 Priority Support launching soon! Get faster responses and personalized help."

---

### 7. **Learning Style Discovery**

**Status:** Soft Launch - Coming Soon  
**Feature Flag:** `premiumFeatures.learningStyleDiscovery`  
**Context:** `src/contexts/SoftLaunchContext.tsx`

**Description:**

- AI-powered learning style quiz
- Optimal study strategies
- Personalized recommendations

**Message to Users:**

> "🧠 Learning Style Discovery is launching soon! Take a quick AI-powered quiz to discover your optimal study strategies."

---

## Removed Features (May Be Reintroduced)

### 1. **Streak Service**

**Status:** Removed - May Reintroduce  
**File:** `src/services/supabase.ts:194`  
**Context:** TODO comment indicates it was removed

**Description:**

- Daily streak tracking
- Streak maintenance
- Motivation features

**Rationale:**

- Removed in previous refactoring
- May be reintroduced if prioritized

**Re-implementation:**

- Would need to be built from scratch
- Consider user engagement impact
- Evaluate if it aligns with current product goals

---

## Feature Flags System

### Current Implementation

- **Location:** `src/contexts/SoftLaunchContext.tsx`
- **Type:** Local feature flags (hardcoded)
- **Remote Config:** Commented out (future enhancement)

### Future Enhancement

Remote feature flags are planned but not implemented:

```typescript
// In the future, we will add a useEffect here to fetch flags from a remote service.
// useEffect(() => {
//   const fetchRemoteFlags = async () => {
//     const remoteFlags = await myRemoteConfigService.getFlags();
//     setFeatureFlags(remoteFlags);
//   };
//   fetchRemoteFlags();
// }, []);
```

**Recommended Services:**

- Firebase Remote Config
- LaunchDarkly
- Custom backend endpoint

---

## Deprecated Features

### 1. **TaskCreationFlow**

**Status:** Deprecated - Not Used  
**File:** `src/features/task-creation/screens/TaskCreationFlow.tsx`  
**Context:** Route removed from navigation

**Description:**

- Unified task creation flow
- Replaced by individual flows (AddAssignmentFlow, AddLectureFlow, etc.)

**Replacement:**

- `AddAssignmentFlow`
- `AddLectureFlow`
- `AddStudySessionFlow`

**Note:** File kept for reference but not imported anywhere.

---

## Enabling Soft Launch Features

### Step-by-Step Guide

1. **Update SoftLaunchContext.tsx:**

   ```typescript
   const defaultFeatureFlags = {
     isFeatureFlaggingEnabled: false, // Change to false to enable
     premiumFeatures: {
       aiStudyGuide: { enabled: true, block: false },
       // ... other features
     },
   };
   ```

2. **Restore Payment Flow:**
   - Uncomment payment logic in `useSubscription.ts`
   - Remove soft launch blocking
   - Test payment integration

3. **Update Navigation:**
   - Remove premium screen blocking in `HomeScreen.tsx`
   - Restore original button actions
   - Test navigation flows

4. **Update UI:**
   - Remove coming soon banners
   - Restore original button text
   - Update PlanCard to show pricing

5. **Test Thoroughly:**
   - Verify all premium features work
   - Test payment flow end-to-end
   - Verify analytics tracking

---

## Feature Launch Checklist

When launching a deferred feature:

- [ ] Remove feature flag blocking
- [ ] Update UI to remove "Coming Soon" messaging
- [ ] Test feature end-to-end
- [ ] Update documentation
- [ ] Verify analytics tracking
- [ ] Test edge cases
- [ ] Update user-facing documentation
- [ ] Notify users (if applicable)

---

## Notes

- All soft launch features are fully implemented but gated
- Feature flags can be toggled individually
- Remote config is planned for future dynamic control
- No breaking changes expected when enabling features

---

**Related Documentation:**

- `SOFT_LAUNCH_IMPLEMENTATION.md` - Detailed soft launch guide
- `src/contexts/SoftLaunchContext.tsx` - Feature flag implementation
- `docs/TODO_BACKLOG.md` - Related TODO items
