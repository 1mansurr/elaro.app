import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface DayPickerCardProps {
  selectedDay: number | null;
  activePicker: 'day' | 'start' | 'end' | null;
  onToggle: () => void;
  onSelect: (dayIndex: number) => void;
}

export const DayPickerCard: React.FC<DayPickerCardProps> = ({
  selectedDay,
  activePicker,
  onToggle,
  onSelect,
}) => {
  const { theme } = useTheme();

  // Organize days into a grid (2-3 rows)
  const dayGrid = [
    dayNames.slice(0, 3), // First row: Sun, Mon, Tue
    dayNames.slice(3, 6), // Second row: Wed, Thu, Fri
    dayNames.slice(6), // Third row: Sat
  ];

  return (
    <>
      <TouchableOpacity
        style={styles.cardRow}
        onPress={onToggle}
        activeOpacity={0.7}>
        <View style={styles.cardRowLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="calendar-outline" size={20} color="#dc2626" />
          </View>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Day</Text>
        </View>
        <View style={styles.cardRowRight}>
          <Text style={styles.dayBadge}>
            {selectedDay !== null ? dayNames[selectedDay] : 'Select Day'}
          </Text>
          <Ionicons
            name={activePicker === 'day' ? 'chevron-up' : 'chevron-forward'}
            size={16}
            color="#9ca3af"
          />
        </View>
      </TouchableOpacity>

      {/* Inline Day Picker Grid */}
      {activePicker === 'day' && (
        <View style={styles.inlinePickerContainer}>
          <View style={styles.dayGridContainer}>
            {dayGrid.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.dayGridRow}>
                {row.map((dayName, dayIndex) => {
                  const actualIndex = rowIndex * 3 + dayIndex;
                  const isSelected = selectedDay === actualIndex;
                  return (
                    <TouchableOpacity
                      key={actualIndex}
                      style={[
                        styles.dayGridButton,
                        isSelected && styles.dayGridButtonActive,
                        {
                          backgroundColor: isSelected
                            ? '#135bec20'
                            : 'transparent',
                          borderColor: isSelected ? '#135bec' : '#e5e7eb',
                        },
                      ]}
                      onPress={() => onSelect(actualIndex)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.dayGridButtonText,
                          {
                            color: isSelected ? '#135bec' : theme.text,
                            fontWeight: isSelected ? '600' : '500',
                          },
                        ]}>
                        {dayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  dayBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#135bec',
    backgroundColor: '#135bec10',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inlinePickerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dayGridContainer: {
    gap: 8,
  },
  dayGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayGridButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayGridButtonActive: {
    borderWidth: 2,
  },
  dayGridButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

