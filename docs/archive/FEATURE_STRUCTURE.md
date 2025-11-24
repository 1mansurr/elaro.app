# Feature Structure Standard

## Overview

This document defines the standard directory structure for all features in the ELARO app. Following this structure ensures consistency, maintainability, and scalability.

---

## Standard Feature Structure

```
src/features/[feature-name]/
├── components/          # Feature-specific UI components
│   ├── ComponentName.tsx
│   ├── AnotherComponent.tsx
│   └── index.ts         # Barrel export file
├── screens/             # Feature screens/pages
│   ├── ScreenName.tsx
│   ├── AnotherScreen.tsx
│   └── index.ts         # Barrel export file
├── services/            # Feature business logic and API calls
│   ├── mutations.ts     # Create/Update/Delete operations
│   ├── queries.ts       # Read operations
│   └── index.ts         # Barrel export file
├── hooks/               # Feature-specific React hooks
│   ├── useFeatureHook.ts
│   └── index.ts         # Barrel export file
├── contexts/            # Feature-specific React contexts (if needed)
│   ├── FeatureContext.tsx
│   └── index.ts         # Barrel export file
├── types/               # Feature-specific TypeScript types (optional)
│   ├── featureTypes.ts
│   └── index.ts         # Barrel export file
├── utils/               # Feature-specific utility functions (optional)
│   ├── featureUtils.ts
│   └── index.ts         # Barrel export file
├── __tests__/           # Feature tests (optional, recommended)
│   ├── ComponentName.test.tsx
│   └── services.test.ts
└── index.ts             # Feature-level barrel export (optional)
```

---

## Directory Purposes

### `components/`

**Purpose:** Feature-specific UI components used only within this feature.

**Guidelines:**

- Components used by only this feature
- If used by multiple features → move to `@/shared/components/`
- Should have an `index.ts` barrel file for clean imports
- No nested subdirectories (keep flat)

**Example:**

```typescript
// ✅ Good structure
src/features/courses/components/
  ├── CourseCard.tsx
  ├── CourseList.tsx
  └── index.ts

// ❌ Avoid nested subdirectories
src/features/dashboard/components/
  └── HomeScreen/          # Don't nest like this
      ├── HomeScreenHeader.tsx
      └── ...
```

---

### `screens/`

**Purpose:** Feature screens that are registered with the navigation system.

**Guidelines:**

- One screen per file
- Screens are registered in navigation
- Should have an `index.ts` barrel file
- Can have subdirectories for flow-based organization (e.g., `add-flow/`, `edit-flow/`)

**Example:**

```typescript
// ✅ Good structure
src/features/courses/screens/
  ├── CoursesScreen.tsx
  ├── CourseDetailScreen.tsx
  ├── EditCourseModal.tsx
  ├── add-flow/           # Flow-based subdirectory is OK
  │   ├── Step1Screen.tsx
  │   └── Step2Screen.tsx
  └── index.ts
```

---

### `services/`

**Purpose:** Feature-specific business logic, API calls, and data operations.

**Guidelines:**

- Split into `mutations.ts` (write operations) and `queries.ts` (read operations)
- Can have additional service files if needed (e.g., `analytics.ts`, `validation.ts`)
- Should have an `index.ts` barrel file

**Example:**

```typescript
// ✅ Good structure
src/features/courses/services/
  ├── mutations.ts      # createCourse, updateCourse, deleteCourse
  ├── queries.ts        # getCourses, getCourseById
  └── index.ts
```

---

### `hooks/`

**Purpose:** Feature-specific React hooks.

**Guidelines:**

- Custom hooks used only within this feature
- If used by multiple features → move to `@/shared/hooks/` or `@/hooks/`
- Should have an `index.ts` barrel file

**Example:**

```typescript
// ✅ Good structure
src/features/courses/hooks/
  ├── useCourseDetail.ts
  ├── useCourseList.ts
  └── index.ts
```

---

### `contexts/`

**Purpose:** Feature-specific React contexts (only if needed).

**Guidelines:**

- Only create if state needs to be shared across multiple components in the feature
- If state is global → use a shared context
- Should have an `index.ts` barrel file

**Example:**

```typescript
// ✅ Good structure
src/features/courses/contexts/
  ├── AddCourseContext.tsx   # Context for multi-step course creation
  └── index.ts
```

---

### `types/` (Optional)

**Purpose:** Feature-specific TypeScript types.

**Guidelines:**

- Types used only within this feature
- If types are shared → move to `@/types/`
- Can be imported from other features using type-only imports: `import type { ... }`
- Should have an `index.ts` barrel file

---

### `utils/` (Optional)

**Purpose:** Feature-specific utility functions.

**Guidelines:**

- Utilities used only within this feature
- If utilities are shared → move to `@/shared/utils/` or `@/utils/`
- Should have an `index.ts` barrel file

---

### `__tests__/` (Optional, Recommended)

**Purpose:** Feature tests.

**Guidelines:**

- Unit tests for components, services, hooks
- Integration tests for feature flows
- Follow Jest/React Native Testing Library patterns

---

### `index.ts` (Optional)

**Purpose:** Feature-level barrel export.

**Guidelines:**

- Export commonly used components, hooks, services
- Makes imports cleaner: `import { ... } from '@/features/courses'`
- Don't export everything, only what's commonly used

**Example:**

```typescript
// src/features/courses/index.ts
export { default as CoursesScreen } from './screens/CoursesScreen';
export { useCourseDetail } from './hooks/useCourseDetail';
export * from './services';
```

---

## Barrel Files (`index.ts`)

