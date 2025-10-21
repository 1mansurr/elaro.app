# Search with Debouncing Implementation Summary

## Overview
This document summarizes the implementation of search functionality with debouncing on the CoursesScreen. Debouncing ensures that API requests are only sent after the user has stopped typing for a brief moment, preventing excessive backend requests and improving performance.

**Implementation Date**: January 2025

---

## Problem Statement

Without debouncing, when a user types "React Native" in a search bar, the app would send 12 separate API requests (one for "R", one for "Re", one for "Rea", and so on). This is incredibly inefficient, floods the backend with unnecessary requests, and leads to a sluggish user experience.

---

## Solution Implemented

Implemented a search feature with 500ms debouncing on the CoursesScreen. The search bar updates instantly, but API requests are only sent after the user stops typing for 500ms.

---

## Files Created

### 1. **useDebounce Hook**
**File**: `src/hooks/useDebounce.ts`

**Features**:
- ✅ Generic, reusable debounce hook
- ✅ Configurable delay (default: 500ms)
- ✅ Proper cleanup to prevent memory leaks
- ✅ Type-safe with TypeScript generics

**Implementation**:
```typescript
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Create debounced function
    const { debounced, cancel } = debounce(() => {
      setDebouncedValue(value);
    }, delay);

    // Call the debounced function
    debounced();

    // Cleanup: cancel any pending debounce on unmount or value change
    return () => {
      cancel();
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Usage Example**:
```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearchQuery = useDebounce(searchQuery, 500);

