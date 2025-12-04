import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Calendar, DateData } from 'react-native-calendars';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarTasksWithLockState } from '@/features/calendar/hooks/useCalendarTasksWithLockState';
import { useCalendarData, useCalendarMonthData } from '@/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Task, RootStackParamList } from '@/types';
import {
  WeekStrip,
  Timeline,
  WeekGridView,
} from '@/features/calendar/components';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import { QueryStateWrapper } from '@/shared/components';
import {
  startOfWeek,
  isSameDay,
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { useSubscription } from '@/hooks/useSubscription';
import {
  useDeleteTask,
  useCompleteTask,
  useRestoreTask,
} from '@/hooks/useTaskMutations';
import { useToast } from '@/contexts/ToastContext';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { Ionicons } from '@expo/vector-icons';
import { useJSThreadMonitor } from '@/hooks/useJSThreadMonitor';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';
import {
  RevenueCat,
  PurchasesOfferingType as PurchasesOffering,
  PurchasesPackageType as PurchasesPackage,
} from '@/services/revenueCatWrapper';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type ViewMode = 'month' | 'week' | 'agenda';

const CalendarScreen = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const isGuest = !session;

  // const { offerings, purchasePackage } = useSubscription();
  const { purchasePackage } = useSubscription();

  // Mock offerings for now
  const offerings = { current: null as PurchasesOffering | null };

  // Mutations for task actions
  const deleteTaskMutation = useDeleteTask();
  const completeTaskMutation = useCompleteTask();
  const restoreTaskMutation = useRestoreTask();
  const { showToast } = useToast();

  // JS Thread monitoring (dev only)
  const jsThreadMetrics = useJSThreadMonitor({
    enabled: __DEV__,
    logSlowFrames: false, // Disable individual frame logging - too verbose
    slowFrameThreshold: 20,
  });

  // Memory monitoring (dev only)
  useMemoryMonitor(__DEV__, 50, 30000); // 50% threshold, check every 30s

  // Log warnings in dev if too many slow frames (only log summary at intervals)
  const lastLoggedCountRef = React.useRef(0);
  React.useEffect(() => {
    if (__DEV__ && jsThreadMetrics.slowFrameCount > 100) {
      // Only log every 50 frames to reduce noise
      const framesSinceLastLog = jsThreadMetrics.slowFrameCount - lastLoggedCountRef.current;
      if (framesSinceLastLog >= 50) {
      console.warn(
        `⚠️ CalendarScreen: ${jsThreadMetrics.slowFrameCount} slow frames detected. Avg frame time: ${jsThreadMetrics.averageFrameTime.toFixed(2)}ms`,
      );
        lastLoggedCountRef.current = jsThreadMetrics.slowFrameCount;
      }
    }
  }, [jsThreadMetrics.slowFrameCount, jsThreadMetrics.averageFrameTime]);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const scrollLock = useRef({ top: false, bottom: false });

  // Fetch data based on view mode
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const {
    data: weekCalendarData,
    isLoading: isLoadingWeek,
    isError: isErrorWeek,
    error: errorWeek,
    refetch: refetchWeek,
    isRefetching: isRefetchingWeek,
  } = useCalendarData(currentDate);
  const {
    data: monthCalendarData,
    isLoading: isLoadingMonth,
    isError: isErrorMonth,
    error: errorMonth,
    refetch: refetchMonth,
    isRefetching: isRefetchingMonth,
  } = useCalendarMonthData(currentYear, currentMonth);

  // Select appropriate data based on view mode
  const calendarData =
    viewMode === 'month' ? monthCalendarData : weekCalendarData;
  const isLoading = viewMode === 'month' ? isLoadingMonth : isLoadingWeek;
  const isError = viewMode === 'month' ? isErrorMonth : isErrorWeek;
  const error = viewMode === 'month' ? errorMonth : errorWeek;
  const refetch = viewMode === 'month' ? refetchMonth : refetchWeek;
  const isRefetching =
    viewMode === 'month' ? isRefetchingMonth : isRefetchingWeek;

  // Get all tasks for the week (for week grid view)
  const weekTasks = useMemo(() => {
    if (!calendarData) return [];
    return Object.values(calendarData).flat();
  }, [calendarData]);

  const handleDateSelect = useCallback(
    (newDate: Date) => {
      if (isGuest) return;

      const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
      if (!isSameDay(newWeekStart, currentWeekStart)) {
        setCurrentWeekStart(newWeekStart);
        setCurrentDate(newWeekStart);
      }
      setSelectedDate(newDate);
    },
    [isGuest, currentWeekStart],
  );

  const handleMonthDayPress = useCallback((day: DateData) => {
    const newDate = new Date(day.year, day.month - 1, day.day);
    setSelectedDate(newDate);
  }, []);

  const handleMonthChange = useCallback((months: DateData[]) => {
    if (months.length > 0) {
      const newDate = new Date(months[0].year, months[0].month - 1, 1);
      setSelectedDate(newDate);
    }
  }, []);

  const handleTaskPress = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;

    let modalName:
      | 'AddLectureFlow'
      | 'AddAssignmentFlow'
      | 'AddStudySessionFlow';
    switch (selectedTask.type) {
      case 'lecture':
        modalName = 'AddLectureFlow';
        break;
      case 'assignment':
        modalName = 'AddAssignmentFlow';
        break;
      case 'study_session':
        modalName = 'AddStudySessionFlow';
        break;
      default:
        Alert.alert('Error', 'Cannot edit this type of task.');
        return;
    }

    handleCloseSheet();
    navigation.navigate(modalName, {
      initialData: { taskToEdit: selectedTask },
    });
  }, [selectedTask, handleCloseSheet, navigation]);

  const handleCompleteTask = useCallback(async () => {
    if (!selectedTask) return;

    try {
      await completeTaskMutation.mutateAsync({
        taskId: selectedTask.id,
        taskType: selectedTask.type,
        taskTitle: selectedTask.name || selectedTask.title || 'Untitled Task',
      });

      Alert.alert('Success', 'Task marked as complete!');
      handleCloseSheet();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }, [selectedTask, completeTaskMutation, handleCloseSheet]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;

    handleCloseSheet();

    const taskInfo = {
      id: selectedTask.id,
      type: selectedTask.type,
      title: selectedTask.name || selectedTask.title,
    };

    try {
      await deleteTaskMutation.mutateAsync({
        taskId: taskInfo.id,
        taskType: taskInfo.type,
        taskTitle: taskInfo.title || 'Untitled Task',
      });

      showToast({
        message: `${taskInfo.title} moved to Recycle Bin`,
        onUndo: async () => {
          try {
            await restoreTaskMutation.mutateAsync({
              taskId: taskInfo.id,
              taskType: taskInfo.type,
              taskTitle: taskInfo.title || 'Untitled Task',
            });
          } catch (error) {
            console.error('Error restoring task:', error);
          }
        },
        duration: 5000,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, [
    selectedTask,
    deleteTaskMutation,
    restoreTaskMutation,
    showToast,
    handleCloseSheet,
  ]);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        layoutMeasurement: { height: number };
        contentOffset: { y: number };
        contentSize: { height: number };
      };
    }) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const isAtTop = contentOffset.y <= 0;
      const isAtBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

      if (isAtTop && !scrollLock.current.top) {
        scrollLock.current.top = true;
        handleDateSelect(subDays(selectedDate, 1));
      } else if (!isAtTop) {
        scrollLock.current.top = false;
      }

      if (isAtBottom && !scrollLock.current.bottom) {
        scrollLock.current.bottom = true;
        handleDateSelect(addDays(selectedDate, 1));
      } else if (!isAtBottom) {
        scrollLock.current.bottom = false;
      }
    },
    [selectedDate, handleDateSelect],
  );

  const { tasksWithLockState, isLoading: isLockStateLoading } =
    useCalendarTasksWithLockState(calendarData, user);

  const tasksForSelectedDay = useMemo(() => {
    if (isGuest) return [];

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const tasksOnDay = tasksWithLockState.filter(
      task => format(new Date(task.date), 'yyyy-MM-dd') === dateKey,
    );
    return tasksOnDay;
  }, [selectedDate, tasksWithLockState, isGuest]);

  // Generate marked dates for month view
  const markedDates = useMemo(() => {
    if (viewMode !== 'month' || !calendarData) return {};

    const marked: Record<
      string,
      {
        marked?: boolean;
        dots?: Array<{ color: string }>;
        selected?: boolean;
        selectedColor?: string;
      }
    > = {};
    const allTasks = Object.values(calendarData).flat();

    allTasks.forEach(task => {
      const dateKey = format(new Date(task.date), 'yyyy-MM-dd');
      if (!marked[dateKey]) {
        marked[dateKey] = {
          marked: true,
          dots: [],
        };
      }

      // Add color-coded dots based on task type
      const dotColor =
        task.type === 'lecture'
          ? COLORS.primary
          : task.type === 'assignment'
            ? '#FF9500'
            : '#34C759'; // study_session

      if (marked[dateKey].dots.length < 3) {
        marked[dateKey].dots.push({ color: dotColor });
      }
    });

    // Mark selected date
    const selectedKey = format(selectedDate, 'yyyy-MM-dd');
    if (marked[selectedKey]) {
      marked[selectedKey].selected = true;
      marked[selectedKey].selectedColor = COLORS.primary;
    } else {
      marked[selectedKey] = {
        selected: true,
        selectedColor: COLORS.primary,
      };
    }

    return marked;
  }, [viewMode, calendarData, selectedDate]);

  const handleUpgrade = useCallback(async () => {
    if (!offerings?.current) {
      Alert.alert(
        'Error',
        'Subscription offerings are not available at the moment.',
      );
      return;
    }
    try {
      const oddityPackage = offerings.current.availablePackages.find(
        (pkg: PurchasesPackage) => pkg.identifier === 'oddity_monthly',
      );
      if (!oddityPackage) {
        Alert.alert('Error', 'The Oddity plan is not available.');
        return;
      }
      await purchasePackage(oddityPackage);
      Alert.alert(
        'Success!',
        'You have successfully become an Oddity. Your locked content is now accessible.',
      );
      await queryClient.invalidateQueries({ queryKey: ['calendarData'] });
      await queryClient.invalidateQueries({ queryKey: ['calendarMonthData'] });
    } catch (error: unknown) {
      console.error('Upgrade error:', error);
      const err = error as {
        userCancelled?: boolean;
        message?: string;
        code?: string;
      };
      if (!err?.userCancelled) {
        const errorTitle = getErrorTitle(err);
        const errorMessage = mapErrorCodeToMessage(err);
        Alert.alert(errorTitle, errorMessage);
      }
    }
  }, [offerings, purchasePackage, queryClient]);

  const handleLockedTaskPress = useCallback(
    (task: Task) => {
      const taskTypeName =
        task.type === 'study_session' ? 'study sessions' : `${task.type}s`;

      Alert.alert(
        '🔒 Locked Content',
        `This ${task.type.replace('_', ' ')} is locked. Become an Oddity to access all your ${taskTypeName}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Become an Oddity', onPress: handleUpgrade },
        ],
      );
    },
    [handleUpgrade],
  );

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => {
      const taskTime = format(new Date(item.date), 'h:mm a');
      const isLocked = item.isLocked;
      const isExample =
        'is_example' in item &&
        (item as Task & { is_example?: boolean }).is_example === true;

      return (
        <TouchableOpacity
          style={[styles.taskItem, isLocked && styles.taskItemLocked]}
          onPress={() =>
            isLocked ? handleLockedTaskPress(item) : handleTaskPress(item)
          }
          accessibilityLabel={`${item.name || item.title}, ${item.type}, ${taskTime}`}
          accessibilityHint={
            isLocked
              ? 'This task is locked. Upgrade to access.'
              : 'Opens task details'
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: isLocked }}>
          <View style={styles.taskItemContent}>
            <View
              style={[
                styles.taskTypeBadge,
                { backgroundColor: getTaskColor(item.type) },
              ]}>
              <Text style={styles.taskTypeBadgeText}>
                {item.type === 'study_session' ? 'Study' : item.type}
              </Text>
            </View>
            <View style={styles.taskItemDetails}>
              <View style={styles.taskTitleRow}>
                <Text
                  style={[
                    styles.taskItemTitle,
                    isLocked && styles.taskItemTitleLocked,
                  ]}
                  numberOfLines={2}>
                  {item.name || item.title}
                </Text>
                {isExample && (
                  <View style={styles.exampleBadgeSmall}>
                    <Text style={styles.exampleBadgeText}>EXAMPLE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.taskItemTime}>{taskTime}</Text>
              {item.courses && (
                <Text style={styles.taskItemCourse} numberOfLines={1}>
                  {item.courses.courseName}
                </Text>
              )}
            </View>
            {isLocked && (
              <Ionicons name="lock-closed" size={20} color={COLORS.gray} />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [handleTaskPress, handleLockedTaskPress],
  );

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

  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="calendar-outline" size={64} color={COLORS.gray} />
        <Text style={styles.guestText}>Sign in to view your calendar</Text>
        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => navigation.navigate('Auth', { mode: 'signin' })}
          accessibilityLabel="Sign in"
          accessibilityHint="Opens the sign in screen"
          accessibilityRole="button">
          <Text style={styles.guestButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <QueryStateWrapper
      isLoading={isLoading}
      isError={isError}
      error={error}
      data={calendarData}
      refetch={refetch}
      isRefetching={isRefetching}
      onRefresh={refetch}
      emptyTitle="No tasks scheduled"
      emptyMessage={`You don't have any tasks scheduled for this ${viewMode === 'month' ? 'month' : 'week'}. Add a lecture, assignment, or study session to get started!`}
      emptyIcon="calendar-outline">
      <View style={styles.container}>
        {/* View Switcher */}
        <View style={styles.viewSwitcher}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'month' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('month')}
            accessibilityLabel="Month view"
            accessibilityHint="Switches calendar to month view"
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'month' }}>
            <Ionicons
              name="calendar"
              size={18}
              color={viewMode === 'month' ? COLORS.primary : COLORS.gray}
            />
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'month' && styles.viewButtonTextActive,
              ]}>
              Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'week' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('week')}
            accessibilityLabel="Week view"
            accessibilityHint="Switches calendar to week view"
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'week' }}>
            <Ionicons
              name="grid"
              size={18}
              color={viewMode === 'week' ? COLORS.primary : COLORS.gray}
            />
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'week' && styles.viewButtonTextActive,
              ]}>
              Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'agenda' && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode('agenda')}
            accessibilityLabel="Agenda view"
            accessibilityHint="Switches calendar to agenda list view"
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'agenda' }}>
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'agenda' ? COLORS.primary : COLORS.gray}
            />
            <Text
              style={[
                styles.viewButtonText,
                viewMode === 'agenda' && styles.viewButtonTextActive,
              ]}>
              Agenda
            </Text>
          </TouchableOpacity>
        </View>

        {/* Month View */}
        {viewMode === 'month' && (
          <View style={styles.monthViewContainer}>
            <Calendar
              current={selectedDate.toISOString()}
              onDayPress={handleMonthDayPress}
              onVisibleMonthsChange={handleMonthChange}
              markedDates={markedDates}
              markingType="multi-dot"
              theme={{
                backgroundColor: COLORS.background,
                calendarBackground: COLORS.background,
                textSectionTitleColor: COLORS.gray,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.background,
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.text,
                textDisabledColor: COLORS.lightGray,
                monthTextColor: COLORS.text,
                textMonthFontWeight: 'bold',
                textDayFontSize: FONT_SIZES.md,
                textMonthFontSize: FONT_SIZES.lg,
                textDayHeaderFontSize: FONT_SIZES.sm,
              }}
            />

            {/* Task List for Selected Date */}
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateTitle}>
                {format(selectedDate, 'EEEE, MMMM d')}
              </Text>
              {tasksForSelectedDay.length === 0 ? (
                <View style={styles.noTasksContainer}>
                  <Text style={styles.noTasksText}>No tasks for this day</Text>
                </View>
              ) : (
                <FlatList
                  data={tasksForSelectedDay}
                  renderItem={renderTaskItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.taskList}
                  showsVerticalScrollIndicator={false}
                  // Performance optimizations
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  updateCellsBatchingPeriod={50}
                  initialNumToRender={10}
                />
              )}
            </View>
          </View>
        )}

        {/* Week Grid View */}
        {viewMode === 'week' && (
          <WeekGridView
            tasks={weekTasks}
            selectedDate={selectedDate}
            onTaskPress={handleTaskPress}
            onLockedTaskPress={handleLockedTaskPress}
          />
        )}

        {/* Agenda View */}
        {viewMode === 'agenda' && (
          <>
            <WeekStrip
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />

            <Timeline
              tasks={tasksForSelectedDay}
              onTaskPress={handleTaskPress}
              onLockedTaskPress={handleLockedTaskPress}
              onScroll={handleScroll}
            />
          </>
        )}

        <TaskDetailSheet
          task={selectedTask}
          isVisible={!!selectedTask}
          onClose={handleCloseSheet}
          onEdit={handleEditTask}
          onComplete={handleCompleteTask}
          onDelete={handleDeleteTask}
        />
      </View>
    </QueryStateWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  viewSwitcher: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    gap: SPACING.xs,
  },
  viewButtonActive: {
    backgroundColor: '#F0F5FF',
  },
  viewButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.gray,
  },
  viewButtonTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
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
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  taskList: {
    paddingBottom: SPACING.lg,
  },
  taskItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskItemLocked: {
    opacity: 0.6,
  },
  taskItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  taskTypeBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskTypeBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
    textTransform: 'capitalize',
  },
  taskItemDetails: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  taskItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    flex: 1,
  },
  taskItemTitleLocked: {
    color: COLORS.gray,
  },
  exampleBadgeSmall: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  exampleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#007AFF',
  },
  taskItemTime: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginBottom: 2,
  },
  taskItemCourse: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
  },
  noTasksContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  noTasksText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  guestText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  guestButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  guestButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.background,
  },
});

export default CalendarScreen;
