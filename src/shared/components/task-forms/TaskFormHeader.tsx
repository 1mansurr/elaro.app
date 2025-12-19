import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface TaskFormHeaderProps {
  title: string;
  onClose: () => void;
  showTemplateButton?: boolean;
  onTemplatePress?: () => void;
}

export const TaskFormHeader: React.FC<TaskFormHeaderProps> = ({
  title,
  onClose,
  showTemplateButton = false,
  onTemplatePress,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.isDark ? '#101922' : '#F6F7F8',
          borderBottomColor: theme.isDark ? '#374151' : '#E5E7EB',
        },
      ]}>
      <TouchableOpacity onPress={onClose} style={styles.headerButton}>
        <Ionicons
          name="close"
          size={24}
          color={theme.isDark ? '#FFFFFF' : '#111418'}
        />
      </TouchableOpacity>
      <Text
        style={[
          styles.headerTitle,
          { color: theme.isDark ? '#FFFFFF' : '#111418' },
        ]}>
        {title}
      </Text>
      {showTemplateButton ? (
        <TouchableOpacity onPress={onTemplatePress} style={styles.headerButton}>
          <Ionicons
            name="bookmark-outline"
            size={24}
            color={theme.isDark ? '#FFFFFF' : '#111418'}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    flex: 1,
  },
});
