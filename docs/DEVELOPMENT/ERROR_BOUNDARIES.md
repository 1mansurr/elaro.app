# Global Error Boundary Implementation

## Overview

Implemented a global Error Boundary system with React Query integration to catch unexpected crashes and provide users with a recovery mechanism.

## Changes Made

### 1. Created `src/shared/components/ErrorBoundary.tsx`

- **Purpose**: Global error boundary component that catches rendering errors across the entire app
- **Features**:
  - User-friendly error UI with clear messaging
  - "Restart App" button using `DevSettings.reload()`
  - Accepts `onReset` callback for React Query integration
  - Logs errors to console (ready for Sentry integration)
  - Uses theme colors for consistent styling

### 2. Updated `App.tsx`

- **Added imports**:
  - `QueryCache` and `useQueryErrorResetBoundary` from `@tanstack/react-query`
  - `ErrorBoundary` component
- **Enhanced QueryClient configuration**:
  - Added `QueryCache` with `onError` handler to log React Query errors
  - Ready for Sentry integration (commented out)
- **Created `AppWithErrorBoundary` component**:
  - Integrates React Query's error reset functionality with Error Boundary
  - Wraps the entire app with the Error Boundary
  - Uses `useQueryErrorResetBoundary` hook to provide reset functionality
- **Refactored navigation ref**:
  - Moved `navigationRef` outside the App component for accessibility

### 3. Updated `src/shared/components/index.ts`

- Added export for the new `ErrorBoundary` component

## How It Works

### Error Handling Flow

1. **Synchronous Errors**: Caught by `getDerivedStateFromError()` and `componentDidCatch()`
2. **React Query Errors**: Handled by `QueryCache.onError` handler
3. **Error Recovery**: User can restart the app via the "Restart App" button

### Integration Points

- **Error Boundary** wraps the entire app (after QueryClientProvider)
- **React Query** errors are logged and can trigger the error boundary
- **Sentry** integration is ready (commented out in code)

## Benefits

- ✅ Prevents white screen of death
- ✅ Provides user-friendly error messages
- ✅ Allows app recovery without reinstalling
- ✅ Logs errors for debugging
- ✅ Works seamlessly with React Query
- ✅ Ready for error tracking service integration

## Testing the Error Boundary

To test the error boundary, you can temporarily throw an error in any component:

```tsx
// Add this to any component's render method
throw new Error('Test error boundary');
```

The app should catch this error and display the error boundary UI with the "Restart App" button.

## Future Enhancements

- Uncomment Sentry integration in ErrorBoundary and QueryCache
- Add error reporting to analytics service
- Consider adding a "Report Issue" button for user feedback
- Add error categorization (recoverable vs. non-recoverable)

## Files Modified

1. `src/shared/components/ErrorBoundary.tsx` (new file)
2. `App.tsx` (updated)
3. `src/shared/components/index.ts` (updated)
