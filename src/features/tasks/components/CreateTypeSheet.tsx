import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import uuid from 'react-native-uuid';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { CustomField, CustomFieldType, TaskTypeDefinition } from '@/types';
import { api } from '@/services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ICON_KEYBOARD_HEIGHT = 332; // header(44) + search(44) + 4 rows × 56px + padding(16)
const ICON_ROWS = 4;

const COLOR_PALETTE = [
  '#E05252', // red
  '#E07B52', // orange
  '#E0C352', // yellow
  '#3DBF7A', // green
  '#52B8E0', // sky
  '#5B8DEF', // blue
  '#8B5BEF', // purple
  '#E05BAA', // pink
  '#6B7280', // gray
  '#0D9488', // teal
  '#D97706', // amber
  '#059669', // emerald
];

// 120 curated Ionicons — academic, creative, tech, lifestyle, nature, misc
const ALL_ICONS: Array<React.ComponentProps<typeof Ionicons>['name']> = [
  // Symbols
  'ellipse-outline',
  'star-outline',
  'heart-outline',
  'flash-outline',
  'flame-outline',
  'bulb-outline',
  'trophy-outline',
  'ribbon-outline',
  'flag-outline',
  'bookmark-outline',
  'alert-circle-outline',
  'checkmark-circle-outline',
  'close-circle-outline',
  'add-circle-outline',
  'remove-circle-outline',
  'information-circle-outline',
  // Academic
  'school-outline',
  'library-outline',
  'book-outline',
  'bookmarks-outline',
  'document-outline',
  'documents-outline',
  'clipboard-outline',
  'newspaper-outline',
  'pencil-outline',
  'create-outline',
  'calculator-outline',
  'flask-outline',
  'telescope-outline',
  'planet-outline',
  'globe-outline',
  'compass-outline',
  // Work
  'briefcase-outline',
  'business-outline',
  'construct-outline',
  'build-outline',
  'hammer-outline',
  'settings-outline',
  'options-outline',
  'list-outline',
  'grid-outline',
  'layers-outline',
  'filter-outline',
  'funnel-outline',
  // Creative / Arts
  'color-palette-outline',
  'brush-outline',
  'musical-notes-outline',
  'radio-outline',
  'camera-outline',
  'film-outline',
  'mic-outline',
  'headset-outline',
  'image-outline',
  'videocam-outline',
  'easel-outline',
  'print-outline',
  // Tech
  'desktop-outline',
  'laptop-outline',
  'phone-portrait-outline',
  'tablet-portrait-outline',
  'code-slash-outline',
  'terminal-outline',
  'wifi-outline',
  'bluetooth-outline',
  'cloud-outline',
  'server-outline',
  'hardware-chip-outline',
  'battery-half-outline',
  // Health / Fitness
  'fitness-outline',
  'bicycle-outline',
  'walk-outline',
  'barbell-outline',
  'basketball-outline',
  'football-outline',
  'nutrition-outline',
  'medkit-outline',
  'pulse-outline',
  'bandage-outline',
  'bed-outline',
  'water-outline',
  // Nature
  'leaf-outline',
  'flower-outline',
  'paw-outline',
  'bug-outline',
  'fish-outline',
  'moon-outline',
  'sunny-outline',
  'partly-sunny-outline',
  'snow-outline',
  'thunderstorm-outline',
  'rainy-outline',
  'earth-outline',
  // Food / Lifestyle
  'pizza-outline',
  'cafe-outline',
  'restaurant-outline',
  'wine-outline',
  'fast-food-outline',
  'ice-cream-outline',
  'beer-outline',
  'basket-outline',
  'bag-outline',
  'shirt-outline',
  'glasses-outline',
  'watch-outline',
  // Social / People
  'people-outline',
  'person-outline',
  'person-add-outline',
  'mail-outline',
  'chatbubble-outline',
  'chatbubbles-outline',
  'call-outline',
  'at-outline',
  // Transport
  'car-outline',
  'bus-outline',
  'airplane-outline',
  'boat-outline',
  'train-outline',
  'rocket-outline',
  'navigate-outline',
  'location-outline',
  // Home / Places
  'home-outline',
  'storefront-outline',
  'map-outline',
  'pin-outline',
  // Finance
  'card-outline',
  'cash-outline',
  'wallet-outline',
  'pricetag-outline',
  // Time
  'time-outline',
  'alarm-outline',
  'calendar-outline',
  'hourglass-outline',
  // Misc
  'gift-outline',
  'game-controller-outline',
  'dice-outline',
  'key-outline',
];

// Chunk into columns of ICON_ROWS for the horizontal keyboard layout
const ICON_COLUMNS: Array<
  Array<React.ComponentProps<typeof Ionicons>['name']>
> = [];
for (let i = 0; i < ALL_ICONS.length; i += ICON_ROWS) {
  ICON_COLUMNS.push(ALL_ICONS.slice(i, i + ICON_ROWS) as any);
}

