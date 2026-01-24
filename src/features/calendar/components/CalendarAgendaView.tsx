import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { Task } from '@/types';
import WeekStrip from './WeekStrip';
import { CalendarTaskCard } from './CalendarTaskCard';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface CalendarAgendaViewProps {
  selectedDate: Date;
  tasksForSelectedDay: Task[];
  onDateSelect: (date: Date) => void;
  onTaskPress: (task: Task) => void;
  onLockedTaskPress: (task: Task) => void;
  onScroll?: (event: any) => void;
}

export const CalendarAgendaView: React.FC<CalendarAgendaViewProps> = ({
  selectedDate,
  tasksForSelectedDay,
  onDateSelect,
  onTaskPress,
  onLockedTaskPress,
  onScroll,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <>
      <View
        style={[
          styles.weekStripContainer,
          {
            borderBottomColor: isDark ? '#374151' : COLORS.border,
            backgroundColor: isDark ? '#101922' : COLORS.background,
          },
        ]}>
        <WeekStrip selectedDate={selectedDate} onDateSelect={onDateSelect} />
      </View>

      <ScrollView
        style={styles.agendaScrollView}
        contentContainerStyle={styles.agendaContent}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {tasksForSelectedDay.length === 0 ? (
          <View style={styles.emptyAgendaContainer}>
            <Text
              style={[
                styles.emptyAgendaText,
                { color: isDark ? '#9CA3AF' : COLORS.textSecondary },
              ]}>
              No tasks scheduled for this day
            </Text>
          </View>
        ) : (
          tasksForSelectedDay.map((task, index) => {
            const taskTime = new Date(task.startTime || task.date);
            const endTime = task.endTime ? new Date(task.endTime) : null;
            const timeStr = format(taskTime, 'h:mm');
            const endTimeStr = endTime ? format(endTime, 'h:mm') : null;

            return (
              <View
                key={`${task.type}-${task.id}-${index}`}
                style={styles.agendaRow}>
                <View style={styles.timeColumn}>
                  <Text
                    style={[
                      styles.timeText,
                      { color: isDark ? '#FFFFFF' : COLORS.textPrimary },
                    ]}>
                    {timeStr}
                  </Text>
                  {endTimeStr && (
                    <Text
                      style={[
                        styles.endTimeText,
                        {
                          color: isDark ? '#9CA3AF' : COLORS.textSecondary,
                        },
                      ]}>
                      {endTimeStr}
                    </Text>
                  )}
                </View>
                <CalendarTaskCard
                  task={task}
                  onPress={() =>
                    task.isLocked ? onLockedTaskPress(task) : onTaskPress(task)
                  }
                  onMorePress={() => {
                    if (!task.isLocked) {
                      onTaskPress(task);
                    }
                  }}
                  isLocked={task.isLocked}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  weekStripContainer: {
    borderBottomWidth: 1,
    backgroundColor: COLORS.background,
  },
  agendaScrollView: {
    flex: 1,
  },
  agendaContent: {
    padding: SPACING.md,
    gap: SPACING.lg,
  },
  agendaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  timeColumn: {
    width: 56,
    alignItems: 'flex-end',
    paddingTop: SPACING.xs,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  endTimeText: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  emptyAgendaContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyAgendaText: {
    fontSize: FONT_SIZES.md,
  },
});
