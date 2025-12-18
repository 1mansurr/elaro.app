import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REMINDER_OPTIONS } from '@/utils/reminderUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface ReminderModalProps {
  visible: boolean;
  selectedReminders: number[];
  onSelect: (minutes: number) => void;
  onClose: () => void;
  maxReminders?: number;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  visible,
  selectedReminders,
  onSelect,
  onClose,
  maxReminders = 2,
}) => {
  const { theme } = useTheme();

  const handleSelect = (minutes: number) => {
    onSelect(minutes);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
            },
          ]}
          onStartShouldSetResponder={() => true}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Select Reminder
          </Text>
          <Text
            style={[
              styles.modalSubtitle,
              { color: theme.isDark ? '#9CA3AF' : '#6B7280' },
            ]}>
            Choose up to {maxReminders} reminders
          </Text>
          <ScrollView style={styles.reminderOptionsList}>
            {REMINDER_OPTIONS.map(option => {
              const isSelected = selectedReminders.includes(option.value);
              const isDisabled = !isSelected && selectedReminders.length >= maxReminders;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reminderOption,
                    isSelected && styles.reminderOptionSelected,
                    {
                      backgroundColor: isSelected
                        ? COLORS.primary + '1A'
                        : 'transparent',
                      borderColor: isSelected
                        ? COLORS.primary + '33'
                        : theme.isDark
                          ? '#374151'
                          : '#E5E7EB',
                    },
                  ]}
                  onPress={() => handleSelect(option.value)}
                  disabled={isDisabled}>
                  <Text
                    style={[
                      styles.reminderOptionText,
                      {
                        color: isSelected
                          ? COLORS.primary
                          : theme.isDark
                            ? '#FFFFFF'
                            : '#111418',
                      },
                      isDisabled && { opacity: 0.5 },
                    ]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
  },
  reminderOptionsList: {
    maxHeight: 300,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  reminderOptionSelected: {
    borderWidth: 2,
  },
  reminderOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
});

