// FILE: src/components/Calendar/WeekStrip.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface Props {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const WeekStrip: React.FC<Props> = ({ selectedDate, onDateSelect }) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {weekDays.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        return (
          <TouchableOpacity
            key={day.toISOString()}
            style={[
              styles.dayContainer,
              isSelected && styles.selectedDayContainer,
            ]}
            onPress={() => onDateSelect(day)}
          >
            <Text style={[styles.dayName, isSelected && styles.selectedText]}>
              {format(day, 'E')}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.selectedText]}>
              {format(day, 'd')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 10,
  },
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  selectedDayContainer: {
    backgroundColor: '#007AFF',
  },
  dayName: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  selectedText: {
    color: '#fff',
  },
});

export default WeekStrip;