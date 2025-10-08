import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, COMPONENTS } from '../constants/theme';

// Define the available options
const REMINDER_OPTIONS = [
  { label: '5 minutes before', value: 5 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 }, // in minutes
];

interface ReminderSelectorProps {
  selectedReminders: number[]; // Array of selected values (in minutes)
  onSelectionChange: (reminders: number[]) => void;
  maxReminders?: number;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

const ReminderSelector: React.FC<ReminderSelectorProps> = ({ 
  selectedReminders, 
  onSelectionChange, 
  maxReminders = 3,
  label = 'Set Reminder',
  required = false,
  error,
  helperText
}) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const handleToggleReminder = (value: number) => {
    const isSelected = selectedReminders.includes(value);
    let newSelection = [...selectedReminders];

    if (isSelected) {
      newSelection = newSelection.filter(item => item !== value);
    } else {
      if (newSelection.length < maxReminders) {
        newSelection.push(value);
      } else {
        // Optional: Show an alert or toast that the limit is reached
        alert(`You can only add up to ${maxReminders} reminders.`);
      }
    }
    onSelectionChange(newSelection.sort((a, b) => a - b));
  };

  const getDisplayText = () => {
    if (selectedReminders.length === 0) return 'No reminders set';
    if (selectedReminders.length === 1) return '1 reminder set';
    return `${selectedReminders.length} reminders set`;
  };

  const getSelectedLabels = () => {
    return selectedReminders
      .map(value => REMINDER_OPTIONS.find(option => option.value === value)?.label)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, error ? styles.labelError : null]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity 
        style={[
          styles.inputBox, 
          error ? styles.inputBoxError : null,
          selectedReminders.length > 0 ? styles.inputBoxSelected : null
        ]} 
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.inputContent}>
          <Text style={[styles.inputText, error ? styles.inputTextError : null]}>
            {getDisplayText()}
          </Text>
          {selectedReminders.length > 0 && (
            <Text style={styles.selectedLabels} numberOfLines={1}>
              {getSelectedLabels()}
            </Text>
          )}
        </View>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={error ? COLORS.error : COLORS.textSecondary} 
        />
      </TouchableOpacity>

      {(error || helperText) && (
        <View style={styles.helperContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {helperText && !error && (
            <Text style={styles.helperText}>{helperText}</Text>
          )}
        </View>
      )}

      <Modal visible={isModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Reminders</Text>
              <Text style={styles.modalSubtitle}>
                Choose up to {maxReminders} reminder{maxReminders > 1 ? 's' : ''}
              </Text>
            </View>
            
            {REMINDER_OPTIONS.map((option, index) => {
              const isSelected = selectedReminders.includes(option.value);
              const isDisabled = !isSelected && selectedReminders.length >= maxReminders;
              
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                    isDisabled && styles.optionRowDisabled,
                    index === REMINDER_OPTIONS.length - 1 && styles.optionRowLast
                  ]}
                  onPress={() => !isDisabled && handleToggleReminder(option.value)}
                  disabled={isDisabled}
                >
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    isDisabled && styles.optionTextDisabled
                  ]}>
                    {option.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={24} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    marginBottom: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  labelError: {
    color: COLORS.error,
  },
  required: {
    color: COLORS.error,
  },
  inputBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: COMPONENTS.input.borderWidth,
    borderColor: COLORS.border,
    borderRadius: COMPONENTS.input.borderRadius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: COMPONENTS.input.height,
  },
  inputBoxError: {
    borderColor: COLORS.error,
  },
  inputBoxSelected: {
    borderColor: COLORS.primary,
  },
  inputContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  inputText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '400',
  },
  inputTextError: {
    color: COLORS.error,
  },
  selectedLabels: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  helperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  optionRowSelected: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '400',
    flex: 1,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  optionTextDisabled: {
    color: COLORS.textLight,
  },
});

export default ReminderSelector;
