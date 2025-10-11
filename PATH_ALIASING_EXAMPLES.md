# Path Aliasing Usage Examples

## 🚀 Quick Reference for Using Path Aliasing

Now that path aliasing is configured, here are practical examples of how to use the new `@/` import syntax throughout the ELARO project.

## 📱 Component Examples

### **Creating a New Component**
```typescript
// src/components/NewFeature.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export const NewFeature: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Welcome, {user?.name}!
      </Text>
      <Button title="Click Me" onPress={() => console.log('Clicked!')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
```

### **Screen Component**
```typescript
// src/screens/NewScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/Card';
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

## 🔧 Service Layer Examples

### **Creating a New Service**
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

### **API Integration**
```typescript
// src/services/api/queries/newFeature.ts
import { supabase } from '@/services/supabase';
import { handleApiError } from '@/services/api/errors';

export const newFeatureApi = {
  async getData(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('new_table')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
```

## 🎣 Hook Examples

### **Creating a Custom Hook**
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

## 📊 Migration Examples

### **Before and After Comparison**

#### **Complex Nested Component**
```typescript
// Before: src/screens/nested/deep/DeepComponent.tsx
import { Button } from '../../../../components/Button';
import { useAuth } from '../../../../contexts/AuthContext';
import { api } from '../../../../services/api';
import { User } from '../../../../types';

// After: src/screens/nested/deep/DeepComponent.tsx
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { User } from '@/types';
```

#### **Hook with Multiple Dependencies**
```typescript
// Before: src/hooks/useComplexFeature.ts
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { User, Course } from '../types';

// After: src/hooks/useComplexFeature.ts
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { User, Course } from '@/types';
```

## 🎯 Common Import Patterns

### **Component Imports**
```typescript
// UI Components
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';

// Layout Components
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Sidebar } from '@/components/Sidebar';

// Feature Components
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { HealthStatusIndicator } from '@/components/HealthStatusIndicator';
```

### **Context Imports**
```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotification } from '@/contexts/NotificationContext';
import { SoftLaunchProvider } from '@/contexts/SoftLaunchContext';
```

### **Service Imports**
```typescript
import { api } from '@/services/api';
import { supabase } from '@/services/supabase';
import { authService } from '@/services/authService';
import { healthCheckService } from '@/services/healthCheckService';
import { notificationService } from '@/services/notificationService';
```

### **Hook Imports**
```typescript
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useDataQueries } from '@/hooks/useDataQueries';
```

### **Type Imports**
```typescript
import { User } from '@/types';
import { Course } from '@/types';
import { Assignment } from '@/types';
import { Lecture } from '@/types';
import { StudySession } from '@/types';
import { NotificationPreferences } from '@/types';
```

### **Constant Imports**
```typescript
import { COLORS } from '@/constants/theme';
import { TEXT } from '@/constants/text';
```

### **Utility Imports**
```typescript
import { formatDate } from '@/utils/dateUtils';
import { validateEmail } from '@/utils/validation';
import { debounce } from '@/utils/debounce';
```

## 🔄 Refactoring Examples

### **Moving a Component**
When you move a component from one directory to another, only the imports **to** that component need to be updated, not the imports **from** that component:

```typescript
// Before: src/components/OldLocation.tsx
import { Button } from '@/components/Button';  // ✅ This stays the same
import { useAuth } from '@/contexts/AuthContext';  // ✅ This stays the same

// After moving to: src/components/new/location/OldLocation.tsx
import { Button } from '@/components/Button';  // ✅ Still works!
import { useAuth } from '@/contexts/AuthContext';  // ✅ Still works!
```

### **Restructuring Directories**
```typescript
// Before: src/features/auth/AuthButton.tsx
import { Button } from '../../../components/Button';  // ❌ Breaks if moved

// After: src/features/auth/AuthButton.tsx
import { Button } from '@/components/Button';  // ✅ Always works!
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
import { Settings } from '@/components/Settings';  // Less clear
```

## 🚀 Getting Started

1. **New Files**: Always use `@/` imports in new files
2. **Modified Files**: Update imports when you modify existing files
3. **Refactoring**: Update imports when moving components
4. **Team Standard**: Encourage the team to adopt `@/` imports

## 🎉 Benefits in Action

With path aliasing configured, your code is now:
- ✅ **Cleaner**: No more `../../../` confusion
- ✅ **Robust**: Files can be moved without breaking imports
- ✅ **Readable**: Import paths are self-documenting
- ✅ **Maintainable**: Easy to refactor and reorganize
- ✅ **Professional**: Industry-standard import patterns

Start using `@/` imports in your next component and experience the difference!
