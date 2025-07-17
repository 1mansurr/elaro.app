import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { DAY_NAMES, MONTH_NAMES } from '../constants/calendar';

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  onPickerModeChange?: (mode: 'date' | 'time' | null) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  label = 'Date & Time',
  onPickerModeChange,
}) => {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(value.getMonth());
  const [calendarYear, setCalendarYear] = useState(value.getFullYear());

  // --- Calendar Logic ---
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOfWeek = getFirstDayOfWeek(calendarYear, calendarMonth);
  const calendarDays: (number | null)[] = Array(firstDayOfWeek).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const handleDayPress = (day: number | null) => {
    if (!day) return;
    const newDate = new Date(calendarYear, calendarMonth, day, value.getHours(), value.getMinutes());
    onChange(newDate);
    setMode(null);
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = calendarMonth + delta;
    let newYear = calendarYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  // --- Time Picker Logic ---
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());

  const handleTimeSelect = (hour: number, minute: number) => {
    const newDate = new Date(value);
    newDate.setHours(hour);
    newDate.setMinutes(minute);
    onChange(newDate);
    setMode(null);
  };

  const setPickerMode = (newMode: 'date' | 'time' | null) => {
    setMode(newMode);
    if (typeof onPickerModeChange === 'function') {
      onPickerModeChange(newMode);
    }
  };

  // --- UI ---
  // Add a prop to control scrollEnabled for parent ScrollView
  // (This is a pattern for usage, but here we just expose the prop)
  // Instead, we can use a callback or context, but for now, document for parent usage.

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => {
            setPickerMode('date');
            setCalendarMonth(value.getMonth());
            setCalendarYear(value.getFullYear());
          }}
          style={{
            flex: 1,
            backgroundColor: theme.input,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'date' ? theme.primary : theme.text, fontWeight: mode === 'date' ? 'bold' : 'normal' }}>
            {value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setPickerMode('time');
            setSelectedHour(value.getHours());
            setSelectedMinute(value.getMinutes());
          }}
          style={{
            flex: 1,
            backgroundColor: theme.input,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: mode === 'time' ? theme.primary : theme.text, fontWeight: mode === 'time' ? 'bold' : 'normal' }}>
            {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Pressable>
      </View>
      {mode === 'date' && (
        <View style={styles.calendarContainer(theme)}>
          <View style={styles.calendarHeader(theme)}>
            <TouchableOpacity onPress={() => handleMonthChange(-1)}>
              <Text style={styles.arrow(theme)}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel(theme)}>
              {MONTH_NAMES[calendarMonth]} {calendarYear}
            </Text>
            <TouchableOpacity onPress={() => handleMonthChange(1)}>
              <Text style={styles.arrow(theme)}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {DAY_NAMES.map((d) => (
              <Text key={d} style={styles.weekDay(theme)}>{d}</Text>
            ))}
          </View>
          {/* Render calendar days in rows of 7 */}
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIdx) => (
            <View key={weekIdx} style={styles.daysGrid}>
              {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, idx) => {
                const isSelected = day === value.getDate() && calendarMonth === value.getMonth() && calendarYear === value.getFullYear();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell(theme),
                      isSelected && styles.selectedDay(theme),
                    ]}
                    onPress={() => handleDayPress(day)}
                    disabled={!day}
                  >
                    <Text style={isSelected ? styles.selectedDayText(theme) : styles.dayText(theme)}>
                      {day ? day : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
      {mode === 'time' && (
        <View style={styles.timePickerContainer(theme)}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            {/* Hour wheel */}
            <ScrollView
              style={{ height: 120, width: 60 }}
              contentContainerStyle={{ alignItems: 'center' }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            >
              {hours.map((item) => (
                <TouchableOpacity key={item} onPress={() => setSelectedHour(item)}>
                  <Text style={[styles.timeText(theme), item === selectedHour && styles.selectedTimeText(theme)]}>{item.toString().padStart(2, '0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.colon(theme)}>{':'}</Text>
            {/* Minute wheel */}
            <ScrollView
              style={{ height: 120, width: 60 }}
              contentContainerStyle={{ alignItems: 'center' }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              onTouchStart={() => { if (typeof onPickerModeChange === 'function') onPickerModeChange('time'); }}
            >
              {minutes.map((item) => (
                <TouchableOpacity key={item} onPress={() => setSelectedMinute(item)}>
                  <Text style={[styles.timeText(theme), item === selectedMinute && styles.selectedTimeText(theme)]}>{item.toString().padStart(2, '0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity
            style={styles.setTimeButton(theme)}
            onPress={() => {
              handleTimeSelect(selectedHour, selectedMinute);
              setPickerMode(null);
            }}
          >
            <Text style={styles.setTimeButtonText(theme)}>Set Time</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = {
  calendarContainer: (theme: any) => ({
    marginTop: 12,
    backgroundColor: theme.card,
    borderColor: theme.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  }),
  calendarHeader: (theme: any) => ({
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  }),
  arrow: (theme: any) => ({
    fontSize: 22,
    color: theme.text,
    paddingHorizontal: 12,
    fontWeight: 'bold' as const,
  }),
  monthLabel: (theme: any) => ({
    fontSize: 18,
    color: theme.text,
    fontWeight: '600' as const,
  }),
  weekRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  weekDay: (theme: any) => ({
    flex: 1,
    textAlign: 'center' as const,
    color: theme.textSecondary,
    fontWeight: '500' as const,
    fontSize: 13,
  }),
  daysGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
  },
  dayCell: (theme: any) => ({
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginVertical: 2,
    borderRadius: 20,
  }),
  selectedDay: (theme: any) => ({
    backgroundColor: theme.primary,
  }),
  dayText: (theme: any) => ({
    color: theme.text,
    fontSize: 16,
    fontWeight: '500' as const,
  }),
  selectedDayText: (theme: any) => ({
    color: theme.white,
    fontWeight: 'bold' as const,
    fontSize: 16,
  }),
  timePickerContainer: (theme: any) => ({
    marginTop: 12,
    backgroundColor: theme.card,
    borderColor: theme.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' as const,
  }),
  timeText: (theme: any) => ({
    color: theme.text,
    fontSize: 22,
    paddingVertical: 6,
    textAlign: 'center' as const,
  }),
  selectedTimeText: (theme: any) => ({
    color: theme.primary,
    fontWeight: 'bold' as const,
    fontSize: 26,
  }),
  colon: (theme: any) => ({
    fontSize: 22,
    color: theme.text,
    marginHorizontal: 8,
    fontWeight: 'bold' as const,
  }),
  setTimeButton: (theme: any) => ({
    marginTop: 12,
    backgroundColor: theme.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  }),
  setTimeButtonText: (theme: any) => ({
    color: theme.white,
    fontWeight: '600' as const,
    fontSize: 16,
    textAlign: 'center' as const,
  }),
}; 