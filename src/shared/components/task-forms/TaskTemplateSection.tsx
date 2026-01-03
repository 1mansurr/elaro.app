import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TemplateCard } from '@/shared/components/TemplateCard';
import { SPACING } from '@/constants/theme';

interface TaskTemplateSectionProps {
  taskType: 'lecture' | 'assignment' | 'study_session';
  onTemplateSelect: (template: any) => void;
  onSaveAsTemplate: () => void;
  canSaveAsTemplate: boolean;
  hasTemplates: boolean;
  onMyTemplatesPress: () => void;
  selectedTemplate?: any | null;
}

export const TaskTemplateSection: React.FC<TaskTemplateSectionProps> = ({
  taskType,
  onTemplateSelect,
  onSaveAsTemplate,
  canSaveAsTemplate,
  hasTemplates,
  onMyTemplatesPress,
  selectedTemplate,
}) => {
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Handle toggle change
  const handleValueChange = (value: boolean) => {
    setSaveAsTemplate(value);
    // Call the callback when toggled on
    if (value && canSaveAsTemplate) {
      onSaveAsTemplate();
    }
  };

  // Don't show template card if we can't save as template or if a template is selected
  if (!canSaveAsTemplate || selectedTemplate) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TemplateCard
        title="Save as template"
        description="Reuse these settings later"
        value={saveAsTemplate}
        onValueChange={handleValueChange}
        icon="bookmark-outline"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
});
