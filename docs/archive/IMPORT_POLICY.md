# Import Policy - Feature Module Boundaries

## Overview

This document defines the import policies and boundaries for the ELARO app to maintain clean architecture and prevent feature coupling.

## Core Principles

1. **Features are independent** - Features should not directly depend on other features
2. **Shared code is centralized** - Common code goes in `shared/`, `services/`, `contexts/`, or `types/`
3. **Path aliases are preferred** - Use `@/` aliases instead of relative paths for cross-module imports
4. **Type-only imports are allowed** - TypeScript type imports from other features are permitted

---

## Allowed Import Patterns

### ✅ Within the Same Feature

```typescript
// ✅ OK: Importing from same feature
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { AuthScreen } from '@/features/auth/screens/AuthScreen';
```

### ✅ From Shared Resources

```typescript
// ✅ OK: Importing from shared modules
import { UnifiedButton } from '@/shared/components/UnifiedButton';
import { useNetwork } from '@/contexts/NetworkContext';
import { supabase } from '@/services/supabase';
import { User } from '@/types';
```

### ✅ Type-Only Imports (Cross-Feature)

```typescript
// ✅ OK: Type-only imports from other features
import type { Course } from '@/features/courses/services/queries';
import type { Template } from '@/features/templates/types';
```

---

## Restricted Import Patterns

### ❌ Cross-Feature Component/Code Imports

```typescript
// ❌ BAD: Importing components from another feature
import { TemplateBrowserModal } from '@/features/templates/components/TemplateBrowserModal';
// from '@/features/studySessions/screens/AddStudySessionScreen.tsx'

// ✅ GOOD: Move shared component to @/shared/ or create a shared interface
import { TemplateBrowserModal } from '@/shared/components/TemplateBrowserModal';
// OR: Extract interface to @/types and use composition
```

### ❌ Relative Paths (Cross-Module)

```typescript
// ❌ BAD: Deep relative paths (>2 levels)
import { helper } from '../../../utils/helper';
import { Component } from '../../../../shared/components/Component';

// ✅ GOOD: Use path aliases for cross-module imports
import { helper } from '@/utils/helper';
import { Component } from '@/shared/components/Component';

// ✅ OK: Shallow relative paths within same module (up to 2 levels)
import { localHelper } from '../utils/localHelper';
import { sibling } from './sibling';
```

---

## Feature Structure

Each feature should follow this structure:

```
src/features/[feature-name]/
├── components/     # Feature-specific UI components
├── screens/        # Feature screens
├── services/       # Feature business logic and API calls
├── hooks/          # Feature-specific hooks
├── contexts/        # Feature-specific contexts (if needed)
└── types/          # Feature-specific types (exported for type-only imports)
```

---

## Decision Tree: Where Should This Code Live?

### If code is used by ONE feature:

→ Place in that feature's directory

### If code is used by MULTIPLE features:

→ Move to `@/shared/` or appropriate shared location

### If code is used by ALL features:

→ Place in `@/shared/`, `@/services/`, `@/contexts/`, or `@/types/`

---

## Examples

### Example 1: Shared Component

```typescript
// ❌ BAD: studySessions importing from templates
// src/features/studySessions/screens/AddStudySessionScreen.tsx
import { TemplateBrowserModal } from '@/features/templates/components/TemplateBrowserModal';

// ✅ GOOD: Move to shared
// src/shared/components/TemplateBrowserModal.tsx
// Then import:
import { TemplateBrowserModal } from '@/shared/components/TemplateBrowserModal';
```

### Example 2: Shared Hook

```typescript
// ❌ BAD: Multiple features need the same hook
// src/features/courses/hooks/useDataFetch.ts
// src/features/assignments/hooks/useDataFetch.ts (duplicate)

// ✅ GOOD: Move to shared
// src/shared/hooks/useDataFetch.ts
// Then import:
import { useDataFetch } from '@/shared/hooks/useDataFetch';
```

### Example 3: Type Definitions

```typescript
// ✅ OK: Type-only import (doesn't create runtime dependency)
// src/features/studySessions/services/mutations.ts
import type { Template } from '@/features/templates/types';

// ❌ BAD: Runtime import creates dependency
import { templateService } from '@/features/templates/services/templateService';
// Move to @/shared/services/ if needed by multiple features
```

---

## Enforcement

### ESLint Rule

The `no-restricted-imports` rule enforces these patterns:

- Blocks cross-feature runtime imports
- Allows type-only imports
- Warns about deep relative paths

### Pre-commit Hook (Future)

A script will validate imports before commits to catch violations early.

---

## Migration Guide

### Step 1: Identify Cross-Feature Dependencies

Run the audit script:

```bash
npm run audit:imports
```

### Step 2: Decide Where Code Should Live

- Used by 2+ features? → Move to `@/shared/`
- Feature-specific? → Keep in feature, but create interface in `@/types/`

### Step 3: Refactor

1. Move shared code to appropriate shared location
2. Update imports across codebase
3. Verify no functionality is broken
4. Run tests

---

## Common Patterns

### Pattern 1: Feature Needs Data from Another Feature

```typescript
// ❌ BAD: Direct import
import { useCourses } from '@/features/courses/hooks/useCourses';

// ✅ GOOD: Use shared service or context
import { useCourses } from '@/shared/hooks/useCourses'; // If shared
// OR: Query through shared API layer
import { coursesQuery } from '@/services/api/courses';
```

### Pattern 2: Feature Needs UI Component from Another Feature

```typescript
// ❌ BAD: Direct import
import { CourseCard } from '@/features/courses/components/CourseCard';

// ✅ GOOD: Move to shared if reusable
import { CourseCard } from '@/shared/components/CourseCard';
// OR: Use composition/props pattern
```

### Pattern 3: Feature Needs Types from Another Feature

```typescript
// ✅ GOOD: Type-only import is fine
import type { Course } from '@/features/courses/types';
import type { Assignment } from '@/features/assignments/types';

// These don't create runtime dependencies
```

---

## Questions?

If you're unsure where code should live:

1. Check if it's used by multiple features → `@/shared/`
2. Check if it's business logic → `@/services/`
3. Check if it's UI → `@/shared/components/`
4. Check if it's state → `@/contexts/` (if global) or feature-specific

---

**Last Updated:** Phase 1 Implementation
**Status:** Active Enforcement