const EXTRA_FIELD_OPTIONS: Array<{
  type: CustomFieldType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { type: 'datetime', label: 'Date / Time', icon: 'calendar-outline' },
  { type: 'checkbox', label: 'Checkbox', icon: 'checkbox-outline' },
  { type: 'location', label: 'Location / Venue', icon: 'location-outline' },
  { type: 'url', label: 'URL / Link', icon: 'link-outline' },
];

const FIELD_TYPE_ICONS: Record<
  CustomFieldType,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  datetime: 'calendar-outline',
  checkbox: 'checkbox-outline',
  location: 'location-outline',
  url: 'link-outline',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateTypeSheetProps {
  /** When provided, the sheet is in edit mode pre-populated with this type */
  existingType?: TaskTypeDefinition;
  deviceId: string;
  onSave: (type: TaskTypeDefinition) => void;
  onCancel: () => void;
  /** Called after a type is deleted (edit mode only) */
  onDelete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CreateTypeSheet: React.FC<CreateTypeSheetProps> = ({
  existingType,
  deviceId,
  onSave,
  onCancel,
  onDelete,
}) => {
  const isEditing = !!existingType;

  const [name, setName] = useState(existingType?.name ?? '');
  const [selectedColor, setSelectedColor] = useState(
    existingType?.color ?? COLOR_PALETTE[5],
  );
  const [selectedIcon, setSelectedIcon] = useState<
    React.ComponentProps<typeof Ionicons>['name']
  >(
    (existingType?.icon as React.ComponentProps<typeof Ionicons>['name']) ??
      'ellipse-outline',
  );
  const [extraFields, setExtraFields] = useState<CustomField[]>(
    existingType?.fields ?? [],
  );
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showIconKeyboard, setShowIconKeyboard] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(ICON_KEYBOARD_HEIGHT)).current;

  const filteredColumns = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    const icons = q
      ? ALL_ICONS.filter(n =>
          n
            .replace(/-outline$/, '')
            .replace(/-/g, ' ')
            .includes(q),
        )
      : ALL_ICONS;
    const cols: Array<Array<React.ComponentProps<typeof Ionicons>['name']>> =
      [];
    for (let i = 0; i < icons.length; i += ICON_ROWS) {
      cols.push(icons.slice(i, i + ICON_ROWS) as any);
    }
    return cols;
  }, [iconSearch]);

  const canSave = name.trim().length > 0;

  const openIconKeyboard = () => {
    Keyboard.dismiss();
    setShowFieldPicker(false);
    setIconSearch('');
    setShowIconKeyboard(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const closeIconKeyboard = () => {
    Animated.timing(slideAnim, {
      toValue: ICON_KEYBOARD_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setShowIconKeyboard(false));
  };

  const handleSelectIcon = (
    iconName: React.ComponentProps<typeof Ionicons>['name'],
  ) => {
    setSelectedIcon(iconName);
    closeIconKeyboard();
  };

  const handleAddField = (fieldType: CustomFieldType) => {
    const label =
      EXTRA_FIELD_OPTIONS.find(o => o.type === fieldType)?.label ?? fieldType;
    setExtraFields(prev => [
      ...prev,
      { id: uuid.v4() as string, label, fieldType },
    ]);
    setShowFieldPicker(false);
  };

  const handleRemoveField = (id: string) => {
    setExtraFields(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      let result: TaskTypeDefinition;
      if (isEditing && existingType) {
        await api.taskTypes.update(existingType.id, {
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon as string,
          fields: extraFields,
        });
        result = {
          ...existingType,
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon as string,
          fields: extraFields,
        };
      } else {
        result = await api.taskTypes.create({
          id: uuid.v4() as string,
          user_id: deviceId,
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon as string,
          fields: extraFields,
        });
      }
      onSave(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to save task type. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task Type',
      `All tasks of type "${existingType?.name}" will be moved to the Recycle Bin. This cannot be undone immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!existingType) return;
            setIsSaving(true);
            try {
              const { deleteTasksByTypeId } =
                await import('@/services/database');
              await deleteTasksByTypeId(existingType.id);
              await api.taskTypes.delete(existingType.id);
              onDelete?.();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task type.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {/* Type Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Type Name</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Lab Report"
            placeholderTextColor="#9CA3AF"
            maxLength={30}
            autoFocus={!isEditing}
          />
        </View>

        {/* Color Palette */}
        <View style={styles.field}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorGrid}>
            {COLOR_PALETTE.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorSwatchSelected,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedColor(color);
                }}
                activeOpacity={0.8}>
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Icon selector row */}
        <View style={styles.field}>
          <Text style={styles.label}>Icon</Text>
          <TouchableOpacity
            style={[
              styles.iconSelectorRow,
              showIconKeyboard && { borderColor: selectedColor },
            ]}
            onPress={openIconKeyboard}
            activeOpacity={0.7}>
            <View
              style={[
                styles.iconPreviewBadge,
                { backgroundColor: selectedColor + '22' },
              ]}>
              <Ionicons name={selectedIcon} size={22} color={selectedColor} />
            </View>
            <Text style={styles.iconSelectorLabel}>
              {selectedIcon.replace(/-outline$/, '').replace(/-/g, ' ')}
            </Text>
            <Ionicons
              name={showIconKeyboard ? 'chevron-down' : 'chevron-up'}
              size={16}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>

        {/* Default fields (non-removable) */}
        <View style={styles.field}>
          <Text style={styles.label}>Default Fields</Text>
          {(['Title', 'Description', 'Date / Time'] as const).map(f => (
            <View key={f} style={styles.defaultFieldRow}>
              <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
              <Text style={styles.defaultFieldText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Extra fields */}
        {extraFields.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Extra Fields</Text>
            {extraFields.map(field => (
              <View key={field.id} style={styles.extraFieldRow}>
                <Ionicons
                  name={FIELD_TYPE_ICONS[field.fieldType]}
                  size={18}
                  color={selectedColor}
                />
                <Text style={styles.extraFieldLabel}>{field.label}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveField(field.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add Field button */}
        <TouchableOpacity
          style={styles.addFieldButton}
          onPress={() => {
            Keyboard.dismiss();
            setShowFieldPicker(prev => !prev);
          }}
          activeOpacity={0.7}>
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.addFieldText}>Add Field</Text>
          <Ionicons
            name={showFieldPicker ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        {showFieldPicker && (
          <View style={styles.fieldPicker}>
            {EXTRA_FIELD_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.type}
                style={styles.fieldPickerOption}
                onPress={() => handleAddField(opt.type)}
                activeOpacity={0.7}>
                <Ionicons name={opt.icon} size={18} color="#374151" />
                <Text style={styles.fieldPickerLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? selectedColor : '#D1D5DB' },
          ]}
          onPress={handleSave}
          disabled={!canSave || isSaving}
          activeOpacity={0.8}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Save Changes' : 'Create Type'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Delete button (edit mode only) */}
        {isEditing && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isSaving}
            activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete This Type</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Icon keyboard — slides up from the bottom like a native keyboard */}
      {showIconKeyboard && (
        <Animated.View
          style={[
            styles.iconKeyboard,
            { transform: [{ translateY: slideAnim }] },
          ]}>
          {/* Header */}
          <View style={styles.iconKeyboardHeader}>
            <Text style={styles.iconKeyboardTitle}>Choose an icon</Text>
            <TouchableOpacity
              onPress={closeIconKeyboard}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.iconSearchRow}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.iconSearchInput}
              value={iconSearch}
              onChangeText={setIconSearch}
              placeholder="Search icons…"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            {iconSearch.length > 0 && (
              <TouchableOpacity
                onPress={() => setIconSearch('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal icon grid — 4 rows, scrolls left/right */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconKeyboardContent}
            keyboardShouldPersistTaps="always">
            {filteredColumns.length === 0 ? (
              <View style={styles.iconNoResults}>
                <Text style={styles.iconNoResultsText}>No icons found</Text>
              </View>
            ) : (
              filteredColumns.map((col, colIdx) => (
                <View key={colIdx} style={styles.iconColumn}>
                  {col.map(iconName => {
                    const isSelected = selectedIcon === iconName;
                    return (
                      <TouchableOpacity
                        key={iconName}
                        style={[
                          styles.iconCell,
                          isSelected && {
                            backgroundColor: selectedColor + '22',
                          },
                        ]}
                        onPress={() => handleSelectIcon(iconName)}
                        activeOpacity={0.65}>
                        <Ionicons
                          name={iconName}
                          size={24}
                          color={isSelected ? selectedColor : '#374151'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: '#374151',
    marginBottom: SPACING.sm,
  },
  nameInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: '#111418',
    backgroundColor: '#FFFFFF',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.15 }],
  },
  // Icon selector row (in the form)
  iconSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  iconPreviewBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: '#111418',
    textTransform: 'capitalize',
  },
  // Icon keyboard panel
  iconKeyboard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ICON_KEYBOARD_HEIGHT,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  iconKeyboardHeader: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  iconKeyboardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: '#374151',
  },
  iconSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: SPACING.xs,
  },
  iconSearchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#111418',
  },
  iconNoResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconNoResultsText: {
    fontSize: FONT_SIZES.sm,
    color: '#9CA3AF',
  },
  iconKeyboardContent: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  iconColumn: {
    flexDirection: 'column',
    gap: 4,
    marginRight: 4,
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Default / extra field rows
  defaultFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: SPACING.xs,
  },
  defaultFieldText: {
    fontSize: FONT_SIZES.sm,
    color: '#6B7280',
    flex: 1,
  },
  extraFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: SPACING.xs,
  },
  extraFieldLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#374151',
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary + '60',
    backgroundColor: COLORS.primary + '08',
    marginBottom: SPACING.sm,
  },
  addFieldText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.primary,
  },
  fieldPicker: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  fieldPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fieldPickerLabel: {
    fontSize: FONT_SIZES.md,
    color: '#374151',
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
  },
  deleteButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: '#EF4444',
  },
});
