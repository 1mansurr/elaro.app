# Path Aliasing Guide

## ✅ Successfully Configured Path Aliasing

We have successfully configured path aliasing for the ELARO project to eliminate "relative path hell" and make the codebase cleaner, more maintainable, and more robust.

## 🎯 What Was Configured

### **1. TypeScript Configuration (`tsconfig.json`)**

Added path mapping to the TypeScript compiler options:

```json
{
  "extends": "./node_modules/expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": [],
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "exclude": [
    "node_modules",
    "**/__tests__/*",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "supabase/**/*",
    "src/future-features/**/*"
  ]
}
```

### **2. Babel Configuration (`babel.config.js`)**

Added the `module-resolver` plugin to handle path resolution at runtime:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
          },
        },
      ],
      // This plugin is required for react-native-reanimated v2+
      // Must be last in the plugins array
      'react-native-reanimated/plugin',
    ],
  };
};
```

### **3. Dependencies**

Installed the required Babel plugin:

```bash
npm install --save-dev babel-plugin-module-resolver
```

## 🚀 How to Use Path Aliasing

### **Before (Relative Path Hell)**

```typescript
// Ugly relative paths that break when files are moved
import { Button } from '../../../components/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import { User } from '../../../types';
```

### **After (Clean Absolute Paths)**

```typescript
// Clean, absolute paths that work from anywhere
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { User } from '@/types';
```

## 📁 Supported File Extensions

The path aliasing supports all common React Native file extensions:

- `.js` - JavaScript files
- `.ts` - TypeScript files
- `.tsx` - TypeScript React files
- `.json` - JSON files
- `.ios.js` - iOS-specific JavaScript files
- `.android.js` - Android-specific JavaScript files

## 🎯 Benefits Achieved

### **1. Readability**

- ✅ **Clean Imports**: `@/components/Button` is instantly understandable
- ✅ **No Counting**: No more counting `../` levels to understand file structure
- ✅ **Clear Dependencies**: Easy to see what each file depends on

### **2. Robustness**

- ✅ **Move-Safe**: Files can be moved anywhere without breaking imports
- ✅ **Refactor-Friendly**: Directory restructuring doesn't break imports
- ✅ **Consistent**: Same import path works from any file location

### **3. Maintainability**

- ✅ **Easy Refactoring**: Moving components is now safe and easy
- ✅ **Clear Structure**: Import paths reveal the project structure
- ✅ **Reduced Errors**: No more broken imports when reorganizing code

## 📋 Migration Guide

### **Gradual Migration Strategy**

You can migrate to the new path aliasing gradually:

1. **New Files**: Use `@/` imports in all new files
2. **Modified Files**: Update imports when you modify existing files
3. **Refactoring**: Update imports when moving or refactoring components

### **Example Migration**

```typescript
// Before: In src/screens/HomeScreen.tsx
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { TodayOverviewCard } from '../components/TodayOverviewCard';

// After: In src/screens/HomeScreen.tsx
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { TodayOverviewCard } from '@/components/TodayOverviewCard';
```

## 📱 Usage Examples

### **Component Examples**

#### **Creating a New Component**

```typescript
// src/components/NewFeature.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PrimaryButton } from '@/shared/components';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

export const NewFeature: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Welcome, {user?.name}!
      </Text>
      <PrimaryButton title="Click Me" onPress={() => console.log('Clicked!')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
});
```

#### **Screen Component**

```typescript
// src/screens/NewScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/shared/components';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { api } from '@/services/api';
import { User } from '@/types';

export const NewScreen: React.FC = () => {
  const { isHealthy } = useHealthCheck();

  return (
    <View>
      <Card title="System Status">
        <Text>Health Status: {isHealthy ? 'OK' : 'Issues Detected'}</Text>
      </Card>
    </View>
  );
};
```

### **Service Layer Examples**

#### **Creating a New Service**

```typescript
// src/services/newService.ts
import { supabase } from '@/services/supabase';
import { handleApiError } from '@/services/api/errors';
import { User } from '@/types';

export class NewService {
  async getUserData(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const newService = new NewService();
```

### **Hook Examples**

#### **Creating a Custom Hook**

```typescript
// src/hooks/useNewFeature.ts
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';

export const useNewFeature = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await api.newFeature.getData();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    refetch: fetchData,
  };
};
```

## 🔧 Common Import Patterns

### **Components**

```typescript
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
```

### **Contexts**

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
```

### **Services**

```typescript
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { authService } from '@/services/authService';
```

### **Hooks**

```typescript
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
```

### **Types**

