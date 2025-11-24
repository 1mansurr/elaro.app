# Performance Patterns Guide

## Overview

This guide documents performance optimization patterns used throughout the ELARO app, focusing on list virtualization, memoization, and rendering optimization.

---

## List Virtualization

### FlatList Performance Props

All FlatLists should include these performance optimization props:

```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  // Performance optimizations
  removeClippedSubviews={true}        // Remove off-screen views
  maxToRenderPerBatch={10}            // Items per render batch
  windowSize={5}                       // Viewport multiplier
  updateCellsBatchingPeriod={50}      // Batch update timing (ms)
  initialNumToRender={10}              // Initial render count
/>
```

### What Each Prop Does

**`removeClippedSubviews`**

- Removes views outside viewport from native view hierarchy
- Reduces memory usage
- Improves scroll performance
- **Use:** Always `true` for long lists

**`maxToRenderPerBatch`**

- Number of items rendered per batch
- Lower = smoother scrolling, more batches
- Higher = fewer batches, potential stutter
- **Recommended:** `10` (balanced)

**`windowSize`**

- Viewport size multiplier
- `5` = renders 5x visible area worth of items
- Lower = less memory, more re-renders
- Higher = more memory, fewer re-renders
- **Recommended:** `5` (balanced)

**`updateCellsBatchingPeriod`**

- Time between batch updates (milliseconds)
- Lower = more responsive, more CPU
- Higher = less CPU, less responsive
- **Recommended:** `50ms` (smooth)

**`initialNumToRender`**

- Number of items rendered initially
- Should cover first screen
- **Recommended:** `10-15` items

### getItemLayout (Optional, but Powerful)

For fixed-height items, provide `getItemLayout`:

```typescript
const getItemLayout = (data: any, index: number) => ({
  length: ITEM_HEIGHT,        // Fixed height in pixels
  offset: ITEM_HEIGHT * index,
  index,
});

<FlatList
  getItemLayout={getItemLayout}
  // ... other props
/>
```

**Benefits:**

- Eliminates layout calculations
- Faster scrolling
- Better scroll position accuracy

**When to Use:**

- ✅ Fixed-height items (cards, rows)
- ✅ Known item sizes
- ❌ Variable-height items (unless you can calculate)

---

## Memoization Patterns

### React.memo() for Components

Wrap frequently-rendered components:

```typescript
// ✅ GOOD: Memoized list item
const CourseItem = React.memo(({ course, onPress }) => {
  // Component logic
});

// Use in FlatList
<FlatList
  renderItem={({ item }) => <CourseItem course={item} onPress={handlePress} />}
/>
```

**When to Memoize:**

- List items in FlatLists
- Components that render frequently but rarely change
- Components with expensive renders
- Components passed as props

**When NOT to Memoize:**

- Simple components (overhead > benefit)
- Components that always receive new props
- Components with constantly changing data

### useCallback() for Functions

Wrap functions passed as props:

```typescript
// ✅ GOOD: Memoized callback
const handlePress = useCallback((id: string) => {
  navigateToCourse(id);
}, [navigateToCourse]);

// Pass to memoized component
<CourseItem course={course} onPress={handlePress} />
```

**Why:** Prevents memoized components from re-rendering when function reference changes

### useMemo() for Expensive Calculations

Cache expensive computations:

```typescript
// ✅ GOOD: Memoized calculation
const filteredCourses = useMemo(() => {
  return courses.filter(course => course.name.includes(searchQuery));
}, [courses, searchQuery]);
```

**When to Use:**

- Filtering large arrays
- Sorting data
- Transforming data
- Complex calculations

---

## OptimizedFlatList Component

Use `OptimizedFlatList` for pre-configured performance:

```typescript
import { OptimizedFlatList } from '@/shared/components/OptimizedFlatList';

<OptimizedFlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  estimatedItemSize={100}  // Optional: for getItemLayout
/>
```

**Benefits:**

- Pre-configured performance props
- Consistent settings across app
- Easy to use

---

## Performance Checklist

### For Every FlatList:

