# Accessibility Guide

## Overview

This guide documents accessibility features, best practices, and implementation patterns for making the ELARO app accessible to all users, including those using screen readers and assistive technologies.

---

## Accessibility Features

### Screen Reader Support

The app supports screen readers through React Native's accessibility APIs:

- `accessibilityLabel` - Descriptive labels for UI elements
- `accessibilityHint` - Hints about what actions do
- `accessibilityRole` - Semantic roles for elements
- `accessible` - Enable/disable accessibility for elements

### Supported Screen Readers

- **iOS:** VoiceOver
- **Android:** TalkBack

---

## Accessibility Props

### Common Props

```typescript
interface AccessibilityProps {
  // Label read by screen reader
  accessibilityLabel?: string;

  // Hint about what the action does
  accessibilityHint?: string;

  // Semantic role (button, text, header, etc.)
  accessibilityRole?: AccessibilityRole;

  // Enable/disable accessibility
  accessible?: boolean;

  // State information
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    expanded?: boolean;
  };

  // Value information
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
}
```

### Accessibility Roles

Common roles used in the app:

- `button` - Clickable buttons
- `text` - Text content (default for Text)
- `header` - Section headers
- `link` - Links
- `image` - Images
- `search` - Search inputs
- `textbox` - Text inputs
- `switch` - Toggle switches
- `slider` - Sliders
- `tab` - Tab buttons
- `none` - Ignore element

---

## Best Practices

### ✅ DO

1. **Provide Labels for All Interactive Elements**

   ```typescript
   <TouchableOpacity
     accessibilityLabel="Save course"
     accessibilityHint="Saves the current course information"
     onPress={handleSave}
   >
     <Text>Save</Text>
   </TouchableOpacity>
   ```

2. **Use Semantic Roles**

   ```typescript
   <TouchableOpacity accessibilityRole="button">
   <Text accessibilityRole="header">Section Title</Text>
   <TextInput accessibilityRole="textbox" />
   ```

3. **Provide Hints for Complex Actions**

   ```typescript
   <TouchableOpacity
     accessibilityLabel="Delete course"
     accessibilityHint="Permanently deletes this course and all associated tasks"
   >
   ```

4. **Mark Decorative Elements as None**

   ```typescript
   <View accessible={false}>
     <Image source={decorationImage} />
   </View>
   ```

5. **Use State Information**
   ```typescript
   <Switch
     accessibilityLabel="Enable notifications"
     accessibilityState={{ checked: isEnabled }}
   />
   ```

### ❌ DON'T

1. **Don't Use Generic Labels**

   ```typescript
   // ❌ BAD
   <TouchableOpacity accessibilityLabel="Button">

   // ✅ GOOD
   <TouchableOpacity accessibilityLabel="Save course">
   ```

2. **Don't Skip Labels for Icons**

   ```typescript
   // ❌ BAD
   <TouchableOpacity onPress={handleDelete}>
     <Ionicons name="trash" />
   </TouchableOpacity>

   // ✅ GOOD
   <TouchableOpacity
     accessibilityLabel="Delete"
     onPress={handleDelete}
   >
     <Ionicons name="trash" />
   </TouchableOpacity>
   ```

3. **Don't Use Redundancy**

   ```typescript
   // ❌ BAD - "Save button" is redundant
   <TouchableOpacity accessibilityLabel="Save button" accessibilityRole="button">

   // ✅ GOOD
   <TouchableOpacity accessibilityLabel="Save" accessibilityRole="button">
   ```

---

## Component Patterns

### Pattern 1: Button with Icon

```typescript
<TouchableOpacity
  accessibilityLabel="Add new course"
  accessibilityHint="Opens the course creation screen"
  accessibilityRole="button"
  onPress={handleAdd}
>
  <Ionicons name="add" />
  <Text>Add Course</Text>
</TouchableOpacity>
```

### Pattern 2: Form Input

```typescript
<TextInput
  accessibilityLabel="Course name"
  accessibilityHint="Enter the name of your course"
  accessibilityRole="textbox"
  placeholder="Enter course name"
  value={courseName}
  onChangeText={setCourseName}
/>
```

### Pattern 3: List Item

```typescript
<TouchableOpacity
  accessibilityLabel={`Course: ${course.name}`}
  accessibilityHint="Double tap to view course details"
  accessibilityRole="button"
  onPress={() => navigateToCourse(course.id)}
>
  <Text>{course.name}</Text>
  <Text>{course.code}</Text>
</TouchableOpacity>
```

### Pattern 4: Toggle/Switch

```typescript
<Switch
  accessibilityLabel="Enable notifications"
  accessibilityHint="Turns on push notifications for this course"
  accessibilityRole="switch"
  accessibilityState={{ checked: isEnabled }}
  value={isEnabled}
  onValueChange={setIsEnabled}
/>
```

---

## Testing Accessibility

### iOS (VoiceOver)

1. Enable VoiceOver: Settings → Accessibility → VoiceOver
2. Navigate app using gestures:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate
   - Three-finger swipe: Scroll

### Android (TalkBack)

1. Enable TalkBack: Settings → Accessibility → TalkBack
2. Navigate app using gestures:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate
   - Two-finger swipe: Scroll

### Automated Testing

Use React Native's AccessibilityInfo:

```typescript
import { AccessibilityInfo } from 'react-native';

// Check if screen reader is enabled
AccessibilityInfo.isScreenReaderEnabled().then(isEnabled => {
  console.log('Screen reader enabled:', isEnabled);
});

// Listen for changes
const subscription = AccessibilityInfo.addEventListener(
  'screenReaderChanged',
  isEnabled => {
    console.log('Screen reader status:', isEnabled);
  },
);
```

---

## Common Issues and Fixes

### Issue: Button not announced correctly

**Problem:** Screen reader says "Button" instead of button purpose

**Fix:**

```typescript
// Add descriptive label
<TouchableOpacity accessibilityLabel="Save course">
```

### Issue: Icon-only buttons not accessible

**Problem:** Icon buttons have no label

**Fix:**

```typescript
// Add label even if visual text is absent
<TouchableOpacity
  accessibilityLabel="Delete"
  onPress={handleDelete}
>
  <Ionicons name="trash" />
</TouchableOpacity>
```

### Issue: Form validation errors not announced

**Problem:** Error messages not read by screen reader

**Fix:**

```typescript
<TextInput
  accessibilityLabel="Email"
  accessibilityHint={error ? error : "Enter your email address"}
/>
```

---

## Accessibility Checklist

For every interactive component:

- [ ] Has `accessibilityLabel` or uses descriptive text
- [ ] Has `accessibilityRole` if not default
- [ ] Has `accessibilityHint` for complex actions
- [ ] Has `accessibilityState` for dynamic states
- [ ] Tested with screen reader (VoiceOver/TalkBack)
- [ ] Decorative elements marked `accessible={false}`

---

## Related Documentation

- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [iOS Accessibility Guidelines](https://developer.apple.com/accessibility/)
- [Android Accessibility Guidelines](https://developer.android.com/guide/topics/ui/accessibility)

---

**Last Updated:** Phase 6 Implementation  
**Status:** Active Guide
