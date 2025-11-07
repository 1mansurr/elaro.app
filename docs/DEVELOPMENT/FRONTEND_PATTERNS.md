# Frontend Patterns Guide

## Overview

This guide covers common frontend patterns, implementation strategies, and best practices used throughout the ELARO application.

## React Query Patterns

### Optimistic Updates

Update UI immediately, rollback on failure:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateAssignment,
  onMutate: async (newAssignment) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['assignments'] });

    // Snapshot previous value
    const previousAssignments = queryClient.getQueryData(['assignments']);

    // Optimistically update
    queryClient.setQueryData(['assignments'], (old) => {
      return old.map(assignment =>
        assignment.id === newAssignment.id ? newAssignment : assignment
      );
    });

    return { previousAssignments };
  },
  onError: (err, newAssignment, context) => {
    // Rollback on error
    queryClient.setQueryData(['assignments'], context.previousAssignments);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['assignments'] });
  },
});
```

### Query State Wrapper

Simplified loading/error/empty state handling:

```typescript
import { QueryStateWrapper } from '@/shared/components';

function AssignmentsScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['assignments'],
    queryFn: fetchAssignments,
  });

  return (
    <QueryStateWrapper
      isLoading={isLoading}
      error={error}
      empty={!data?.length}
      emptyMessage="No assignments yet"
    >
      <AssignmentsList data={data} />
    </QueryStateWrapper>
  );
}
```

## Search with Debouncing

### Debounced Search Hook

```typescript
import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 500);

  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchItems(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  return (
    <Input
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholder="Search..."
    />
  );
}
```

## Pull to Refresh

### Implementation

```typescript
import { RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';

function DataScreen() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      }
    >
      {/* Content */}
    </ScrollView>
  );
}
```

## Skeleton Loading

### Skeleton Component

```typescript
import { SkeletonLoader } from '@/shared/components';

function LoadingScreen() {
  return (
    <View>
      <SkeletonLoader width="100%" height={60} />
      <SkeletonLoader width="80%" height={40} />
      <SkeletonLoader width="90%" height={40} />
    </View>
  );
}
```

### Usage Pattern

```typescript
function DataScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return <DataContent data={data} />;
}
```

## Session Timeout

### Implementation

```typescript
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

function App() {
  useSessionTimeout({
    timeout: 30 * 60 * 1000, // 30 minutes
    onTimeout: () => {
      // Clear auth state
      // Redirect to login
    },
  });

  return <AppContent />;
}
```

## Request Timeout

### Network Request with Timeout

```typescript
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number = 15000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};
```

## Error Handling Patterns

### Network Error Handler

```typescript
import { handleNetworkError } from '@/utils/errorHandling';

try {
  const data = await fetchData();
} catch (error) {
  const userMessage = handleNetworkError(error);
  showToast(userMessage);
}
```

### Error Boundary

```typescript
import { ErrorBoundary } from '@/shared/components';

function App() {
  return (
    <ErrorBoundary
      fallback={<ErrorScreen />}
      onError={(error, errorInfo) => {
        // Log to error tracking service
        logError(error, errorInfo);
      }}
    >
      <AppContent />
    </ErrorBoundary>
  );
}
```

## Form Validation Patterns

### Zod Schema Validation

```typescript
import { z } from 'zod';

const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dueDate: z.string().datetime('Invalid date'),
  priority: z.enum(['low', 'medium', 'high']),
});

function AssignmentForm() {
  const [errors, setErrors] = useState({});

  const handleSubmit = (data) => {
    try {
      const validated = assignmentSchema.parse(data);
      // Submit validated data
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.flatten().fieldErrors);
      }
    }
  };
}
```

## Navigation Patterns

### Deep Linking

```typescript
import { Linking } from 'react-native';

// Handle deep links
useEffect(() => {
  const handleDeepLink = (url: string) => {
    // Parse URL and navigate
    const route = parseDeepLink(url);
    navigation.navigate(route.screen, route.params);
  };

  Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
  
  // Handle initial URL
  Linking.getInitialURL().then(url => {
    if (url) handleDeepLink(url);
  });
}, []);
```

### Navigation State Persistence

```typescript
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const navigationRef = createNavigationContainerRef();

function App() {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Restore navigation state
        restoreNavigationState();
      }}
      onStateChange={(state) => {
        // Persist navigation state
        persistNavigationState(state);
      }}
    >
      <AppNavigator />
    </NavigationContainer>
  );
}
```

## Best Practices

### ✅ DO

- **Use optimistic updates** for better UX
- **Debounce search inputs** to reduce API calls
- **Show skeleton loaders** during data fetching
- **Handle errors gracefully** with user-friendly messages
- **Validate forms** with Zod schemas
- **Implement pull-to-refresh** for data screens
- **Use QueryStateWrapper** for consistent loading states

### ❌ DON'T

- Don't make API calls on every keystroke (use debouncing)
- Don't show raw error messages to users
- Don't skip loading states
- Don't forget to handle network timeouts
- Don't ignore form validation

## Additional Resources

- [React Query Patterns](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Zod Validation](https://zod.dev/)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)

