import React from 'react';
import { TaskFormHeader } from '@/shared/components/task-forms';

interface LectureFormHeaderProps {
  onClose: () => void;
  onTemplatePress?: () => void;
  hasTemplates: boolean;
}

export const LectureFormHeader: React.FC<LectureFormHeaderProps> = ({
  onClose,
  onTemplatePress,
  hasTemplates,
}) => {
  return (
    <TaskFormHeader
      title="New Lecture"
      onClose={onClose}
      showTemplateButton={hasTemplates}
      onTemplatePress={onTemplatePress}
    />
  );
};

