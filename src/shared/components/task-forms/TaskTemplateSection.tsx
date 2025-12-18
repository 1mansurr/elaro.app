import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TemplateCard } from '@/shared/components';
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
  return (
    <View style={styles.container}>
      <TemplateCard
        taskType={taskType}
        onMyTemplatesPress={onMyTemplatesPress}
        onSaveAsTemplate={onSaveAsTemplate}
        canSaveAsTemplate={canSaveAsTemplate}
        hasTemplates={hasTemplates}
        selectedTemplate={selectedTemplate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
});

