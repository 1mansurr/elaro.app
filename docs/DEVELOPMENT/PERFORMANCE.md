# Performance Optimization Guide

## Overview

This guide covers performance optimization strategies, patterns, and best practices for the ELARO application.

## Caching Strategy

### React Query Caching

React Query provides intelligent caching of server data:

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['assignments', userId],
  queryFn: () => fetchAssignments(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### Cache Configuration

- **staleTime**: How long data is considered fresh (5 minutes default)
- **cacheTime**: How long unused data stays in cache (10 minutes default)
- **refetchOnWindowFocus**: Refetch when window regains focus
- **refetchOnReconnect**: Refetch when network reconnects

### Cache Invalidation

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['assignments'] });

// Invalidate all queries
queryClient.invalidateQueries();
```

## Memoization

### Component Memoization

```typescript
import React, { memo } from 'react';

// Memoize expensive components
export const ExpensiveComponent = memo(
  ({ data }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return prevProps.data.id === nextProps.data.id;
  },
);
```

### Hook Memoization

```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Style Memoization

```typescript
import { useThemedStyles } from '@/hooks/useThemedStyles';

// Memoized styles (only re-renders when theme changes)
const themedStyles = useThemedStyles(theme => ({
  container: {
    backgroundColor: theme.background,
    padding: SPACING.md,
  },
}));
```

## Code Splitting

### Lazy Loading Components

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Feature-Based Splitting

Each feature is loaded on demand:

```typescript
// Features are automatically code-split
import { AssignmentScreen } from '@/features/assignments';
import { CourseScreen } from '@/features/courses';
```

## Image Optimization

### Optimize Images

- Use appropriate image formats (WebP when possible)
- Compress images before adding to assets
- Use responsive image sizes
- Lazy load images below the fold

### Image Caching

```typescript
import { Image } from 'react-native';

<Image
  source={{ uri: imageUrl }}
  cache="force-cache" // Cache images
  resizeMode="cover"
/>
```

## Memory Management

### Prevent Memory Leaks

```typescript
import { useEffect } from 'react';

useEffect(() => {
  const subscription = subscribeToUpdates();

  // Cleanup on unmount
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### List Optimization

```typescript
import { FlatList } from 'react-native';

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  removeClippedSubviews={true} // Remove off-screen views
  maxToRenderPerBatch={10} // Render 10 items per batch
  windowSize={10} // Render 10 screens worth of items
  initialNumToRender={10} // Initial render count
/>
```

## Performance Monitoring

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <AppContent />
      {__DEV__ && <ReactQueryDevtools />}
    </>
  );
}
```

### Performance Metrics

Monitor these key metrics:

- **Time to Interactive (TTI)**: When app becomes interactive
- **First Contentful Paint (FCP)**: When first content renders
- **Bundle Size**: Monitor bundle size growth
- **Memory Usage**: Track memory consumption

## Best Practices

### ✅ DO

- **Memoize expensive calculations** with `useMemo`
- **Memoize callbacks** with `useCallback`
- **Use React.memo** for pure components
- **Lazy load** heavy components
- **Optimize images** before adding to assets
- **Clean up subscriptions** in useEffect
- **Use FlatList** for long lists
- **Monitor performance** regularly

### ❌ DON'T

- Don't over-memoize (only memoize expensive operations)
- Don't create new objects/arrays in render
- Don't use inline functions in render (use useCallback)
- Don't load all data at once (paginate)
- Don't ignore memory leaks
- Don't skip performance monitoring

## Performance Checklist

- [ ] React Query caching configured
- [ ] Expensive components memoized
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Memory leaks prevented
- [ ] List rendering optimized
- [ ] Performance metrics monitored

## Additional Resources

- [React Query Performance](https://tanstack.com/query/latest/docs/react/guides/performance)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [React Native Performance](https://reactnative.dev/docs/performance)
