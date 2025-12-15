import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';

const HOUR_HEIGHT = 60;
const DAY_WIDTH = 120;
const TIME_COLUMN_WIDTH = 50;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface WeekGridViewProps {
  tasks: Task[];
  selectedDate: Date;
  onTaskPress: (task: Task) => void;
  onLockedTaskPress?: (task: Task) => void;
}

interface PositionedTask {
  task: Task;
  top: number;
  height: number;
  dayIndex: number;
  column: number;
  totalColumns: number;
}

const WeekGridView: React.FC<WeekGridViewProps> = ({
  tasks,
  selectedDate,
  onTaskPress,
  onLockedTaskPress,
}) => {
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Group tasks by day and calculate positions
  const tasksByDay = useMemo(() => {
    const grouped: { [key: number]: Task[] } = {};

    weekDays.forEach((_, index) => {
      grouped[index] = [];
    });

    tasks.forEach(task => {
      const taskDate = new Date(task.startTime || task.date);
      const dayIndex = weekDays.findIndex(day => isSameDay(day, taskDate));

      if (dayIndex !== -1) {
        grouped[dayIndex].push(task);
      }
    });

    return grouped;
  }, [tasks, weekDays]);

  // Calculate positions and handle overlaps
  const positionedTasks = useMemo(() => {
    const positioned: PositionedTask[] = [];

    Object.entries(tasksByDay).forEach(([dayIndexStr, dayTasks]) => {
      const dayIndex = parseInt(dayIndexStr);

      // Sort tasks by start time
      const sortedTasks = [...dayTasks].sort((a, b) => {
        const timeA = new Date(a.startTime || a.date).getTime();
        const timeB = new Date(b.startTime || b.date).getTime();
        return timeA - timeB;
      });

      // Detect overlaps and assign columns
      const taskColumns: {
        task: Task;
        startMinutes: number;
        endMinutes: number;
        column: number;
      }[] = [];

      sortedTasks.forEach(task => {
        const startTime = new Date(task.startTime || task.date);
        const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();

        // Calculate end time
        let endMinutes = startMinutes + 60; // Default 1 hour
        if (task.type === 'lecture' && task.endTime) {
          const endTime = new Date(task.endTime);
          if (endTime > startTime) {
            endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
          }
        }

        // Find which column this task should go in (to avoid overlap)
        let column = 0;
        let foundColumn = false;

        while (!foundColumn) {
          const overlapping = taskColumns.some(
            t =>
              t.column === column &&
              t.startMinutes < endMinutes &&
              t.endMinutes > startMinutes,
          );

          if (!overlapping) {
            foundColumn = true;
          } else {
            column++;
          }
        }

        taskColumns.push({ task, startMinutes, endMinutes, column });
      });

      // Calculate max columns for this day
      const maxColumn = Math.max(...taskColumns.map(t => t.column), 0);
      const totalColumns = maxColumn + 1;

      // Create positioned tasks
      taskColumns.forEach(({ task, startMinutes, endMinutes, column }) => {
        const top = (startMinutes / 60) * HOUR_HEIGHT;
        const height = Math.max(
          ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 2,
          40,
        );

        positioned.push({
          task,
          top,
          height,
          dayIndex,
          column,
          totalColumns,
        });
      });
    });

    return positioned;
  }, [tasksByDay]);

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return COLORS.primary;
      case 'assignment':
        return '#FF9500';
      case 'study_session':
        return '#34C759';
      default:
        return COLORS.gray;
    }
  };

  const renderTask = (positioned: PositionedTask) => {
    const { task, top, height, dayIndex, column, totalColumns } = positioned;
    const isLocked = task.isLocked || false;
    const isCompleted = task.status === 'completed';
    const isExample = (task as any).is_example === true;

    const columnWidth = DAY_WIDTH / totalColumns;
    const left =
      TIME_COLUMN_WIDTH + dayIndex * DAY_WIDTH + column * columnWidth;

    const startTime = new Date(task.startTime || task.date);
    const timeStr = format(startTime, 'h:mm a');

    return (
      <TouchableOpacity
        key={task.id}
        style={[
          styles.taskCard,
          {
            top,
            left,
            height,
            width: columnWidth - 2,
            backgroundColor: getTaskColor(task.type),
          },
          isCompleted && styles.completedTask,
          isLocked && styles.lockedTask,
        ]}
        onPress={() => {
          if (isLocked && onLockedTaskPress) {
            onLockedTaskPress(task);
          } else {
            onTaskPress(task);
          }
        }}
        activeOpacity={0.8}>
        {isLocked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={10} color="#fff" />
          </View>
        )}
        {isExample && (
          <View style={styles.exampleBadge}>
            <Text style={styles.exampleBadgeText}>EX</Text>
          </View>
        )}
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.name || task.title}
        </Text>
        <Text style={styles.taskTime}>{timeStr}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={styles.headerRow}>
        <View style={styles.timeHeaderPlaceholder} />
        {weekDays.map((day, index) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);

          return (
            <View
              key={index}
              style={[
                styles.dayHeader,
                isSelected && styles.dayHeaderSelected,
              ]}>
              <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                {format(day, 'EEE')}
              </Text>
              <Text
                style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                {format(day, 'd')}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Scrollable Grid */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {/* Time Column */}
          <View style={styles.timeColumn}>
            {hours.map(hour => (
              <View key={hour} style={styles.hourSlot}>
                <Text style={styles.hourLabel}>
                  {format(new Date().setHours(hour, 0), 'ha')}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {/* Background grid lines */}
            {hours.map(hour => (
              <View
                key={`line-${hour}`}
                style={[styles.gridLine, { top: hour * HOUR_HEIGHT }]}
              />
            ))}

            {/* Day columns */}
            {weekDays.map((_, index) => (
              <View
                key={`col-${index}`}
                style={[styles.dayColumn, { left: index * DAY_WIDTH }]}
              />
            ))}

            {/* Tasks */}
            {positionedTasks.map(positioned => renderTask(positioned))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  timeHeaderPlaceholder: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: COLORS.background,
  },
  dayHeader: {
    width: DAY_WIDTH,
    padding: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  dayHeaderSelected: {
    backgroundColor: '#F0F5FF',
  },
  dayName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.gray,
    textTransform: 'uppercase',
  },
  dayNameToday: {
    color: COLORS.primary,
  },
  dayNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginTop: 2,
  },
  dayNumberToday: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    minHeight: 24 * HOUR_HEIGHT,
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    backgroundColor: COLORS.background,
  },
  hourSlot: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  hourLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  daysGrid: {
    flex: 1,
    position: 'relative',
    width: 7 * DAY_WIDTH,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E8E8ED',
  },
  dayColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: DAY_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#E8E8ED',
  },
  taskCard: {
    position: 'absolute',
    borderRadius: BORDER_RADIUS.sm,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
  },
  completedTask: {
    opacity: 0.6,
  },
  lockedTask: {
    opacity: 0.5,
    backgroundColor: '#8E8E93',
  },
  lockBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BORDER_RADIUS.sm,
    padding: 2,
  },
  exampleBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: BORDER_RADIUS.xs,
  },
  exampleBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  taskTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskTime: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9,
    fontWeight: '500',
  },
});

export default WeekGridView;
