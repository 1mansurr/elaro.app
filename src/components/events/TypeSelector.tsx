import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';

// Enhanced color palette
const EVENT_COLORS = {
  Study: { primary: '#10b981', light: '#d1fae5' },
  Assignment: { primary: '#f59e0b', light: '#fef3c7' },
  Exam: { primary: '#ef4444', light: '#fee2e2' },
  Lecture: { primary: '#3b82f6', light: '#dbeafe' },
  Program: { primary: '#8b5cf6', light: '#ede9fe' },
};

const EVENT_TYPES = [
  { key: 'Study', label: 'Study', icon: '📗', color: EVENT_COLORS.Study },
  {
    key: 'Assignment',
    label: 'Assignment',
    icon: '📝',
    color: EVENT_COLORS.Assignment,
  },
  { key: 'Exam', label: 'Exam', icon: '🔴', color: EVENT_COLORS.Exam },
  { key: 'Lecture', label: 'Lecture', icon: '👨‍🏫', color: EVENT_COLORS.Lecture },
  { key: 'Program', label: 'Program', icon: '🎯', color: EVENT_COLORS.Program },
];

interface TypeSelectorProps {
  selectedType: string;
  onSelect: (type: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({
  selectedType,
  onSelect,
  isVisible,
  onClose,
}) => {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Event Type</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close type selector">
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}>
            {EVENT_TYPES.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeOption,
                  selectedType === type.key && styles.typeOptionSelected,
                ]}
                onPress={() => {
                  onSelect(type.key);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select ${type.label} type`}
                accessibilityState={{ selected: selectedType === type.key }}>
                <View
                  style={[
                    styles.typeIcon,
                    { backgroundColor: type.color.light },
                  ]}>
                  <Text style={styles.typeIconText}>{type.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.key && styles.typeLabelSelected,
                  ]}>
                  {type.label}
                </Text>
                {selectedType === type.key && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={type.color.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '70%',
    ...SHADOWS.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray50,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  typeIconText: {
    fontSize: 20,
  },
  typeLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
  },
  typeLabelSelected: {
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
});

export default TypeSelector;
