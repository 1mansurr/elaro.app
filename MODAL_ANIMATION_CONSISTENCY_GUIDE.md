# Modal Animation Consistency Guide

## 🎬 Overview

This guide documents the standardized modal animation system implemented across ELARO. All modals use optimized animation durations (200-350ms) with appropriate backdrop types and easing functions.

## 🎯 Animation Standards

### Core Principles

- **Optimized Durations**: Different durations per modal type for optimal UX
  - Sheet: 300ms (standard bottom sheet)
  - Dialog: 250ms (quick confirmation dialogs)
  - Simple: 200ms (lightweight overlays)
  - FullScreen: 350ms (smooth full-screen transitions)
- **Appropriate Easing**: Different easing functions for different interaction types
- **Backdrop Consistency**: Proper backdrop types per modal variant
- **Performance**: Optimized animations with proper cleanup

### Animation Configuration

All modal animations are defined in `src/constants/theme.ts`:

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
      backdropOpacity: 0,
    },
  },
};
```

## 🧩 Modal Variants

### 1. DialogModal

**Use Case**: Centered dialogs, confirmations, forms
**Animation**: Fade in/out with blur backdrop
**Backdrop**: Blur effect with 40% intensity

```typescript
import { DialogModal } from '@/shared/components';

<DialogModal
  isVisible={isVisible}
  onClose={onClose}
>
  <View style={styles.content}>
    <Text>Dialog Content</Text>
  </View>
</DialogModal>
```

**Characteristics:**

- Slides in from center
- Blur backdrop for focus
- Best for: Confirmations, forms, important dialogs

### 2. SheetModal

**Use Case**: Bottom sheets, action menus, quick forms
**Animation**: Slide up from bottom with opacity backdrop
**Backdrop**: Semi-transparent overlay

```typescript
import { SheetModal } from '@/shared/components';

<SheetModal
  isVisible={isVisible}
  onClose={onClose}
>
  <View style={styles.content}>
    <Text>Sheet Content</Text>
  </View>
</SheetModal>
```

**Characteristics:**

- Slides up from bottom
- Opacity backdrop
- Best for: Action menus, quick forms, bottom sheets

### 3. SimpleModal

**Use Case**: Simple overlays, info modals, basic dialogs
**Animation**: Fade in/out with opacity backdrop
**Backdrop**: Semi-transparent overlay

```typescript
import { SimpleModal } from '@/shared/components';

<SimpleModal
  isVisible={isVisible}
  onClose={onClose}
>
  <View style={styles.content}>
    <Text>Simple Content</Text>
  </View>
</SimpleModal>
```

**Characteristics:**

- Fades in/out
- Opacity backdrop
- Best for: Info modals, simple overlays

### 4. FullScreenModal

**Use Case**: Full-screen experiences, immersive content
**Animation**: Slide in/out with no backdrop
**Backdrop**: None (full screen)

```typescript
import { FullScreenModal } from '@/shared/components';

<FullScreenModal
  isVisible={isVisible}
  onClose={onClose}
>
  <View style={styles.content}>
    <Text>Full Screen Content</Text>
  </View>
</FullScreenModal>
```

**Characteristics:**

- Takes entire screen
- No backdrop
- Best for: Immersive experiences, full-screen forms

## 🔧 Implementation Details

### BaseModal Component

All modal variants extend from `BaseModal`:

```typescript
interface BaseModalProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropType?: 'blur' | 'opacity' | 'none';
  animationType?: 'slide' | 'fade' | 'none';
  overlayOpacity?: number;
  animationDuration?: number;
  closeOnBackdropPress?: boolean;
  modalStyle?: ViewStyle;
  overlayStyle?: ViewStyle;
  presentationStyle?:
    | 'fullScreen'
    | 'pageSheet'
    | 'formSheet'
    | 'overFullScreen';
}
```

### Animation Timing

- **Duration**: Optimized per modal type
  - Sheet: 300ms (standard bottom sheet)
  - Dialog: 250ms (quick confirmation dialogs)
  - Simple: 200ms (lightweight overlays)
  - FullScreen: 350ms (smooth full-screen transitions)
- **Easing**:
  - `ease-out` for all modals (consistent, responsive feel)

### Backdrop Types

- **Blur**: Used for dialogs to create focus
- **Opacity**: Used for sheets and simple modals
- **None**: Used for full-screen modals

## 📱 Usage Examples

### Confirmation Dialog

```typescript
const [showConfirm, setShowConfirm] = useState(false);

