import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface CalendarMonthViewProps {
  selectedDate: Date;
  markedDates: Record<string, any>;
  tasksForSelectedDay: Task[];
  onDayPress: (day: DateData) => void;
  onMonthChange: (months: DateData[]) => void;
  renderTaskItem: ({ item }: { item: Task }) => React.ReactElement;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  selectedDate,
  markedDates,
  tasksForSelectedDay,
  onDayPress,
  onMonthChange,
  renderTaskItem,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.monthViewContainer}>
      <Calendar
        current={selectedDate.toISOString()}
        onDayPress={onDayPress}
        onVisibleMonthsChange={onMonthChange}
        markedDates={markedDates}
        markingType="multi-dot"
        theme={{
          backgroundColor: theme.isDark ? '#101922' : COLORS.background,
          calendarBackground: theme.isDark ? '#101922' : COLORS.background,
          textSectionTitleColor: theme.isDark ? '#9CA3AF' : COLORS.gray,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.background,
          todayTextColor: COLORS.primary,
          dayTextColor: theme.isDark ? '#FFFFFF' : COLORS.text,
          textDisabledColor: theme.isDark ? '#6B7280' : COLORS.lightGray,
          monthTextColor: theme.isDark ? '#FFFFFF' : COLORS.text,
          textMonthFontWeight: 'bold',
          textDayFontSize: FONT_SIZES.md,
          textMonthFontSize: FONT_SIZES.lg,
          textDayHeaderFontSize: FONT_SIZES.sm,
        }}
      />

      {/* Task List for Selected Date */}
      <View style={styles.selectedDateContainer}>
        <Text
          style={[
            styles.selectedDateTitle,
            { color: theme.isDark ? '#FFFFFF' : COLORS.text },
          ]}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>
        {tasksForSelectedDay.length === 0 ? (
          <View style={styles.noTasksContainer}>
            <Text
              style={[
                styles.noTasksText,
                { color: theme.isDark ? '#9CA3AF' : COLORS.textSecondary },
              ]}>
              No tasks for this day
            </Text>
          </View>
        ) : (
          <FlatList
            data={tasksForSelectedDay}
            renderItem={renderTaskItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.taskList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  monthViewContainer: {
    flex: 1,
  },
  selectedDateContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  selectedDateTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  noTasksContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  noTasksText: {
    fontSize: FONT_SIZES.md,
  },
  taskList: {
    paddingBottom: SPACING.lg,
  },
});

