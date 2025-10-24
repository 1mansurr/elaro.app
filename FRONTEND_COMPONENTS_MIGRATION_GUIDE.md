# Frontend Components Migration Guide

## Overview
This guide helps developers migrate from the old complex components to the new simplified, theme-agnostic components.

## 1. Button Component Migration

### Old Complex Button (268 lines)
```typescript
// OLD - Complex with 6 variants × 3 sizes × multiple props
<Button
  title="Save"
  onPress={handleSave}
  variant="primary"
  size="medium"
  gradient={true}
  hapticFeedback={true}
  icon={<Ionicons name="save" />}
  iconPosition="left"
  loading={false}
  disabled={false}
  style={customStyle}
  textStyle={customTextStyle}
/>
```

### New Simplified Button
```typescript
// NEW - Simple and focused
import { Button } from '@/shared/components';

// Primary button (most common)
<Button.Primary
  title="Save"
  onPress={handleSave}
  loading={false}
  disabled={false}
/>

// Secondary button
<Button.Secondary
  title="Cancel"
  onPress={handleCancel}
/>

// Outline button
<Button.Outline
  title="Learn More"
  onPress={handleLearnMore}
/>

// Danger button
<Button.Danger
  title="Delete"
  onPress={handleDelete}
/>

// Ghost button
<Button.Ghost
  title="Skip"
  onPress={handleSkip}
/>
```

### Migration Steps
1. **Replace complex Button with specific variants**
2. **Remove unnecessary props** (gradient, hapticFeedback, icon, etc.)
3. **Use appropriate variant** for the action type
4. **Keep only essential props** (title, onPress, loading, disabled)

## 2. Input Component Migration

### Old Input (392 lines with complex animations)
```typescript
// OLD - Complex with animations and many props
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  leftIcon="mail"
  rightIcon="eye"
  onRightIconPress={togglePassword}
  animated={true}
  variant="outlined"
  size="large"
  characterCount={true}
  maxLength={100}
  helperText="Enter your email address"
/>
```

### New Simplified Input
```typescript
// NEW - Simple and focused
import { SimplifiedInput } from '@/shared/components';

<SimplifiedInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  leftIcon="mail"
  rightIcon="eye"
  onRightIconPress={togglePassword}
  helperText="Enter your email address"
  required={true}
/>
```

### Migration Steps
1. **Replace Input with SimplifiedInput**
2. **Remove animation props** (animated, variant)
3. **Remove character count props** (characterCount, maxLength)
4. **Keep essential props** (label, value, onChangeText, error, helperText)

## 3. Theme Context Optimization

### Old Theme Usage (79 instances across 37 files)
```typescript
// OLD - Direct theme context usage
const { theme, isDark } = useTheme();
const styles = getStyles(theme); // Dynamic style generation
```

### New Optimized Theme Usage
```typescript
// NEW - Memoized theme usage
import { useThemedStyles } from '@/hooks/useThemedStyles';

const themedStyles = useThemedStyles((theme) => ({
  container: {
    backgroundColor: theme.background,
    padding: 16,
  },
  text: {
    color: theme.text,
    fontSize: 16,
  },
}));

// Use static styles when possible
import { COMPONENT_STYLES } from '@/constants/components';

const staticStyles = COMPONENT_STYLES.button.base;
```

### Migration Steps
1. **Replace direct theme usage** with `useThemedStyles`
2. **Use static styles** from `COMPONENT_STYLES` when possible
3. **Memoize style objects** to prevent re-renders
4. **Extract theme-dependent styles** to separate functions

## 4. Component Usage Examples

### Before (Complex)
```typescript
// Complex button with many props
<Button
  title="Submit"
  onPress={handleSubmit}
  variant="primary"
  size="large"
  gradient={true}
  gradientColors={['#667eea', '#764ba2']}
  hapticFeedback={true}
  icon={<Ionicons name="checkmark" />}
  iconPosition="right"
  loading={isSubmitting}
  disabled={!isValid}
  style={[styles.button, { marginTop: 20 }]}
  textStyle={styles.buttonText}
  accessibilityLabel="Submit form"
  accessibilityHint="Double tap to submit form"
/>

// Complex input with animations
<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  error={passwordError}
  leftIcon="lock-closed"
  rightIcon={showPassword ? "eye-off" : "eye"}
  onRightIconPress={togglePassword}
  animated={true}
  variant="outlined"
  size="medium"
  characterCount={true}
  maxLength={50}
  helperText="Must be at least 8 characters"
  required={true}
/>
```

### After (Simplified)
```typescript
// Simple, focused button
<Button.Primary
  title="Submit"
  onPress={handleSubmit}
  loading={isSubmitting}
  disabled={!isValid}
  style={styles.button}
/>

// Simple, focused input
<SimplifiedInput
  label="Password"
  value={password}
  onChangeText={setPassword}
  error={passwordError}
  leftIcon="lock-closed"
  rightIcon={showPassword ? "eye-off" : "eye"}
  onRightIconPress={togglePassword}
  helperText="Must be at least 8 characters"
  required={true}
/>
```

## 5. Performance Benefits

### Before
- **268 lines** for Button component
- **392 lines** for Input component
- **79 theme context calls** across 37 files
- **Complex style generation** on every render
- **Hard to test** due to theme dependency

### After
- **~50 lines** for each button variant
- **~100 lines** for SimplifiedInput
- **Memoized theme usage** reduces re-renders
- **Static styles** for consistent performance
- **Easy to test** with theme-agnostic base components

## 6. Testing Improvements

### Before (Hard to Test)
```typescript
// Hard to test due to theme dependency
const { getByText } = render(
  <ThemeProvider>
    <Button title="Test" onPress={jest.fn()} />
  </ThemeProvider>
);
```

### After (Easy to Test)
```typescript
// Easy to test with base components
const { getByText } = render(
  <BaseButton onPress={jest.fn()}>
    <Text>Test</Text>
  </BaseButton>
);
```

## 7. Migration Checklist

- [ ] **Replace complex Button** with specific variants
- [ ] **Replace complex Input** with SimplifiedInput
- [ ] **Update theme usage** to use `useThemedStyles`
- [ ] **Remove unnecessary props** from components
- [ ] **Use static styles** from `COMPONENT_STYLES`
- [ ] **Update tests** to use base components
- [ ] **Remove unused imports** and dependencies

## 8. Backward Compatibility

The old components are still available for gradual migration:
- `Button` (old complex version)
- `Input` (old complex version)
- `NewButton` (new simplified version)
- `SimplifiedInput` (new simplified version)

## 9. Best Practices

1. **Use specific button variants** instead of complex props
2. **Prefer static styles** over dynamic theme styles
3. **Memoize theme-dependent styles** with `useThemedStyles`
4. **Test with base components** for better testability
5. **Keep components focused** on single responsibility

---

**Migration Status:** ✅ Ready for implementation  
**Performance Impact:** 🚀 Significant improvement in component complexity and theme usage  
**Maintainability:** 🛠️ Much easier to maintain and test
