# ELARO Architecture Documentation

## 🏗️ System Overview

ELARO is built with a modern, scalable architecture that emphasizes maintainability, performance, and developer experience. The application follows a feature-based architecture with a consolidated design system and standardized component patterns.

## 📁 Project Structure

```
src/
├── constants/           # Design system and configuration
│   └── theme.ts        # Centralized design tokens
├── shared/             # Shared components and utilities
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   └── services/       # Shared services
├── features/           # Feature-based modules
│   ├── auth/           # Authentication feature
│   ├── dashboard/      # Dashboard feature
│   ├── courses/        # Course management
│   ├── assignments/    # Assignment management
│   └── ...
├── contexts/           # React contexts
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🎨 Design System Architecture

### Centralized Theme System

All design tokens are consolidated in `src/constants/theme.ts`:

```typescript
// Colors
export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  // ... comprehensive color palette
};

// Typography
export const TYPOGRAPHY = {
  h1: { fontSize: FONT_SIZES.xxxl, fontWeight: FONT_WEIGHTS.bold },
  // ... complete typography system
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Animations
export const ANIMATIONS = {
  modal: {
    sheet: { duration: 300, easing: 'ease-out', backdropType: 'opacity' },
    dialog: { duration: 300, easing: 'ease-in-out', backdropType: 'blur' },
    // ... standardized animation configs
  },
};
```

### Component Architecture Patterns

#### 1. Simplified Component Interfaces

Complex components are broken down using grouped props:

```typescript
// Before: 14 individual props
interface ComplexInputProps {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  required?: boolean;
  variant?: string;
  size?: string;
  helperText?: string;
  characterCount?: boolean;
  maxLength?: number;
  // ... more props
}

// After: 4 grouped prop objects
interface SimplifiedInputProps {
  label?: string;
  config?: InputConfig; // variant, size, required
  state?: InputState; // error, success, helperText
  icons?: InputIcons; // leftIcon, rightIcon, onPress
}
```

#### 2. Focused Sub-Components

Large components are broken into focused sub-components:

```typescript
const SimplifiedHomeScreenContent = ({ data, uiState, eventHandlers }) => (
  <ScrollView>
    <TrialBannerSection {...uiState} {...eventHandlers} />
    <NextTaskSection {...data} {...eventHandlers} />
    <TodayOverviewSection {...data} />
    <TaskListSection {...data} {...eventHandlers} />
  </ScrollView>
);
```

## 🔧 Component System Architecture

### Button System

- **Focused Variants**: `PrimaryButton`, `SecondaryButton`, `OutlineButton`, `DangerButton`, `GhostButton`
- **Consistent API**: All variants share the same core props (`title`, `onPress`, `loading`, `disabled`)
- **Theme Integration**: All styling uses centralized theme tokens
- **ESLint Enforcement**: Rules prevent generic Button imports

### Modal System

- **Standardized Variants**: `DialogModal`, `SheetModal`, `SimpleModal`, `FullScreenModal`
- **Optimized Animations**: Different durations per modal type (200-350ms) with appropriate easing
- **Backdrop Types**: Proper backdrop handling per modal type
- **Base Implementation**: `BaseModal` provides common functionality

### Input System

- **Grouped Props**: Configuration, state, and icon props are grouped
- **Sub-Components**: `InputLabel`, `InputIcon`, `InputHelper` for focused concerns
- **Validation States**: Error, success, and helper text handling
- **Theme Integration**: All styling uses design tokens

## 🎬 Animation Architecture

### Modal Animations

All modals follow standardized animation patterns:

```typescript
export const ANIMATIONS = {
  modal: {
    sheet: {
      duration: 300,
      easing: 'ease-out',
      backdropType: 'opacity',
      backdropOpacity: 0.5,
    },
    dialog: {
      duration: 250,
      easing: 'ease-out',
      backdropType: 'blur',
      backdropIntensity: 40,
    },
    simple: {
      duration: 200,
      easing: 'ease-out',
      backdropType: 'opacity',
      backdropOpacity: 0.5,
    },
    fullScreen: {
      duration: 350,
      easing: 'ease-out',
      backdropType: 'none',
    },
  },
};
```

### Animation Principles

- **Optimized Durations**: Different durations per modal type (200-350ms) for optimal UX
  - Sheet: 300ms (standard bottom sheet)
  - Dialog: 250ms (quick confirmation dialogs)
  - Simple: 200ms (lightweight overlays)
  - FullScreen: 350ms (smooth full-screen transitions)
- **Appropriate Easing**: Different easing functions for different interaction types
- **Backdrop Consistency**: Proper backdrop types per modal variant
- **Performance**: Optimized animations with proper cleanup

## 📱 State Management Architecture

### React Query Integration

- **Server State**: Managed by React Query with proper caching
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **Error Handling**: Centralized error handling with user-friendly messages
- **Loading States**: Consistent loading patterns across the app

### Local State Management

- **React Context**: For global app state (auth, theme)
- **Component State**: For local UI state
- **Custom Hooks**: For complex state logic and side effects

## 🔒 Security Architecture

### Authentication

- **Supabase Auth**: Secure authentication with JWT tokens
- **Session Management**: Automatic token refresh and session persistence
- **Permission System**: Role-based access control
- **Guest Mode**: Limited functionality for unauthenticated users

### Data Protection

- **Input Validation**: Client and server-side validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Proper data sanitization
- **Rate Limiting**: Per-user rate limiting for API endpoints

## 🚀 Performance Architecture

### Code Splitting

- **Feature-Based Splitting**: Each feature is loaded on demand
- **Component Lazy Loading**: Heavy components are loaded as needed
- **Bundle Optimization**: Tree shaking and dead code elimination

### Caching Strategy

- **React Query Cache**: Intelligent caching of server data
- **Image Caching**: Optimized image loading and caching
- **Static Asset Caching**: Proper cache headers for static assets

### Performance Monitoring

- **Performance Metrics**: Core Web Vitals monitoring
- **Error Tracking**: Comprehensive error reporting
- **User Analytics**: Performance impact on user experience

## 🧪 Testing Architecture

### Testing Strategy

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Feature-level testing
- **E2E Tests**: Critical user flow testing
- **Performance Tests**: Load and performance testing

### Testing Tools

- **Jest**: Unit testing framework
- **React Native Testing Library**: Component testing
- **Detox**: E2E testing for React Native
- **MSW**: API mocking for integration tests

## 📦 Build and Deployment Architecture

### Build System

- **Expo**: React Native development and build platform
- **TypeScript**: Type-safe development
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting

### Deployment Pipeline

- **EAS Build**: Cloud-based builds for iOS and Android
- **App Store**: Automated deployment to app stores
- **Environment Management**: Separate configs for dev/staging/prod
- **Feature Flags**: Safe feature rollouts

## 🔄 Migration and Compatibility

### Backward Compatibility

- **Legacy Wrappers**: Old component APIs are maintained with wrappers
- **Gradual Migration**: Phased approach to component updates
- **Deprecation Warnings**: Clear migration paths for deprecated APIs

### Version Management

- **Semantic Versioning**: Clear version numbering
- **Breaking Changes**: Documented breaking changes with migration guides
- **Feature Flags**: Safe rollout of new features

## 📚 Development Guidelines

### Code Organization

- **Feature-Based**: Organize code by features, not by file type
- **Shared Resources**: Common components and utilities in shared folders
- **Type Safety**: Comprehensive TypeScript coverage
- **Documentation**: Inline documentation for complex logic

### Component Development

- **Single Responsibility**: Each component has one clear purpose
- **Prop Grouping**: Group related props into objects
- **Sub-Components**: Break complex components into focused pieces
- **Theme Integration**: Always use design tokens, never hardcoded values

### Performance Guidelines

- **Memoization**: Use React.memo and useMemo appropriately
- **Lazy Loading**: Load components and data on demand
- **Image Optimization**: Optimize images for mobile performance
- **Bundle Size**: Monitor and optimize bundle size

This architecture provides a solid foundation for scalable, maintainable, and performant React Native development while ensuring consistent user experience across the application.
