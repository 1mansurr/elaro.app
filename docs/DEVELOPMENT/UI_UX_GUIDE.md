# UI/UX Development Guide

## Overview

This guide covers the UI/UX architecture, component patterns, design system usage, and best practices for the ELARO application.

## Design System

### Centralized Theme

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
```

### Component Tokens

```typescript
export const COMPONENT_TOKENS = {
  button: {
    borderRadius: 8,
    padding: { sm: 8, md: 12, lg: 16 },
  },
  card: {
    borderRadius: 12,
    shadow: SHADOWS.md,
  },
  // ... component-specific tokens
};
```

## Component Architecture

### Button System

**Unified Button Component** with focused variants:

```typescript
import { 
  PrimaryButton, 
  SecondaryButton, 
  OutlineButton, 
  DangerButton, 
  GhostButton 
} from '@/shared/components';

// Usage
<PrimaryButton 
  title="Save" 
  onPress={handleSave} 
  loading={isLoading}
  disabled={false}
/>

<SecondaryButton title="Cancel" onPress={handleCancel} />
<DangerButton title="Delete" onPress={handleDelete} />
```

**Benefits:**
- Single source of truth
- Consistent behavior across all variants
- Theme-aware by default
- ESLint enforcement prevents generic Button imports

### Modal System

**Standardized Modal Variants:**

```typescript
import { 
  DialogModal, 
  SheetModal, 
  SimpleModal, 
  FullScreenModal 
} from '@/shared/components';

// Dialog with blur backdrop
<DialogModal
  visible={visible}
  onClose={handleClose}
  title="Confirm Action"
>
  <Text>Are you sure?</Text>
</DialogModal>

// Bottom sheet
<SheetModal
  visible={visible}
  onClose={handleClose}
>
  <Text>Sheet content</Text>
</SheetModal>
```

**Animation Standards:**
- All modals use 300ms duration
- Consistent easing functions
- Proper backdrop types (blur for dialogs, opacity for sheets)

### Input System

**Grouped Props Pattern:**

```typescript
import { UnifiedInput } from '@/shared/components';

<UnifiedInput
  label="Username"
  value={username}
  onChangeText={setUsername}
  config={{
    variant: 'outlined',
    size: 'medium',
    required: true,
  }}
  state={{
    error: errors.username,
    helperText: 'Must be 3-20 characters',
  }}
  icons={{
    leftIcon: 'person',
    rightIcon: username ? 'check-circle' : undefined,
  }}
/>
```

## Styling Patterns

### Using Theme Context

**Recommended: useThemedStyles Hook**

```typescript
import { useThemedStyles } from '@/hooks/useThemedStyles';

const MyComponent = () => {
  const themedStyles = useThemedStyles(theme => ({
    container: {
      backgroundColor: theme.background,
      padding: SPACING.md,
    },
    text: {
      color: theme.text.primary,
      fontSize: TYPOGRAPHY.body.fontSize,
    },
  }));

  return (
    <View style={themedStyles.container}>
      <Text style={themedStyles.text}>Content</Text>
    </View>
  );
};
```

**Benefits:**
- Memoized styles (only re-renders when theme changes)
- Type-safe theme access
- Better performance than direct `useTheme()`

### NativeWind Integration (Hybrid Approach)

```typescript
import { useThemedStyles } from '@/hooks/useThemedStyles';

const HybridComponent = () => {
  const themedStyles = useThemedStyles(theme => ({
    container: { backgroundColor: theme.background },
  }));

  return (
    <View
      style={themedStyles.container}
      className="flex-1 p-md rounded-lg"
    >
      <Text className="text-text-primary text-lg font-semibold">
        Best of both worlds
      </Text>
    </View>
  );
};
```

## Typography Enforcement

### ESLint Rules

The project enforces typography token usage:

```typescript
// ❌ Bad - Hardcoded values
<Text style={{ fontSize: 16, fontWeight: 'bold' }}>Title</Text>

// ✅ Good - Using tokens
<Text style={TYPOGRAPHY.h1}>Title</Text>
```

### Typography Tokens

```typescript
import { TYPOGRAPHY } from '@/constants/theme';

// Headings
<Title style={TYPOGRAPHY.h1}>Heading 1</Title>
<Title style={TYPOGRAPHY.h2}>Heading 2</Title>

// Body text
<Text style={TYPOGRAPHY.body}>Body text</Text>
<Text style={TYPOGRAPHY.caption}>Caption</Text>
```

## Component Interface Simplification

### Prop Grouping Pattern

**Before: 14 individual props**

```typescript
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
  // ... more props
}
```

**After: 4 grouped prop objects**

```typescript
interface SimplifiedInputProps {
  label?: string;
  config?: InputConfig;    // variant, size, required
  state?: InputState;       // error, success, helperText
  icons?: InputIcons;       // leftIcon, rightIcon, onPress
}
```

### Focused Sub-Components

Break complex components into focused pieces:

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

## Animation Standards

### Modal Animations

All modals follow standardized patterns:

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
      duration: 300,
      easing: 'ease-in-out',
      backdropType: 'blur',
      backdropIntensity: 40,
    },
  },
};
```

### Animation Principles

- **Consistent Duration**: 300ms for all modal animations
- **Appropriate Easing**: Different easing functions for different interaction types
- **Backdrop Consistency**: Proper backdrop types per modal variant
- **Performance**: Optimized animations with proper cleanup

## Best Practices

### ✅ DO

- Always use theme tokens instead of hardcoded values
- Use `useThemedStyles` for theme-aware components
- Group related props into objects
- Break complex components into focused sub-components
- Follow animation standards (300ms, proper easing)
- Use component variants (PrimaryButton, not generic Button)

### ❌ DON'T

- Don't hardcode colors, spacing, or typography values
- Don't use direct `useTheme()` hook (use `useThemedStyles` instead)
- Don't create new button components (use existing variants)
- Don't create custom modal implementations (use standard variants)
- Don't mix styling approaches inconsistently

## Migration Guide

### Migrating from Old Components

1. **Replace Button imports:**
   ```typescript
   // Old
   import { Button } from '@/shared/components';
   
   // New
   import { PrimaryButton } from '@/shared/components';
   ```

2. **Update Input components:**
   ```typescript
   // Old
   <Input value={value} onChangeText={setValue} />
   
   // New
   <UnifiedInput 
     value={value} 
     onChangeText={setValue}
     config={{ variant: 'outlined' }}
   />
   ```

3. **Replace Modal implementations:**
   ```typescript
   // Old - Custom modal
   <CustomModal visible={visible} />
   
   // New - Standard variant
   <DialogModal visible={visible} onClose={handleClose} />
   ```

## Performance Optimization

### Memoization

```typescript
// Memoize expensive style calculations
const styles = useMemo(() => 
  StyleSheet.create({
    container: { /* complex styles */ },
  }), 
  [dependencies]
);
```

### Component Optimization

```typescript
// Use React.memo for pure components
export const MyComponent = React.memo(({ data }) => {
  // Component implementation
});
```

## Accessibility

### Screen Reader Support

```typescript
<Button
  title="Save"
  onPress={handleSave}
  accessibilityLabel="Save changes"
  accessibilityHint="Saves your current changes"
/>
```

### Touch Targets

- Minimum touch target: 44x44 points
- Adequate spacing between interactive elements
- Clear visual feedback for interactions

## Additional Resources

- [React Native StyleSheet Documentation](https://reactnative.dev/docs/stylesheet)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)

