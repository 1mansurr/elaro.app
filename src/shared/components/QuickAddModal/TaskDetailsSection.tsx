import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, COMPONENT_TOKENS } from '@/constants/theme';

type TaskType = 'assignment' | 'lecture' | 'study_session';

interface TaskDetailsSectionProps {
  taskType: TaskType;
  title: string;
  onTaskTypeChange: (type: TaskType) => void;
  onTitleChange: (title: string) => void;
}

export const TaskDetailsSection: React.FC<TaskDetailsSectionProps> = ({
  taskType,
  title,
  onTaskTypeChange,
  onTitleChange,
}) => {
  return (
    <View style={styles.container}>
      {/* Task Type Selector */}
      <Text style={styles.label}>Task Type *</Text>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, taskType === 'assignment' && styles.typeButtonActive]}
          onPress={() => onTaskTypeChange('assignment')}
        >
          <Ionicons 
            name="document-text-outline" 
            size={20} 
            color={taskType === 'assignment' ? COLORS.primary : 'COLORS.gray'} 
          />
          <Text style={[styles.typeButtonText, taskType === 'assignment' && styles.typeButtonTextActive]}>
            Assignment
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.typeButton, taskType === 'lecture' && styles.typeButtonActive]}
          onPress={() => onTaskTypeChange('lecture')}
        >
          <Ionicons 
            name="school-outline" 
            size={20} 
            color={taskType === 'lecture' ? COLORS.primary : 'COLORS.gray'} 
          />
          <Text style={[styles.typeButtonText, taskType === 'lecture' && styles.typeButtonTextActive]}>
            Lecture
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.typeButton, taskType === 'study_session' && styles.typeButtonActive]}
          onPress={() => onTaskTypeChange('study_session')}
        >
          <Ionicons 
            name="book-outline" 
            size={20} 
            color={taskType === 'study_session' ? COLORS.primary : 'COLORS.gray'} 
          />
          <Text style={[styles.typeButtonText, taskType === 'study_session' && styles.typeButtonTextActive]}>
            Study Session
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title Input */}
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={onTitleChange}
        placeholder="Enter task title"
        placeholderTextColor={COLORS.gray}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: COMPONENT_TOKENS.typeSelector.padding,
    backgroundColor: COMPONENT_TOKENS.typeSelector.backgroundColor,
    borderWidth: COMPONENT_TOKENS.typeSelector.borderWidth,
    borderColor: COMPONENT_TOKENS.typeSelector.borderColor,
    borderRadius: COMPONENT_TOKENS.typeSelector.borderRadius,
    gap: SPACING.xs,
  },
  typeButtonActive: {
    borderColor: COMPONENT_TOKENS.typeSelector.activeBorderColor,
    backgroundColor: COMPONENT_TOKENS.typeSelector.activeBackgroundColor,
  },
  typeButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COMPONENT_TOKENS.typeSelector.inactiveTextColor,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  typeButtonTextActive: {
    color: COMPONENT_TOKENS.typeSelector.activeTextColor,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  input: {
    borderWidth: COMPONENT_TOKENS.input.borderWidth,
    borderColor: COMPONENT_TOKENS.input.borderColor,
    borderRadius: COMPONENT_TOKENS.input.borderRadius,
    padding: COMPONENT_TOKENS.input.paddingHorizontal,
    fontSize: FONT_SIZES.md,
    color: COMPONENT_TOKENS.input.textColor,
    marginBottom: SPACING.xs,
    backgroundColor: COMPONENT_TOKENS.input.backgroundColor,
  },
});

export default TaskDetailsSection;
