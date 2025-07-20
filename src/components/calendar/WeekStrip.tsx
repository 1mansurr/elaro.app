import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { CalendarItem, EVENT_COLORS, DAY_NAMES } from '../../constants/calendar';

interface WeekStripProps {
  weekDates: Date[];
  selectedDate: Date;
  onDatePress: (date: Date) => void;
  scheduleData: CalendarItem[];
  viewMode: 'daily' | 'weekly';
}

export const WeekStrip: React.FC<WeekStripProps> = ({
  weekDates,
  selectedDate,
  onDatePress,
  scheduleData,
  viewMode,
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip}>
    {weekDates.map((date, index) => {
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      const dayItems = scheduleData.filter(item => item.date === date.toDateString());
      
      return (
        <TouchableOpacity
          key={index}
          style={[
            styles.dateButton,
            isSelected && styles.selectedDateButton,
            isToday && styles.todayHighlight, // always apply todayHighlight if today
          ]}
          onPress={() => onDatePress(date)}
          accessibilityRole="button"
          accessibilityLabel={`${DAY_NAMES[index]} ${date.getDate()}`}
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={[
            styles.dayText,
            isSelected && styles.selectedText,
            isToday && styles.todayText,
          ]}>
            {DAY_NAMES[index]}
          </Text>
          <Text style={[
            styles.dateText,
            isSelected && styles.selectedText,
            isToday && styles.todayText,
          ]}>
            {date.getDate()}
          </Text>
          {isToday && (
            <View style={styles.todayDot} />
          )}
          {viewMode === 'weekly' && dayItems.length > 0 && (
            <View style={styles.eventDots}>
              {dayItems.slice(0, 3).map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.eventDot,
                    { backgroundColor: EVENT_COLORS[item.type].primary }
                  ]}
                />
              ))}
              {dayItems.length > 3 && (
                <Text style={styles.moreText}>+{dayItems.length - 3}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  weekStrip: {
    marginBottom: SPACING.md,
  },
  dateButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 50,
  },
  selectedDateButton: {
    backgroundColor: COLORS.primary,
  },
  todayButton: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
  },
  selectedText: {
    color: COLORS.white,
  },
  todayText: {
    color: COLORS.primary,
  },
  eventDots: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  todayHighlight: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    alignSelf: 'center',
  },
}); 