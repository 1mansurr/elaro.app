# State Management Guidelines

## Overview

This document defines guidelines for when to use local state vs global state (Context), helping developers make optimal state management decisions.

---

## Decision Framework

### Use Local State (Component State / useState)

**When:**

- State is used by only one component
- State doesn't need to be shared between components
- State is UI-only (e.g., modal visibility, input values, temporary selections)
- State is derived from props
- State can be passed down via props easily

**Examples:**

```typescript
// ✅ GOOD: Local state for modal visibility
const [isModalOpen, setIsModalOpen] = useState(false);

// ✅ GOOD: Local state for form input
const [inputValue, setInputValue] = useState('');

// ✅ GOOD: Local state for temporary UI state
const [selectedItems, setSelectedItems] = useState<string[]>([]);
```

**Benefits:**

- Simple and straightforward
- No performance overhead
- Component is self-contained
- Easy to understand and maintain

---

### Use Global State (Context / Shared State)

**When:**

- State is used by multiple components across the app
- State represents core business logic (auth, user profile, theme)
- State needs to persist across navigation
- State is accessed from many places (prop drilling would be excessive)
- State represents app-wide configuration

**Examples:**

```typescript
// ✅ GOOD: Global state for authentication
const { user, session } = useAuth(); // Used throughout app

// ✅ GOOD: Global state for theme
const { theme, isDark } = useTheme(); // Used by all components

// ✅ GOOD: Global state for network status
const { isOnline } = useNetwork(); // Used for offline handling
```

**Benefits:**

- Avoids prop drilling
- Single source of truth
- Consistent state across app
- Easy to access from anywhere

---

## Context Audit

### Current Contexts Analysis

#### 1. **ThemeContext** ✅ Global (Correct)

**Purpose:** App-wide theme (light/dark mode)  
**Used By:** All themed components  
**Status:** ✅ Appropriate - global state needed

#### 2. **AuthContext** ✅ Global (Correct)

**Purpose:** User authentication state  
**Used By:** Navigation guards, user screens, API calls  
**Status:** ✅ Appropriate - global state needed

#### 3. **NetworkContext** ✅ Global (Correct)

**Purpose:** Network connectivity status  
**Used By:** Offline handling, sync indicators  
**Status:** ✅ Appropriate - global state needed

#### 4. **NotificationContext** ⚠️ Review Needed

**Purpose:** Notification state and task to show  
**Used By:** Notification handlers, TaskDetailSheet  
**Status:** ⚠️ **Potential Optimization** - Could be simplified

**Analysis:**

- `taskToShow` might be better as navigation params or local state
- Notification state is mostly UI-only
- Consider: Move to local state or navigation state

#### 5. **ToastContext** ⚠️ Review Needed

**Purpose:** Toast notifications  
**Used By:** Throughout app for user feedback  
**Status:** ⚠️ **Could be improved** - Currently global but UI-only

**Analysis:**

- Toast is app-wide UI feedback - global makes sense
- But implementation could be optimized with useMemo
- Consider: Keep global but optimize with memoization

#### 6. **SoftLaunchContext** ✅ Global (Correct)

**Purpose:** Feature flags for soft launch  
**Used By:** Multiple features to check premium access  
**Status:** ✅ Appropriate - global config needed

#### 7. **OnboardingContext** ⚠️ Review Needed

**Purpose:** Onboarding flow state  
**Used By:** Onboarding screens only  
**Status:** ⚠️ **Consider Local** - Used only in onboarding flow

**Analysis:**

- Only used within onboarding flow
- Could be local to OnboardingNavigator or OnboardingProvider
- But: Provides better isolation, so keeping global is acceptable

#### 8. **CreationFlowContext** ✅ Context (Correct)

**Purpose:** Multi-step form state  
**Used By:** Creation flows (courses, assignments, etc.)  
**Status:** ✅ Appropriate - shared within flow, local to flow

---

## Guidelines Summary

### When to Create a Context

**Create a Context when:**

1. State is used by 3+ components across different parts of the app
2. State represents core business logic (auth, user, theme)
3. Prop drilling would require passing through 3+ component levels
4. State needs to persist across navigation

**Don't Create a Context when:**

1. State is only used in one component → Use `useState`
2. State is only used in parent-child relationship → Pass via props
3. State is UI-only temporary state (modals, dropdowns)
4. State can be derived from props

