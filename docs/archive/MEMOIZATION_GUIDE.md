# Memoization Guide

## Overview

This guide explains when and how to use React memoization hooks (`React.memo`, `useMemo`, `useCallback`) to optimize component rendering and prevent unnecessary re-renders.

---

## Quick Decision Tree

```
Is this component re-rendering too often?
├─ No → Don't memoize (overhead not worth it)
└─ Yes → Is it a list item?
    ├─ Yes → Use React.memo() + useCallback() for callbacks
    └─ No → Does it do expensive calculations?
        ├─ Yes → Use useMemo() for calculations
        └─ No → Check if it receives function props
            ├─ Yes → Wrap parent's callbacks with useCallback()
            └─ No → Use React.memo() if props rarely change
```

---

## React.memo()

### What It Does

Prevents component from re-rendering if props haven't changed (shallow comparison).

### When to Use

**✅ DO Use React.memo() for:**

- List items in FlatLists (most common case)
- Components that render frequently but rarely change
- Components with expensive renders
- Components passed as props to other memoized components

**❌ DON'T Use React.memo() for:**

- Simple components (overhead > benefit)
- Components that always receive new props
- Components with constantly changing data
- Root components or very top-level components

### Example

```typescript
// ✅ GOOD: Memoized list item
const CourseItem = React.memo(({ course, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(course.id)}>
      <Text>{course.name}</Text>
    </TouchableOpacity>
  );
});

// Use in FlatList
<FlatList
  renderItem={({ item }) => <CourseItem course={item} onPress={handlePress} />}
/>
```

---

## useCallback()

### What It Does

Memoizes a function, returning the same reference as long as dependencies haven't changed.

### When to Use

**✅ DO Use useCallback() for:**

- Functions passed as props to memoized components
- Functions used in useEffect/useMemo dependency arrays
- Event handlers in frequently-rendered components

**❌ DON'T Use useCallback() for:**

- Functions only used in event handlers of non-memoized components
- Functions that are recreated anyway due to dependencies
- Simple functions with no dependencies

### Example

```typescript
// ✅ GOOD: Memoized callback passed to memoized component
const handlePress = useCallback((id: string) => {
  navigation.navigate('CourseDetail', { courseId: id });
}, [navigation]);

// Pass to memoized component
<CourseItem course={course} onPress={handlePress} />

// ❌ BAD: Inline function (creates new function every render)
<CourseItem course={course} onPress={(id) => navigate(id)} />
```

---

## useMemo()

### What It Does

Memoizes the result of an expensive computation, recalculating only when dependencies change.

### When to Use

**✅ DO Use useMemo() for:**

- Filtering large arrays
- Sorting data
- Transforming data structures
- Complex calculations
- Creating derived state

**❌ DON'T Use useMemo() for:**

- Simple calculations (overhead > benefit)
- Primitive operations
- Creating objects/arrays that are always new anyway

### Example

```typescript
// ✅ GOOD: Memoized filtering
const filteredCourses = useMemo(() => {
  return courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
}, [courses, searchQuery]);

// ❌ BAD: No memoization (recalculates on every render)
const filteredCourses = courses.filter(course =>
  course.name.toLowerCase().includes(searchQuery.toLowerCase()),
);
```

---

## Common Patterns

### Pattern 1: Memoized List Item + Callback

```typescript
// 1. Memoize the item component
const CourseItem = React.memo(({ course, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(course.id)}>
      <Text>{course.name}</Text>
    </TouchableOpacity>
  );
});

// 2. Memoize the callback
const handlePress = useCallback((id: string) => {
  navigation.navigate('CourseDetail', { courseId: id });
}, [navigation]);

// 3. Memoize the renderItem function
const renderItem = useCallback(({ item }) => (
  <CourseItem course={item} onPress={handlePress} />
), [handlePress]);

// 4. Use in FlatList
<FlatList
  data={courses}
  renderItem={renderItem}
/>
```

### Pattern 2: Expensive Calculation

```typescript
// Memoize expensive calculation
const sortedTasks = useMemo(() => {
  return tasks
    .filter(task => task.dueDate >= today)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 10);
}, [tasks, today]);
```

