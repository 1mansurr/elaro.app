# Component Interface Simplification Standards

## 🎯 Prop Naming Conventions

### **Core Principles:**

1. **Grouped Props**: Use configuration objects instead of flat prop lists
2. **Descriptive Names**: Props should clearly indicate their purpose
3. **Consistent Patterns**: Follow established naming conventions
4. **Type Safety**: Use TypeScript interfaces for all prop groups

### **Standard Prop Groups:**

#### **Configuration Props (`config`)**

- `variant`: Component visual variant
- `size`: Component size
- `required`: Required field indicator
- `disabled`: Disabled state

#### **State Props (`state`)**

- `error`: Error message
- `success`: Success state
- `loading`: Loading state
- `helperText`: Helper text

#### **Event Props (`on*`)**

- `onPress`: Press handler
- `onChange`: Change handler
- `onFocus`: Focus handler
- `onBlur`: Blur handler

#### **Data Props (`data`)**

- `items`: List items
- `value`: Current value
- `options`: Select options

#### **UI Props (`ui`)**

- `visible`: Visibility state
- `open`: Open state
- `expanded`: Expanded state

### **Examples:**

#### **❌ Complex Interface (Before):**

```typescript
interface ComplexComponentProps {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: any;
  refetch?: () => void;
  isRefetching?: boolean;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  skeletonComponent?: React.ReactElement;
  skeletonCount?: number;
}
```

#### **✅ Simplified Interface (After):**

```typescript
interface SimplifiedComponentProps {
  queryState: {
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data: any;
    refetch?: () => void;
    isRefetching?: boolean;
  };
  emptyState?: {
    title?: string;
    message?: string;
    icon?: string;
    customComponent?: React.ReactElement;
  };
  loadingState?: {
    skeletonComponent?: React.ReactElement;
    skeletonCount?: number;
  };
  onRefresh?: () => void;
}
```

## 🧩 Component Architecture Patterns

### **1. Focused Sub-Components**

Break complex components into focused, single-purpose sub-components:

```typescript
// Main component
const SimplifiedComponent = ({ config, state, handlers }) => (
  <View>
    <HeaderSection config={config} />
    <ContentSection state={state} />
    <ActionSection handlers={handlers} />
  </View>
);

// Sub-components
const HeaderSection = ({ config }) => { /* ... */ };
const ContentSection = ({ state }) => { /* ... */ };
const ActionSection = ({ handlers }) => { /* ... */ };
```

### **2. Configuration Objects**

Group related props into configuration objects:

```typescript
interface InputConfig {
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
}

interface InputState {
  error?: string;
  success?: boolean;
  helperText?: string;
}
```

### **3. Backward Compatibility**

Maintain backward compatibility with legacy interfaces:

```typescript
// Legacy component wrapper
export const LegacyComponent: React.FC<LegacyProps> = (props) => {
  return (
    <SimplifiedComponent
      config={{ variant: props.variant, size: props.size }}
      state={{ error: props.error, success: props.success }}
      handlers={{ onPress: props.onPress }}
    />
  );
};
```

## 📊 Benefits Achieved

### **Before Simplification:**

- **Input**: 14 props (complex interface)
- **QueryStateWrapper**: 13 props (many concerns)
- **HomeScreenContent**: 13 props (mixed responsibilities)

### **After Simplification:**

- **SimplifiedInput**: 4 prop groups (focused concerns)
- **SimplifiedQueryStateWrapper**: 4 prop groups (clear separation)
- **SimplifiedHomeScreenContent**: 3 prop groups (logical grouping)

### **Key Improvements:**

1. **Reduced Cognitive Load**: Fewer props to remember
2. **Better Type Safety**: Grouped interfaces are more maintainable
3. **Improved Reusability**: Sub-components can be reused independently
4. **Clearer Intent**: Prop groups make component purpose obvious
5. **Easier Testing**: Focused components are easier to test

## 🔄 Migration Strategy

### **Phase 1: Create Simplified Components**

- Create new simplified components with grouped props
- Maintain backward compatibility wrappers
- Add comprehensive documentation

### **Phase 2: Gradual Migration**

- Update high-priority components first
- Provide migration guides for developers
- Monitor usage patterns

### **Phase 3: Full Adoption**

- Deprecate legacy interfaces
- Remove backward compatibility wrappers
- Update all component usage

## 📝 Usage Examples

### **Simplified Input:**

```typescript
<SimplifiedInput
  label="Email"
  config={{
    variant: 'outlined',
    size: 'medium',
    required: true
  }}
  state={{
    error: 'Invalid email',
    helperText: 'Enter your email address'
  }}
  icons={{
    leftIcon: 'mail',
    rightIcon: 'checkmark',
    onRightIconPress: handleValidate
  }}
  value={email}
  onChangeText={setEmail}
/>
```

### **Simplified Query State Wrapper:**

```typescript
<SimplifiedQueryStateWrapper
  queryState={{
    isLoading,
    isError,
    error,
    data,
    refetch,
    isRefetching
  }}
  emptyState={{
    title: 'No tasks found',
    message: 'Create your first task to get started',
    icon: 'add-circle'
  }}
  loadingState={{
    skeletonComponent: <TaskSkeleton />,
    skeletonCount: 5
  }}
  onRefresh={refetch}
>
  <TaskList data={data} />
</SimplifiedQueryStateWrapper>
```

This approach significantly improves component maintainability, developer experience, and code organization while maintaining full backward compatibility.