### Context Optimization Best Practices

1. **Split Contexts by Concern**

   ```typescript
   // ✅ GOOD: Separate contexts
   <AuthProvider>
     <ThemeProvider>
       <NetworkProvider>
   ```

2. **Use useMemo for Context Values**

   ```typescript
   // ✅ GOOD: Memoize context value
   const value = useMemo(
     () => ({
       user,
       session,
       signIn,
       signOut,
     }),
     [user, session],
   );
   ```

3. **Split Large Contexts**

   ```typescript
   // ❌ BAD: One giant context
   const AppContext = { auth, theme, network, notifications, ... };

   // ✅ GOOD: Separate contexts
   <AuthProvider>
     <ThemeProvider>
       <NetworkProvider>
   ```

4. **Avoid Context for UI-Only State**

   ```typescript
   // ❌ BAD: Context for modal visibility
   const ModalContext = { isOpen, setIsOpen };

   // ✅ GOOD: Local state or props
   const [isOpen, setIsOpen] = useState(false);
   ```

---

## Migration Examples

### Example 1: Moving UI State to Local

**Before (Global Context):**

```typescript
// contexts/ModalContext.tsx
const [isModalOpen, setIsModalOpen] = useState(false);
// Used by: Only one component
```

**After (Local State):**

```typescript
// Component.tsx
const [isModalOpen, setIsModalOpen] = useState(false);
// Self-contained, no context needed
```

### Example 2: Optimizing Context with useMemo

**Before:**

```typescript
const value = {
  user,
  session,
  signIn,
  signOut,
};
```

**After:**

```typescript
const value = useMemo(
  () => ({
    user,
    session,
    signIn,
    signOut,
  }),
  [user, session],
);
```

---

## Performance Considerations

### Context Re-render Impact

**Problem:** Context value changes cause all consumers to re-render

**Solution:** Split contexts, memoize values, use selectors

```typescript
// ✅ GOOD: Split contexts prevent unnecessary re-renders
<AuthProvider>
  <ThemeProvider>
    // Theme change doesn't re-render auth consumers
```

### Local State Performance

**Benefit:** Local state changes only affect the component

```typescript
// ✅ FAST: Only this component re-renders
const [count, setCount] = useState(0);
```

---

## Current State Analysis

### Contexts That Are Optimal ✅

- `AuthContext` - Global auth state
- `ThemeContext` - Global theme
- `NetworkContext` - Global network status
- `SoftLaunchContext` - Global feature flags
- `CreationFlowContext` - Flow-specific (used correctly)

### Contexts to Optimize ⚠️

- `ToastContext` - Could add useMemo for value
- `NotificationContext` - Could simplify (taskToShow might be better as navigation state)

### Contexts That Are Fine ✅

- `OnboardingContext` - Provides good isolation, acceptable

---

## Checklist for New State

When adding new state, ask:

1. **Is it used by only one component?** → Use `useState`
2. **Is it used by parent + child?** → Pass via props
3. **Is it used by 3+ unrelated components?** → Consider Context
4. **Is it business logic (auth, user, theme)?** → Use Context
5. **Is it UI-only (modals, dropdowns)?** → Use local state
6. **Can it be derived from props?** → Use useMemo, not state

---

## Best Practices

### ✅ DO

- Use local state for UI-only temporary state
- Use Context for truly global business state
- Split large contexts into smaller ones
- Memoize context values with useMemo
- Pass simple props instead of Context when possible

### ❌ DON'T

- Create Context for single-component state
- Create Context for parent-child prop passing
- Create one giant Context with everything
- Forget to memoize context values
- Use Context for derived state

---

## Quick Reference

| State Type         | Solution   | Example                        |
| ------------------ | ---------- | ------------------------------ |
| Component-only     | `useState` | Modal visibility, input values |
| Parent → Child     | Props      | Form data to child form field  |
| 3+ Components      | Context    | Auth, theme, network           |
| Business Logic     | Context    | User data, subscriptions       |
| UI-only Temporary  | `useState` | Dropdown open/closed           |
| Derived from Props | `useMemo`  | Computed values                |

---

**Last Updated:** Phase 3 Implementation  
**Status:** Active Guidelines