Every directory should have an `index.ts` barrel file for clean imports.

**Pattern:**

```typescript
// src/features/[feature]/components/index.ts
export { default as ComponentName } from './ComponentName';
export { default as AnotherComponent } from './AnotherComponent';

// src/features/[feature]/screens/index.ts
export { default as ScreenName } from './ScreenName';
export { default as AnotherScreen } from './AnotherScreen';

// src/features/[feature]/services/index.ts
export * from './mutations';
export * from './queries';
```

**Benefits:**

- Clean imports: `import { ComponentName } from '@/features/feature/components'`
- Easy refactoring (change file name, update one export)
- Consistent import patterns

---

## Current Feature Audit

### ✅ Features Following Standard

- `auth/` - Complete structure
- `calendar/` - Good structure
- `courses/` - Good structure
- `notifications/` - Good structure
- `srs/` - Simple, correct structure

### ⚠️ Features Needing Standardization

#### `dashboard/`

**Issue:** Has nested `components/HomeScreen/` directory with tests and docs.

**Current:**

```
dashboard/
  └── components/
      ├── HomeScreen/              # ❌ Nested subdirectory
      │   ├── __tests__/
      │   ├── ARCHITECTURE.md
      │   ├── HomeScreenHeader.tsx
      │   └── ...
      ├── HomeScreenContent.tsx   # Duplicate at root level
      └── ...
```

**Should Be:**

```
dashboard/
  └── components/
      ├── HomeScreenHeader.tsx     # ✅ Flat structure
      ├── HomeScreenContent.tsx
      ├── HomeScreenFAB.tsx
      ├── HomeScreenModals.tsx
      ├── NextTaskCard.tsx
      └── index.ts
  └── __tests__/                   # ✅ Tests at feature level
      └── components/
          └── HomeScreenHeader.test.tsx
```

**Migration:**

- Move `HomeScreen/` contents to `components/` root
- Move tests to feature-level `__tests__/`
- Move docs to feature-level or `docs/`
- Update all imports

---

## Decision Tree

### Should this code be in a feature directory?

**Feature-Specific Code** → Feature directory

- Used only by this feature
- Business logic specific to feature
- UI components unique to feature

**Shared Code** → Shared directories

- Used by 2+ features → `@/shared/`
- Used app-wide → `@/hooks/`, `@/services/`, `@/contexts/`
- Types → `@/types/`

### Where should tests go?

**Feature Tests** → `features/[feature]/__tests__/`

- Component tests → `__tests__/components/`
- Service tests → `__tests__/services/`
- Hook tests → `__tests__/hooks/`

**Shared Tests** → `__tests__/` at root

- Shared component tests
- Integration tests
- E2E tests

---

## Examples

### Example 1: Simple Feature (SRS)

```
srs/
├── hooks/
│   ├── useSRSAnalytics.ts
│   ├── useSRSScheduling.ts
│   └── index.ts
├── services/
│   ├── SRSAnalyticsService.ts
│   ├── SRSSchedulingService.ts
│   └── index.ts
└── index.ts
```

✅ **Correct:** Simple, no unnecessary nesting

### Example 2: Complex Feature (Courses)

```
courses/
├── components/
│   └── index.ts
├── contexts/
│   ├── AddCourseContext.tsx
│   └── index.ts
├── screens/
│   ├── CoursesScreen.tsx
│   ├── CourseDetailScreen.tsx
│   ├── EditCourseModal.tsx
│   ├── add-flow/
│   │   ├── Step1Screen.tsx
│   │   └── Step2Screen.tsx
│   └── index.ts
├── services/
│   ├── mutations.ts
│   ├── queries.ts
│   └── index.ts
└── index.ts
```

✅ **Correct:** Well-organized, flow subdirectories are acceptable

### Example 3: What NOT to Do (Dashboard - Current)

```
dashboard/
└── components/
    ├── HomeScreen/              # ❌ Avoid nested component directories
    │   ├── __tests__/           # ❌ Tests should be at feature level
    │   ├── ARCHITECTURE.md      # ❌ Docs shouldn't be in components
    │   └── HomeScreenHeader.tsx
    └── HomeScreenContent.tsx    # ❌ Duplicate at root
```

❌ **Incorrect:** Nested structure, misplaced tests/docs

---

## Migration Checklist

When standardizing a feature:

- [ ] Flatten nested component directories
- [ ] Move tests to feature-level `__tests__/`
- [ ] Move docs to feature-level or `docs/`
- [ ] Create barrel files (`index.ts`) for each directory
- [ ] Update all imports to use barrel files
- [ ] Verify no cross-feature imports
- [ ] Run linting: `npm run lint`
- [ ] Run import audit: `npm run audit:imports`

---

## Enforcement

### Validation Script

Run `npm run validate:structure` to check all features follow the standard.

### ESLint Rules

ESLint rules enforce import patterns (see `docs/IMPORT_POLICY.md`).

---

## Questions?

**Q: Can I have subdirectories in `screens/`?**  
A: Yes, for flow-based organization (e.g., `add-flow/`, `edit-flow/`). Avoid nesting deeper than one level.

**Q: Where do tests go?**  
A: Feature-level `__tests__/` directory. Mirror the structure: `__tests__/components/`, `__tests__/services/`.

**Q: Can I skip barrel files?**  
A: Not recommended. Barrel files make imports cleaner and refactoring easier.

**Q: What if a component is used by 2 features?**  
A: Move it to `@/shared/components/` so both features can import it.

---

**Last Updated:** Phase 2 Implementation  
**Status:** Active Standard
