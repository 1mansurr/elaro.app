import React from 'react';
import { TaskFormHeader } from '@/shared/components/task-forms';

interface AssignmentFormHeaderProps {
  onClose: () => void;
  onTemplatePress?: () => void;
  hasTemplates: boolean;
}

export const AssignmentFormHeader: React.FC<AssignmentFormHeaderProps> = ({
  onClose,
  onTemplatePress,
  hasTemplates,
}) => {
  return (
    <TaskFormHeader
      title="New Assignment"
      onClose={onClose}
      showTemplateButton={hasTemplates}
      onTemplatePress={onTemplatePress}
    />
  );
};

