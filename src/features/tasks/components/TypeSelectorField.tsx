import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

export type TaskType = 'assignment' | 'study_session';

interface TypeSelectorFieldProps {
  value: TaskType | null;
  onChange: (type: TaskType) => void;
}

const TYPE_CONFIG: Record<TaskType, { label: string; color: string }> = {
  assignment: { label: 'Assignment', color: '#E05252' },
  study_session: { label: 'Study Session', color: '#3DBF7A' },
};

export const TypeSelectorField: React.FC<TypeSelectorFieldProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (type: TaskType) => {
    onChange(type);
    setIsOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setIsOpen(prev => !prev)}
        activeOpacity={0.7}>
        {value ? (
          <View
            style={[
              styles.capsule,
              { backgroundColor: TYPE_CONFIG[value].color },
            ]}>
            <Text style={styles.capsuleText}>{TYPE_CONFIG[value].label}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>Task Type</Text>
        )}
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          {(Object.keys(TYPE_CONFIG) as TaskType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={styles.dropdownOption}
              onPress={() => handleSelect(type)}
              activeOpacity={0.8}>
              <View
                style={[
                  styles.capsule,
                  { backgroundColor: TYPE_CONFIG[type].color },
                ]}>
                <Text style={styles.capsuleText}>
                  {TYPE_CONFIG[type].label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    fontSize: FONT_SIZES.md,
    color: '#9CA3AF',
  },
  capsule: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  capsuleText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});
