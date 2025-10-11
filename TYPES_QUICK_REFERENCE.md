# Types Quick Reference Guide

## 🚀 Quick Reference for the New Modular Types System

### **📁 File Structure**
```
src/types/
├── index.ts          # Barrel file (imports everything)
├── navigation.ts     # Navigation types
├── entities.ts       # Core data models
└── api.ts           # API request/response types
```

## 🎯 Where to Find Types

### **🧭 Navigation Types (`src/types/navigation.ts`)**
```typescript
import { RootStackParamList, MainTabParamList } from '@/types/navigation';
```
- `RootStackParamList` - Main app navigation structure
- `MainTabParamList` - Tab navigation structure

### **🏗️ Entity Types (`src/types/entities.ts`)**
```typescript
import { 
  User, 
  Course, 
  Assignment, 
  Lecture, 
  StudySession,
  NotificationPreferences,
  AuthContextType,
  Task,
  OverviewData,
  HomeScreenData,
  CalendarData,
  AppError
} from '@/types/entities';
```

### **🌐 API Types (`src/types/api.ts`)**
```typescript
import { 
  CreateAssignmentRequest,
  CreateStudySessionRequest,
  CreateLectureRequest,
  CreateCourseRequest,
  UpdateCourseRequest,
  UpdateAssignmentRequest,
  UpdateLectureRequest,
  UpdateStudySessionRequest,
  PaginationParams,
  SortParams,
  FilterParams,
  DashboardStats,
  PerformanceMetrics
} from '@/types/api';
```

### **📦 Barrel File (`src/types/index.ts`)**
```typescript
// Import everything from the barrel file (backward compatible)
import { 
  User, 
  Course, 
  CreateAssignmentRequest,
  RootStackParamList 
} from '@/types';
```

## 💡 Import Best Practices

### **✅ Recommended: Domain-Specific Imports**
```typescript
// Import only what you need from specific domains
import { User, Course, Assignment } from '@/types/entities';
import { CreateAssignmentRequest } from '@/types/api';
import { RootStackParamList } from '@/types/navigation';
```

### **✅ Also Good: Barrel File Imports**
```typescript
// Import from barrel file (same as before)
import { User, Course, CreateAssignmentRequest } from '@/types';
```

### **❌ Avoid: Wildcard Imports**
```typescript
// Don't do this - imports everything
import * as Types from '@/types';
```

## 🔍 Common Use Cases

### **Component with User Data**
```typescript
import { User } from '@/types/entities';

interface UserProfileProps {
  user: User;
}
```

### **API Mutation**
```typescript
import { CreateAssignmentRequest } from '@/types/api';
import { Assignment } from '@/types/entities';

const createAssignment = async (request: CreateAssignmentRequest): Promise<Assignment> => {
  // Implementation
};
```

### **Navigation Props**
```typescript
import { RootStackParamList } from '@/types/navigation';
import { StackNavigationProp } from '@react-navigation/stack';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
```

### **Context Provider**
```typescript
import { AuthContextType } from '@/types/entities';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
```

## 🎯 Adding New Types

### **Where to Add New Types**

#### **Navigation Types** → `src/types/navigation.ts`
```typescript
export type NewScreenParamList = {
  NewScreen: { id: string };
};
```

#### **Entity Types** → `src/types/entities.ts`
```typescript
export interface NewEntity {
  id: string;
  name: string;
  createdAt: string;
}
```

#### **API Types** → `src/types/api.ts`
```typescript
export interface CreateNewEntityRequest {
  name: string;
  description?: string;
}
```

### **Cross-File Dependencies**
```typescript
// In api.ts, import from entities.ts when needed
import { Course } from './entities';

export interface CreateAssignmentRequest {
  course_id: string; // References Course.id
  title: string;
}
```

## 🔧 Migration Guide

### **Existing Code (No Changes Required)**
```typescript
// This still works exactly the same
import { User, Course, Assignment } from '@/types';
```

### **New Code (Recommended)**
```typescript
// Use domain-specific imports for better clarity
import { User, Course } from '@/types/entities';
import { CreateAssignmentRequest } from '@/types/api';
```

## 📊 Benefits Summary

- ✅ **Better Organization**: Types grouped by logical domains
- ✅ **Faster Compilation**: TypeScript processes smaller files
- ✅ **Reduced Conflicts**: Less chance of merge conflicts
- ✅ **Easier Navigation**: Quickly find relevant types
- ✅ **Backward Compatible**: All existing imports still work
- ✅ **Path Aliasing**: Works perfectly with `@/` imports

## 🆘 Troubleshooting

### **Type Not Found?**
1. Check which domain the type belongs to
2. Import from the correct module
3. Or import from the barrel file as fallback

### **Import Errors?**
1. Verify the file exists in the correct location
2. Check the export statement in the source file
3. Ensure path aliasing is configured correctly

### **Need Help Finding a Type?**
- **User/Course/Assignment**: Check `entities.ts`
- **Navigation**: Check `navigation.ts`
- **API Requests**: Check `api.ts`
- **Everything**: Check `index.ts` (barrel file)
