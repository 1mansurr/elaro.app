import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface DetailSheetHeaderProps {
  courseName: string;
  courseCode?: string;
  showCloseButton?: boolean;
  showDeleteButton?: boolean;
  onEdit: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}

export const DetailSheetHeader: React.FC<DetailSheetHeaderProps> = ({
  courseName,
  courseCode,
  showCloseButton = false,
  showDeleteButton = false,
  onEdit,
  onClose,
  onDelete,
}) => {
  const { theme } = useTheme();

  const courseLabel = courseCode
    ? `${courseCode.toUpperCase()}`
    : courseName.toUpperCase();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#18212B' : '#FFFFFF',
          borderBottomColor: theme.isDark ? '#374151' : '#E5E7EB',
        },
      ]}>
      {/* Course Badge */}
      <View
        style={[
          styles.courseBadge,
          {
            backgroundColor: theme.isDark
              ? COLORS.primary + '33'
              : COLORS.primary + '1A',
            borderColor: theme.isDark
              ? COLORS.primary + '33'
              : COLORS.primary + '1A',
          },
        ]}>
        <Text
          style={[
            styles.courseBadgeText,
            { color: theme.isDark ? '#FFFFFF' : COLORS.primary },
          ]}>
          {courseLabel}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: theme.isDark ? '#283039' : '#F3F4F6',
            },
          ]}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name="pencil-outline"
            size={20}
            color={theme.isDark ? '#FFFFFF' : '#111418'}
          />
        </TouchableOpacity>

        {showDeleteButton && onDelete && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.isDark ? '#283039' : '#F3F4F6',
              },
            ]}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name="trash-outline"
              size={20}
              color="#EF4444"
            />
          </TouchableOpacity>
        )}

        {showCloseButton && onClose && (
          <TouchableOpacity
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.isDark ? '#283039' : '#F3F4F6',
              },
            ]}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name="close"
              size={24}
              color={theme.isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  courseBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  courseBadgeText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