- [ ] Added `removeClippedSubviews={true}`
- [ ] Set `maxToRenderPerBatch={10}`
- [ ] Set `windowSize={5}`
- [ ] Set `updateCellsBatchingPeriod={50}`
- [ ] Set `initialNumToRender={10}`
- [ ] Added `getItemLayout` if fixed-height items
- [ ] Memoized `renderItem` function with `useCallback`
- [ ] Memoized item components with `React.memo`
- [ ] Stable `keyExtractor` function

### For List Item Components:

- [ ] Wrapped with `React.memo()`
- [ ] Callback props wrapped with `useCallback`
- [ ] Minimal prop dependencies
- [ ] Avoid inline object/array creation in render

---

## Common Patterns

### Pattern 1: Memoized List Item

```typescript
// Item component (extracted, memoized)
const CourseItem = React.memo(({ course, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(course.id)}>
      <Text>{course.name}</Text>
    </TouchableOpacity>
  );
});

// Screen component
const CoursesScreen = () => {
  const handlePress = useCallback((id: string) => {
    navigation.navigate('CourseDetail', { courseId: id });
  }, [navigation]);

  const renderItem = useCallback(({ item }) => (
    <CourseItem course={item} onPress={handlePress} />
  ), [handlePress]);

  return (
    <FlatList
      data={courses}
      renderItem={renderItem}
      // ... performance props
    />
  );
};
```

### Pattern 2: Fixed Height with getItemLayout

```typescript
const ITEM_HEIGHT = 100;

const getItemLayout = (data: any, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

<FlatList
  data={items}
  getItemLayout={getItemLayout}
  // ... other props
/>
```

### Pattern 3: Variable Height Calculation

```typescript
// If items have known but variable heights
const getItemHeight = (item: any) => {
  if (item.type === 'large') return 150;
  if (item.type === 'small') return 80;
  return 100;
};

const getItemLayout = (data: any, index: number) => {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += getItemHeight(data[i]);
  }
  return {
    length: getItemHeight(data[index]),
    offset,
    index,
  };
};
```

---

## Performance Monitoring

### React DevTools Profiler

Use to identify re-render hotspots:

1. Open React DevTools
2. Go to Profiler tab
3. Record while using app
4. Identify components with frequent re-renders
5. Apply memoization where needed

### Common Hotspots

1. **List Items Re-rendering**
   - **Fix:** `React.memo()` + `useCallback()` for callbacks

2. **Parent State Changes**
   - **Fix:** Split contexts, use local state

3. **Expensive Calculations**
   - **Fix:** `useMemo()` for computations

4. **Inline Functions/Objects**
   - **Fix:** Extract, memoize, or use refs

---

## Best Practices

### ✅ DO

- Always use performance props on FlatLists
- Memoize list item components
- Use `useCallback` for renderItem functions
- Provide `getItemLayout` for fixed-height items
- Extract list items outside parent component
- Keep renderItem functions stable

### ❌ DON'T

- Create inline functions in renderItem
- Create inline objects in renderItem
- Skip performance props on long lists
- Forget to memoize callbacks passed to memoized components
- Use `key` prop instead of `keyExtractor`

---

## Performance Targets

### Scroll Performance

- **Target:** 60 FPS (16ms per frame)
- **Measure:** React DevTools Profiler
- **Optimize:** Reduce renderItem complexity, use getItemLayout

### Memory Usage

- **Target:** Minimal growth during scrolling
- **Measure:** React Native Debugger
- **Optimize:** Use removeClippedSubviews, limit windowSize

### Initial Render

- **Target:** < 100ms for first screen
- **Measure:** Performance API
- **Optimize:** Reduce initialNumToRender, lazy load images

---

## Troubleshooting

### List Scrolling is Janky

1. Check if `removeClippedSubviews` is enabled
2. Reduce `maxToRenderPerBatch` (try 5)
3. Add `getItemLayout` if fixed-height
4. Profile with React DevTools
5. Check if renderItem is memoized

### Too Much Memory Usage

1. Reduce `windowSize` (try 3)
2. Ensure `removeClippedSubviews={true}`
3. Check for memory leaks (unmounted components)
4. Profile memory with React Native Debugger

### Slow Initial Render

1. Reduce `initialNumToRender` (try 5)
2. Lazy load images
3. Defer non-critical content
4. Check for expensive computations

---

**Last Updated:** Phase 3 Implementation  
**Status:** Active Guide
