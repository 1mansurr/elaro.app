# API Migration Guide: Legacy to Versioned API

This guide helps you migrate from the existing API structure to the new versioned API system.

## Overview

The new versioned API system provides:

- **Automatic version management** with backward compatibility
- **Deprecation warnings** and migration guidance
- **Consolidated Edge Functions** (reduced from 73 to 4 main functions)
- **Batch operations** for multiple API calls
- **Enhanced error handling** with version-specific responses

## Migration Steps

### 1. Update API Client Usage

**Before (Legacy):**

```typescript
import { api } from '@/services/api';

// ⚠️ DEPRECATED: getAll() methods now return paginated results
// Old code may break - getAll() returns CoursesPage, not Course[]
const coursesPage = await api.courses.getAll({ pageParam: 0, pageSize: 50 });
const courses = coursesPage.courses; // Extract array from paginated response

// For assignments, lectures, study sessions, use listPage() instead
const assignmentsPage = await api.assignments.listPage({
  pageParam: 0,
  pageSize: 50,
});
const assignments = assignmentsPage.assignments;
```

**After (Versioned):**

```typescript
import { versionedApiClient } from '@/services/VersionedApiClient';

// Versioned API calls with automatic compatibility checking
const courses = await versionedApiClient.getCourses();
const assignments = await versionedApiClient.getAssignments();
```

### 2. Use React Hooks for State Management

**Before (Legacy):**

```typescript
import { useQuery } from '@tanstack/react-query';

// ⚠️ DEPRECATED: getAll() now returns paginated results
const { data: coursesPage, isLoading } = useQuery({
  queryKey: ['courses'],
  queryFn: () => api.courses.getAll({ pageParam: 0, pageSize: 50 }),
});
// Extract courses array from paginated response
const courses = coursesPage?.courses || [];
```

**After (Versioned):**

```typescript
import { useCourses } from '@/hooks/useVersionedApi';

const { data, loading, error, deprecationWarning } = useCourses();
```

### 3. Handle Version Warnings

**New Feature - Version Warnings:**

```typescript
import { useApiVersion } from '@/hooks/useVersionedApi';

const { currentVersion, migrationRecommendations, upgradeToLatest } =
  useApiVersion();

// Check for deprecation warnings
if (migrationRecommendations.length > 0) {
  console.warn('API version warnings:', migrationRecommendations);
  // Optionally upgrade to latest
  await upgradeToLatest();
}
```

### 4. Batch Operations

**New Feature - Batch Operations:**

```typescript
import { useBatchOperations } from '@/hooks/useVersionedApi';

const { executeBatch } = useBatchOperations();

// Execute multiple operations in a single request
const result = await executeBatch([
  { type: 'course', table: 'courses', action: 'create', data: courseData },
  {
    type: 'assignment',
    table: 'assignments',
    action: 'create',
    data: assignmentData,
  },
  { type: 'lecture', table: 'lectures', action: 'create', data: lectureData },
]);
```

### 5. Update Component Usage

**Before (Legacy):**

```typescript
import { useQuery } from '@tanstack/react-query';

function CoursesScreen() {
  // ⚠️ DEPRECATED: Use useCourses() hook instead (see After section)
  const { data: coursesPage, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.courses.getAll({ pageParam: 0, pageSize: 50 }),
  });
  const courses = coursesPage?.courses || [];

  if (isLoading) return <LoadingSpinner />;
  return <CoursesList courses={courses} />;
}
```

**After (Versioned):**

```typescript
import { useCourses } from '@/hooks/useVersionedApi';
import { VersionInfo } from '@/components/VersionInfo';

function CoursesScreen() {
  const { data: courses, loading, error, deprecationWarning } = useCourses();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      {deprecationWarning && <VersionInfo showDetails />}
      <CoursesList courses={courses} />
    </View>
  );
}
```

## API Endpoint Changes

### Consolidated Edge Functions

| Legacy Function     | New Consolidated Function | Endpoint                          |
| ------------------- | ------------------------- | --------------------------------- |
| `create-course`     | `api-v2`                  | `/api-v2/courses/create`          |
| `update-course`     | `api-v2`                  | `/api-v2/courses/update/{id}`     |
| `delete-course`     | `api-v2`                  | `/api-v2/courses/delete/{id}`     |
| `create-assignment` | `api-v2`                  | `/api-v2/assignments/create`      |
| `update-assignment` | `api-v2`                  | `/api-v2/assignments/update/{id}` |
| `delete-assignment` | `api-v2`                  | `/api-v2/assignments/delete/{id}` |
| `send-notification` | `notification-system`     | `/notification-system/send`       |
| `schedule-reminder` | `notification-system`     | `/notification-system/schedule`   |
| `admin-export`      | `admin-system`            | `/admin-system/export`            |
| `health-check`      | `admin-system`            | `/admin-system/health`            |

### Batch Operations

| Operation           | Endpoint            | Method |
| ------------------- | ------------------- | ------ |
| Multiple operations | `/batch-operations` | POST   |
| Batch create        | `/batch-operations` | POST   |
| Batch update        | `/batch-operations` | POST   |
| Batch delete        | `/batch-operations` | POST   |

## Version Headers

The new API system includes comprehensive version headers:

```http
X-API-Version: v2
X-Supported-Versions: v1,v2
X-Latest-Version: v2
X-Deprecated-Version: true (if using deprecated version)
X-Sunset-Date: 2024-12-31 (if version will be sunset)
X-Migration-Guide: https://docs.elaro.app/migration/v1-to-v2
```

## Error Handling

**Before (Legacy):**

```typescript
try {
  const result = await api.courses.create(courseData);
} catch (error) {
  console.error('API Error:', error);
}
```

**After (Versioned):**

```typescript
const { data, error, deprecationWarning } =
  await versionedApiClient.createCourse(courseData);

if (error) {
  console.error('API Error:', error);
}

if (deprecationWarning) {
  console.warn('API version is deprecated');
}
```

## Migration Checklist

- [ ] Update API client usage to use `versionedApiClient`
- [ ] Replace React Query hooks with versioned hooks (`useCourses`, `useAssignments`, etc.)
- [ ] Add `VersionInfo` component to screens that need version awareness
- [ ] Update error handling to check for `deprecationWarning`
- [ ] Test batch operations for bulk data operations
- [ ] Update notification calls to use `notification-system`
- [ ] Update admin operations to use `admin-system`
- [ ] Remove direct calls to individual Edge Functions
- [ ] Add version compatibility checking to app initialization

## Benefits of Migration

1. **Reduced Complexity**: 73 Edge Functions → 4 consolidated functions
2. **Better Performance**: Batch operations reduce network requests
3. **Version Safety**: Automatic compatibility checking and warnings
4. **Future-Proof**: Easy to add new API versions without breaking changes
5. **Better Error Handling**: Version-specific error messages and guidance
6. **Maintainability**: Centralized API logic with consistent patterns

## Support

For questions about the migration:

- Check the API documentation: `/docs/api-versioning`
- Review migration examples in `/examples/api-migration`
- Contact the development team for assistance
