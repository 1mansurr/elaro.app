import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '@/types';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  COMPONENT_TOKENS,
} from '@/constants/theme';
import { canSaveAsTemplate } from '@/features/templates/utils/templateUtils';

interface TemplateSectionProps {
  title: string;
  selectedCourse: Course | null;
  saveAsTemplate: boolean;
  onSaveAsTemplateChange: (save: boolean) => void;
}

export const TemplateSection: React.FC<TemplateSectionProps> = ({
  title,
  selectedCourse,
  saveAsTemplate,
  onSaveAsTemplateChange,
}) => {
  // Only show template toggle if we can save as template
  if (!canSaveAsTemplate({ title, course: selectedCourse }, 'assignment')) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.templateToggleContainer}>
        <View style={styles.templateToggleInfo}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.templateToggleText}>
            Save as template for future use
          </Text>
        </View>
        <Switch
          value={saveAsTemplate}
          onValueChange={onSaveAsTemplateChange}
          trackColor={{
            false: 'COLORS.lightGray',
            true: 'COLORS.primaryLight ',
          }}
          thumbColor={saveAsTemplate ? COLORS.primary : 'COLORS.gray'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  templateToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COMPONENT_TOKENS.templateSection.backgroundColor,
    padding: COMPONENT_TOKENS.templateSection.padding,
    borderRadius: COMPONENT_TOKENS.templateSection.borderRadius,
    borderWidth: COMPONENT_TOKENS.templateSection.borderWidth,
    borderColor: COMPONENT_TOKENS.templateSection.borderColor,
  },
  templateToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  templateToggleText: {
    fontSize: FONT_SIZES.sm,
    color: COMPONENT_TOKENS.templateSection.textColor,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
});

export default TemplateSection;