<DialogModal
  isVisible={showConfirm}
  onClose={() => setShowConfirm(false)}
>
  <View style={styles.confirmContent}>
    <Text style={styles.title}>Delete Item?</Text>
    <Text style={styles.message}>This action cannot be undone.</Text>
    <View style={styles.actions}>
      <SecondaryButton
        title="Cancel"
        onPress={() => setShowConfirm(false)}
      />
      <DangerButton
        title="Delete"
        onPress={handleDelete}
      />
    </View>
  </View>
</DialogModal>
```

### Action Sheet

```typescript
const [showActions, setShowActions] = useState(false);

<SheetModal
  isVisible={showActions}
  onClose={() => setShowActions(false)}
>
  <View style={styles.actionContent}>
    <Text style={styles.title}>Choose Action</Text>
    <TouchableOpacity style={styles.actionItem}>
      <Text>Edit</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.actionItem}>
      <Text>Share</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.actionItem}>
      <Text>Delete</Text>
    </TouchableOpacity>
  </View>
</SheetModal>
```

### Quick Form

```typescript
const [showForm, setShowForm] = useState(false);

<SimpleModal
  isVisible={showForm}
  onClose={() => setShowForm(false)}
>
  <View style={styles.formContent}>
    <Text style={styles.title}>Quick Add</Text>
    <SimplifiedInput
      label="Title"
      value={title}
      onChangeText={setTitle}
    />
    <PrimaryButton
      title="Save"
      onPress={handleSave}
    />
  </View>
</SimpleModal>
```

## 🚫 Migration from Custom Modals

### Before (Custom Modal)

```typescript
// OLD - Custom modal implementation
<Modal
  visible={isVisible}
  transparent
  animationType="fade"
  onRequestClose={onClose}
>
  <TouchableOpacity
    style={styles.modalOverlay}
    activeOpacity={1}
    onPress={onClose}
  >
    <View style={styles.modalContent}>
      {/* Content */}
    </View>
  </TouchableOpacity>
</Modal>
```

### After (Standardized Modal)

```typescript
// NEW - Standardized modal variant
<DialogModal
  isVisible={isVisible}
  onClose={onClose}
>
  <View style={styles.content}>
    {/* Content */}
  </View>
</DialogModal>
```

### Migration Benefits

- **Reduced Code**: No need for manual backdrop handling
- **Consistent UX**: All modals behave the same way
- **Better Performance**: Optimized animations
- **Easier Maintenance**: Centralized animation configuration

## 🎨 Styling Guidelines

### Content Styling

```typescript
const styles = StyleSheet.create({
  content: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    margin: SPACING.md,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
});
```

### Backdrop Styling

Backdrop styling is handled automatically by the modal variants. Custom backdrop styling should be avoided unless absolutely necessary.

## 🔍 Testing Modal Animations

### Manual Testing

1. **Open Modal**: Verify smooth animation in
2. **Close Modal**: Verify smooth animation out
3. **Backdrop Press**: Verify modal closes on backdrop press
4. **Hardware Back**: Verify modal closes on hardware back button

### Automated Testing

```typescript
// Example test for modal animation
test('DialogModal animates correctly', async () => {
  const { getByText } = render(
    <DialogModal isVisible={true} onClose={jest.fn()}>
      <Text>Test Content</Text>
    </DialogModal>
  );

  expect(getByText('Test Content')).toBeTruthy();
  // Add animation-specific assertions
});
```

## 📊 Performance Considerations

### Animation Performance

- **Hardware Acceleration**: All animations use native driver when possible
- **Memory Management**: Proper cleanup of animation listeners
- **Frame Rate**: Maintains 60fps during animations

### Best Practices

- **Avoid Nested Modals**: Don't open modals from within modals
- **Proper Cleanup**: Always call `onClose` when modal should close
- **Memory Leaks**: Ensure animation listeners are properly cleaned up

## 🚀 Future Enhancements

### Planned Improvements

- **Gesture Support**: Swipe-to-dismiss for sheet modals
- **Accessibility**: Enhanced screen reader support
- **Theme Integration**: Dark mode support for backdrop effects
- **Custom Animations**: Support for custom animation curves

### Migration Path

- **Phase 1**: ✅ Standardize existing modals
- **Phase 2**: Add gesture support
- **Phase 3**: Enhanced accessibility features
- **Phase 4**: Custom animation support

This modal animation system ensures consistent, performant, and delightful user experiences across the entire ELARO application.
