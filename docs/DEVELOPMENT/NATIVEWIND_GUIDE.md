# NativeWind Implementation Guide

## Overview

This guide explains how to implement and use NativeWind (Tailwind CSS for React Native) in the ELARO application for utility-first styling.

## 🚀 Setup Status

### ✅ Already Installed

- `nativewind`: ^4.1.23
- `tailwindcss-react-native`: ^1.7.10
- `tailwind.config.js` configured

### 🔧 Configuration

#### 1. Tailwind Config (`tailwind.config.js`)

```javascript
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Matches our theme system
        primary: '#2C5EFF',
        success: '#4CAF50',
        error: '#FF3B30',
        // ... all theme colors
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        // ... matches SPACING constants
      },
    },
  },
};
```

#### 2. Metro Config (if needed)

Add to `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

## 🎨 Usage Examples

### Basic Component with NativeWind

```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export const NativeWindExample = () => {
  return (
    <View className="flex-1 bg-background p-md">
      <Text className="text-text-primary text-lg font-semibold mb-md">
        NativeWind Example
      </Text>

      <TouchableOpacity className="bg-primary p-md rounded-lg">
        <Text className="text-white text-center font-medium">
          Primary Button
        </Text>
      </TouchableOpacity>

      <View className="mt-lg p-md bg-background-secondary rounded-md border border-border">
        <Text className="text-text-secondary text-sm">
          This uses utility classes instead of StyleSheet
        </Text>
      </View>
    </View>
  );
};
```

### Hybrid Approach (Recommended)

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '@/hooks/useThemedStyles';

export const HybridComponent = () => {
  const themedStyles = useThemedStyles(theme => ({
    container: {
      backgroundColor: theme.background,
    },
  }));

  return (
    <View style={[themedStyles.container]} className="flex-1 p-md">
      <Text className="text-text-primary text-lg font-semibold">
        Hybrid: Theme + NativeWind
      </Text>
    </View>
  );
};
```

## 📋 Migration Strategy

### Phase 1: New Components

- Use NativeWind for new components
- Prefer utility classes for layout and spacing
- Use theme system for dynamic colors

### Phase 2: Gradual Migration

- Convert simple components to NativeWind
- Keep complex components with StyleSheet
- Use hybrid approach for best of both worlds

### Phase 3: Full Migration (Optional)

- Convert all components to NativeWind
- Remove StyleSheet dependencies
- Optimize bundle size

## 🎯 Best Practices

### 1. Use NativeWind for Layout

```tsx
// ✅ Good - NativeWind for layout
<View className="flex-1 justify-center items-center p-md">
  <Text className="text-center">Content</Text>
</View>

// ❌ Avoid - StyleSheet for simple layout
<View style={styles.container}>
  <Text style={styles.text}>Content</Text>
</View>
```

### 2. Use Theme System for Dynamic Colors

```tsx
// ✅ Good - Theme for dynamic colors
const themedStyles = useThemedStyles(theme => ({
  dynamicColor: { color: theme.accent },
}));

// ❌ Avoid - Hardcoded colors in NativeWind
<Text className="text-blue-500">Dynamic content</Text>;
```

### 3. Combine Both Approaches

```tsx
// ✅ Best - Hybrid approach
<View style={[themedStyles.container]} className="flex-1 p-md rounded-lg">
  <Text className="text-text-primary text-lg font-semibold">
    Best of both worlds
  </Text>
</View>
```

## 🔧 Utility Classes Reference

### Layout

- `flex-1`, `flex-row`, `flex-col`
- `justify-center`, `items-center`
- `p-md`, `px-lg`, `py-sm`
- `m-md`, `mx-lg`, `my-sm`

### Colors

- `bg-primary`, `bg-success`, `bg-error`
- `text-text-primary`, `text-text-secondary`
- `border-border`, `border-primary`

### Typography

- `text-xs`, `text-sm`, `text-md`, `text-lg`
- `font-normal`, `font-medium`, `font-semibold`
- `text-center`, `text-left`, `text-right`

### Borders & Radius

- `rounded-sm`, `rounded-md`, `rounded-lg`
- `border`, `border-2`, `border-primary`

## 🚀 Benefits

### Performance

- Smaller bundle size (no StyleSheet objects)
- Faster development (no style definitions)
- Better tree-shaking

### Developer Experience

- Consistent spacing and colors
- Faster prototyping
- Better maintainability

### Design System

- Enforces design tokens
- Consistent spacing scale
- Color system integration

## 📊 Implementation Status

- ✅ Tailwind config updated
- ✅ Theme colors mapped
- ✅ Spacing system aligned
- ✅ Example components created
- ⏳ Metro config (if needed)
- ⏳ Component migration (gradual)

## 🎯 Next Steps

1. **Start with new components** using NativeWind
2. **Gradually migrate** simple existing components
3. **Use hybrid approach** for complex components
4. **Monitor performance** and bundle size
5. **Train team** on utility-first approach

---

**Status:** Ready for implementation  
**Performance Impact:** Positive (smaller bundle, faster development)  
**Maintainability:** Improved (consistent utilities, design tokens)