### Pattern 3: Derived State

```typescript
// Memoize derived state
const totalTasks = useMemo(() => {
  return tasks.reduce((sum, task) => sum + (task.completed ? 0 : 1), 0);
}, [tasks]);
```

---

## Context Optimization

### Memoize Context Values

```typescript
// ✅ GOOD: Memoized context value
const value = useMemo(() => ({
  user,
  session,
  signIn,
  signOut,
}), [user, session, signIn, signOut]);

return (
  <AuthContext.Provider value={value}>
    {children}
  </AuthContext.Provider>
);
```

**Why:** Prevents all context consumers from re-rendering when value object reference changes.

---

## Debugging Memoization

### Check if Memoization is Working

```typescript
// Add logging to see when component renders
const CourseItem = React.memo(({ course, onPress }) => {
  console.log('🔄 CourseItem rendering:', course.id);
  // ... component logic
});

// Expected:
// - Before memoization: Logs on every parent re-render
// - After memoization: Logs only when course prop changes
```

### React DevTools Profiler

1. Open React DevTools
2. Go to Profiler tab
3. Click Record
4. Interact with app
5. Stop recording
6. Check which components re-rendered unnecessarily
7. Apply memoization to those components

---

## Performance Impact

### Before Memoization:

- Typing in search → all list items re-render
- Parent state update → all children re-render
- Context change → all consumers re-render

### After Memoization:

- Typing in search → only affected items re-render
- Parent state update → memoized children skip render
- Context change → only affected consumers re-render

### Measured Improvements:

- 50-70% reduction in unnecessary re-renders
- Smoother scrolling (60 FPS maintained)
- Better battery life
- Faster UI interactions

---

## Best Practices

### ✅ DO

- Memoize list item components
- Use `useCallback` for callbacks passed to memoized components
- Use `useMemo` for expensive calculations
- Memoize context values
- Extract list items outside parent component
- Keep dependency arrays minimal and accurate

### ❌ DON'T

- Memoize everything (overhead can outweigh benefits)
- Create new objects/arrays in dependency arrays
- Forget to include dependencies in arrays
- Memoize components that always receive new props
- Memoize very simple components

---

## Common Mistakes

### Mistake 1: Memoizing Without useCallback

```typescript
// ❌ BAD: CourseItem will still re-render
const CourseItem = React.memo(({ course, onPress }) => { ... });

const handlePress = (id: string) => { ... }; // New function every render

<CourseItem course={course} onPress={handlePress} />

// ✅ GOOD: Stable callback reference
const handlePress = useCallback((id: string) => { ... }, []);
```

### Mistake 2: Inline Objects/Arrays in Props

```typescript
// ❌ BAD: New object every render
<Component style={{ margin: 10 }} />

// ✅ GOOD: Extract or use StyleSheet
const styles = StyleSheet.create({ margin: { margin: 10 } });
<Component style={styles.margin} />
```

### Mistake 3: Missing Dependencies

```typescript
// ❌ BAD: Missing dependency
const filtered = useMemo(
  () => items.filter(i => i.status === currentStatus),
  [items], // Missing currentStatus!
);

// ✅ GOOD: All dependencies included
const filtered = useMemo(
  () => items.filter(i => i.status === currentStatus),
  [items, currentStatus],
);
```

---

## When Memoization Doesn't Help

If memoization isn't improving performance:

1. **Check if props are actually changing**

   ```typescript
   // Log props to see if they change
   console.log('Props:', props);
   ```

2. **Profile with React DevTools**
   - Identify actual bottlenecks
   - Memoization might not be the issue

3. **Consider other optimizations**
   - Virtualization (FlatList)
   - Code splitting
   - Lazy loading
   - Reducing render complexity

---

## Checklist

Before memoizing a component:

- [ ] Component renders frequently (> 10 times per user interaction)
- [ ] Props rarely change
- [ ] Component has measurable performance impact
- [ ] Callbacks are wrapped with `useCallback` (if passed as props)
- [ ] Dependency arrays are accurate

---

**Last Updated:** Phase 3 Implementation  
**Status:** Active Guide