```typescript
import { User } from '@/types';
import { Course } from '@/types';
import { NotificationPreferences } from '@/types';
```

### **Constants**

```typescript
import { COLORS } from '@/constants/theme';
import { TYPOGRAPHY } from '@/constants/theme';
```

### **Utils**

```typescript
import { formatDate } from '@/utils/dateUtils';
import { validateEmail } from '@/utils/validation';
```

## 🔄 Refactoring Examples

### **Moving a Component**

When you move a component from one directory to another, only the imports **to** that component need to be updated, not the imports **from** that component:

```typescript
// Before: src/components/OldLocation.tsx
import { Button } from '@/components/Button'; // ✅ This stays the same
import { useAuth } from '@/contexts/AuthContext'; // ✅ This stays the same

// After moving to: src/components/new/location/OldLocation.tsx
import { Button } from '@/components/Button'; // ✅ Still works!
import { useAuth } from '@/contexts/AuthContext'; // ✅ Still works!
```

### **Restructuring Directories**

```typescript
// Before: src/features/auth/AuthButton.tsx
import { Button } from '../../../components/Button'; // ❌ Breaks if moved

// After: src/features/auth/AuthButton.tsx
import { Button } from '@/components/Button'; // ✅ Always works!
```

## 🎨 Best Practices

### **1. Consistent Import Order**

```typescript
// 1. React and React Native imports first
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party libraries
import { useNavigation } from '@react-navigation/native';

// 3. Internal imports using @/ aliases
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { User } from '@/types';
```

### **2. Group Related Imports**

```typescript
// Group by functionality
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
```

### **3. Use Descriptive Paths**

```typescript
// Good: Specific and clear
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { useHealthCheck } from '@/hooks/useHealthCheck';

// Avoid: Too generic
import { Settings } from '@/components/Settings'; // Less clear
```

## 🛠️ Development Workflow

### **IDE Support**

Most modern IDEs will provide:

- ✅ **Auto-completion**: IntelliSense for `@/` paths
- ✅ **Go to Definition**: Click to navigate to imported files
- ✅ **Refactoring**: Safe renaming and moving of files
- ✅ **Error Detection**: TypeScript will catch invalid paths

### **VS Code Configuration**

If using VS Code, you can add this to your `settings.json` for better path resolution:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "typescript.suggest.paths": true
}
```

## 🧪 Testing the Configuration

The path aliasing configuration has been tested and verified to work correctly:

1. ✅ **TypeScript Compilation**: Paths are resolved correctly by TypeScript
2. ✅ **Babel Transformation**: Runtime path resolution works with Metro bundler
3. ✅ **IDE Support**: IntelliSense and navigation work with `@/` paths
4. ✅ **No Breaking Changes**: Existing relative imports continue to work

## 📋 Verification Checklist

- ✅ **TypeScript Configuration**: `tsconfig.json` updated with `baseUrl` and `paths`
- ✅ **Babel Configuration**: `babel.config.js` updated with `module-resolver` plugin
- ✅ **Dependencies**: `babel-plugin-module-resolver` installed
- ✅ **Path Resolution**: `@/` imports resolve correctly to `src/`
- ✅ **File Extensions**: All common React Native file types supported
- ✅ **Backward Compatibility**: Existing relative imports continue to work
- ✅ **IDE Support**: IntelliSense and navigation work with new paths
- ✅ **Testing**: Configuration verified with test imports

## 🚀 Next Steps

### **Immediate Benefits**

- Start using `@/` imports in all new files
- Gradually migrate existing files when you modify them
- Enjoy cleaner, more maintainable code

### **Team Adoption**

- Share this documentation with the team
- Establish `@/` imports as the standard for new code
- Consider adding ESLint rules to enforce path aliasing usage

### **Future Enhancements**

- Consider adding more specific aliases for commonly used directories:
  ```json
  "paths": {
    "@/*": ["src/*"],
    "@/components/*": ["src/components/*"],
    "@/hooks/*": ["src/hooks/*"],
    "@/services/*": ["src/services/*"]
  }
  ```

## 🎉 Conclusion

Path aliasing has been successfully configured for the ELARO project. This configuration provides:

1. **✅ Cleaner Code**: No more `../../../` relative path hell
2. **✅ Better Maintainability**: Files can be moved without breaking imports
3. **✅ Improved Readability**: Import paths are self-documenting
4. **✅ Enhanced Developer Experience**: Better IDE support and fewer errors
5. **✅ Future-Proof Architecture**: Robust foundation for code organization

The project is now ready to benefit from clean, absolute import paths that make the codebase more professional, maintainable, and developer-friendly.