// debouncedSearchQuery only updates after user stops typing for 500ms
```

---

## Files Modified

### 2. **Courses API**
**File**: `src/features/courses/services/queries.ts`

**Changes**:
- Added optional `searchQuery` parameter to `getAll()` method
- Implemented case-insensitive search using `.ilike()` filter
- Only applies filter when searchQuery is provided and not empty

**Before**:
```typescript
export const coursesApi = {
  async getAll(): Promise<Course[]> {
    try {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapDbCourseToAppCourse);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
```

**After**:
```typescript
export const coursesApi = {
  async getAll(searchQuery?: string): Promise<Course[]> {
    try {
      let query = supabase.from('courses').select('*');
      
      // Apply search filter if searchQuery is provided
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.ilike('course_name', `%${searchQuery.trim()}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(mapDbCourseToAppCourse);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
```

---

### 3. **useCourses Hook**
**File**: `src/hooks/useDataQueries.ts`

**Changes**:
- Added optional `searchQuery` parameter
- Included `searchQuery` in the React Query cache key
- Passes `searchQuery` to the API function

**Before**:
```typescript
export const useCourses = () => {
  return useQuery<Course[], Error>({
    queryKey: ['courses'],
    queryFn: api.courses.getAll,
  });
};
```

**After**:
```typescript
export const useCourses = (searchQuery?: string) => {
  return useQuery<Course[], Error>({
    queryKey: ['courses', searchQuery || ''], // Include searchQuery in the query key
    queryFn: () => api.courses.getAll(searchQuery),
  });
};
```

**Why include searchQuery in queryKey?**
- React Query caches different search results separately
- Each search query gets its own cache entry
- Prevents unnecessary refetches when switching between searches

---

### 4. **CoursesScreen Component**
**File**: `src/features/courses/screens/CoursesScreen.tsx`

**Changes**:

1. **Added imports**:
```typescript
import { useState } from 'react';
import { TextInput } from 'react-native';
import { useDebounce } from '@/hooks/useDebounce';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
```

2. **Added search state and debouncing**:
```typescript
// Search state
const [searchQuery, setSearchQuery] = useState('');

// Debounce the search query (500ms delay)
const debouncedSearchQuery = useDebounce(searchQuery, 500);

// Use the debounced search query in the API call
const { data: courses, isLoading, isError, error, refetch, isRefetching } = useCourses(
  debouncedSearchQuery.trim() || undefined
);
```

3. **Added search bar UI**:
```typescript
{/* Search Bar */}
<View style={styles.searchContainer}>
  <View style={styles.searchInputContainer}>
    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search courses..."
      placeholderTextColor={COLORS.textSecondary}
      value={searchQuery}
      onChangeText={setSearchQuery}
      autoCapitalize="none"
      autoCorrect={false}
    />
    {searchQuery.length > 0 && (
      <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
        <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    )}
  </View>
</View>
```

4. **Added clear search handler**:
```typescript
const handleClearSearch = () => {
  setSearchQuery('');
};
```

5. **Updated empty state messages**:
```typescript
<QueryStateWrapper
  // ... other props
  emptyTitle={searchQuery.trim() ? "No courses found" : "No courses yet"}
  emptyMessage={
    searchQuery.trim()
      ? `No courses match "${searchQuery}". Try a different search term.`
      : "Start by adding your first course to organize your academic schedule!"
  }
  emptyIcon="book-outline"
>
```

6. **Added search bar styles**:
```typescript
searchContainer: {
  padding: SPACING.md,
  backgroundColor: '#f8f9fa',
},
searchInputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 12,
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.sm,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
searchIcon: {
  marginRight: SPACING.sm,
},
searchInput: {
  flex: 1,
  fontSize: 16,
  color: COLORS.text,
  paddingVertical: SPACING.xs,
},
clearButton: {
  marginLeft: SPACING.sm,
  padding: SPACING.xs,
},
```

---

### 5. **Hooks Index**
**File**: `src/hooks/index.ts`

**Changes**:
- Exported `useDebounce` hook

```typescript
export { useDebounce } from './useDebounce';
```

---

## How It Works

### **Search Flow:**

1. **User types in search bar** → `searchQuery` state updates immediately
2. **`useDebounce` hook** → Waits 500ms after user stops typing
3. **`debouncedSearchQuery` updates** → Triggers `useCourses` hook to refetch
4. **React Query caches** → Uses `['courses', searchQuery]` as cache key
5. **API call** → Filters courses using `.ilike()` on `course_name` field
6. **UI updates** → Shows filtered results

### **Visual Timeline:**

```
User types: "R" → "Re" → "Rea" → "Reac" → "React"
              ↓      ↓      ↓       ↓        ↓
searchQuery:   R     Re    Rea    Reac    React
              ↓      ↓      ↓       ↓        ↓
              │      │      │       │        │
              └──────┴──────┴───────┴────────┘
                           │
                           │ 500ms delay
                           │
                           ↓
debouncedSearchQuery:    React
                           ↓
                    API call with "React"
```

**Result**: Only 1 API call instead of 5! 🎉

---

## Benefits

### **Performance:**
- 🚀 **Reduced API calls** - Only searches after user stops typing
- 💾 **Efficient caching** - React Query caches search results
- ⚡ **Fast filtering** - Database-level filtering with `.ilike()`
- 🔄 **Smart refetching** - Only refetches when search query changes

### **User Experience:**
- 🎯 **Instant feedback** - Search bar updates immediately
- 🔍 **Smart search** - Case-insensitive, partial matching
- 🧹 **Easy to clear** - One-tap clear button
- 📱 **Responsive** - No lag or freezing
- 💬 **Helpful messages** - Different empty states for no results vs no courses

### **Developer Experience:**
- 🔧 **Reusable hook** - `useDebounce` can be used anywhere
- 🎨 **Clean code** - Separation of concerns
- 🛡️ **Type-safe** - Full TypeScript support
- 📦 **Easy to maintain** - Simple, understandable logic
- 🧪 **Easy to test** - Clear separation of concerns

---

## Technical Details

### **Debouncing Mechanism:**

The `useDebounce` hook uses the `debounce` utility we fixed earlier:

```typescript
const { debounced, cancel } = debounce(() => {
  setDebouncedValue(value);
}, delay);
```

- **`debounced`**: Function that delays execution
- **`cancel`**: Function that cancels pending execution
- **Cleanup**: Cancels pending debounce on unmount or value change

### **React Query Caching:**

```typescript
queryKey: ['courses', searchQuery || '']
```

- Each search query gets its own cache entry
- Switching between searches uses cached data
- Prevents unnecessary refetches

### **Database Filtering:**

```typescript
query = query.ilike('course_name', `%${searchQuery.trim()}%`);
```

- **`.ilike()`**: Case-insensitive LIKE operator
- **`%...%`**: Matches anywhere in the string
- **`.trim()`**: Removes leading/trailing whitespace

---

## Testing Recommendations

### **Test Search Functionality:**

1. **Basic Search:**
   - Type "React" in search bar
   - Wait 500ms
   - **Expected**: Only courses with "React" in name appear

2. **Case Insensitive:**
   - Type "react" (lowercase)
   - **Expected**: Finds "React Native" course

3. **Partial Match:**
   - Type "Nat"
   - **Expected**: Finds "React Native" course

4. **Clear Search:**
   - Type something
   - Tap the X button
   - **Expected**: All courses reappear

5. **No Results:**
   - Type "xyz123"
   - **Expected**: Empty state with "No courses found"

6. **Debouncing:**
   - Type "R", "Re", "Rea", "Reac", "React" quickly
   - **Expected**: Only one API call after 500ms of no typing

### **Test Edge Cases:**

1. **Empty Search:**
   - Type something, then delete it
   - **Expected**: All courses reappear

2. **Whitespace:**
   - Type "  React  " (with spaces)
   - **Expected**: Trims whitespace and searches for "React"

3. **Special Characters:**
   - Type "React-Native"
   - **Expected**: Handles special characters correctly

4. **Rapid Typing:**
   - Type very quickly
   - **Expected**: Debouncing prevents excessive API calls

---

## Best Practices

### 1. **Always Include Search Query in Cache Key**
```typescript
queryKey: ['courses', searchQuery || '']
```
This ensures React Query caches different search results separately.

### 2. **Trim Search Query**
```typescript
searchQuery.trim()
```
Removes leading/trailing whitespace for cleaner searches.

### 3. **Use Case-Insensitive Search**
```typescript
.ilike('course_name', `%${searchQuery}%`)
```
Provides better user experience with flexible matching.

### 4. **Provide Clear Feedback**
```typescript
emptyTitle={searchQuery.trim() ? "No courses found" : "No courses yet"}
```
Different messages for different states help users understand what's happening.

### 5. **Add Clear Button**
```typescript
{searchQuery.length > 0 && (
  <TouchableOpacity onPress={handleClearSearch}>
    <Ionicons name="close-circle" size={20} />
  </TouchableOpacity>
)}
```
Makes it easy for users to reset the search.

---

## Future Enhancements

### Potential Improvements:

1. **Search Highlighting**
   - Highlight matching text in search results
   - Use a library like `react-native-highlight-words`

2. **Search History**
   - Remember recent searches
   - Show suggestions as user types

3. **Advanced Filters**
   - Filter by course code
   - Filter by date range
   - Multiple search criteria

4. **Search Analytics**
   - Track popular searches
   - Identify search patterns
   - Optimize search performance

5. **Fuzzy Search**
   - Handle typos
   - Suggest similar results
   - Use a library like `fuse.js`

6. **Search Debounce Configuration**
   - Make delay configurable
   - Different delays for different screens
   - Adaptive debouncing based on network speed

---

## Troubleshooting

### Issue: Search not working
**Solution**: Check that `debouncedSearchQuery` is being passed to `useCourses()`

### Issue: Too many API calls
**Solution**: Verify that `useDebounce` is properly delaying updates

### Issue: Search results not cached
**Solution**: Ensure `searchQuery` is included in the React Query `queryKey`

### Issue: Search bar not clearing
**Solution**: Check that `handleClearSearch` is properly resetting `searchQuery`

### Issue: Case-sensitive search
**Solution**: Verify that `.ilike()` is being used instead of `.eq()`

---

## Summary

✅ **5 files created/modified**
- 1 new hook created
- 4 files updated

✅ **Zero linter errors**
✅ **Fully type-safe**
✅ **Memory leak safe**
✅ **Production ready**

The search with debouncing feature is now fully implemented and provides an efficient, user-friendly search experience. Users can search for courses without flooding the backend with unnecessary requests, and the app feels fast and responsive.

---

## References

- [Debouncing Explained](https://www.freecodecamp.org/news/javascript-debounce-example/)
- [React Query Caching](https://tanstack.com/query/latest/docs/react/guides/caching)
- [Supabase Filters](https://supabase.com/docs/reference/javascript/using-filters)
- [React Native TextInput](https://reactnative.dev/docs/textinput)

