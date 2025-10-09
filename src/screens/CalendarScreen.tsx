import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useCalendarData } from '../hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Task, RootStackParamList } from '../types';
import { WeekStrip, Timeline } from '../components';
import TaskDetailSheet from './modals/TaskDetailSheet';
import { supabase } from '../services/supabase';
import { startOfWeek, isSameDay, format, addDays, subDays } from 'date-fns';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants/theme';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const CalendarScreen = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const isGuest = !session;

  // Use currentDate to drive the React Query
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: calendarData, isLoading, isError, error } = useCalendarData(currentDate);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const scrollLock = useRef({ top: false, bottom: false });

  const handleDateSelect = (newDate: Date) => {
    if (isGuest) return; // Disable date selection for guests
    
    const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
    if (!isSameDay(newWeekStart, currentWeekStart)) {
      setCurrentWeekStart(newWeekStart);
      // Update currentDate to trigger React Query refetch for the new week
      setCurrentDate(newWeekStart);
    }
    setSelectedDate(newDate);
  };

  const handleTaskPress = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;
    
    // Determine which modal to navigate to based on task type
    let modalName: 'AddLectureFlow' | 'AddAssignmentFlow' | 'AddStudySessionFlow';
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
    
    handleCloseSheet(); // Close the sheet first
    navigation.navigate(modalName, { taskToEdit: selectedTask });
  }, [selectedTask, handleCloseSheet, navigation]);

  const handleCompleteTask = useCallback(async () => {
    if (!selectedTask) return;
    
    try {
      // This is a simplified example. We'd call a generic 'update-task' function.
      // For now, we assume the task type and call the specific function.
      const functionName = `update-${selectedTask.type}`;
      const { error } = await supabase.functions.invoke(functionName, {
        body: {
          [`${selectedTask.type}Id`]: selectedTask.id,
          updates: { status: 'completed' }, // Assuming a 'status' field exists
        },
      });

      if (error) {
        Alert.alert('Error', 'Could not mark task as complete.');
      } else {
        // Refresh calendar data using React Query
        await queryClient.invalidateQueries({ queryKey: ['calendarData', currentDate.toDateString()] });
        Alert.alert('Success', 'Task marked as complete!');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Could not mark task as complete.');
    }
    handleCloseSheet();
  }, [selectedTask, queryClient, currentDate, handleCloseSheet]);

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const functionName = `delete-${selectedTask.type}`;
              const { error } = await supabase.functions.invoke(functionName, {
                body: { [`${selectedTask.type}Id`]: selectedTask.id },
              });

              if (error) {
                Alert.alert('Error', 'Could not delete task.');
              } else {
                // Refresh calendar data using React Query
                await queryClient.invalidateQueries({ queryKey: ['calendarData', currentDate.toDateString()] });
                Alert.alert('Success', 'Task deleted successfully!');
              }
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Could not delete task.');
            }
            handleCloseSheet();
          },
        },
      ]
    );
  }, [selectedTask, queryClient, currentDate, handleCloseSheet]);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtTop = contentOffset.y <= 0;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    // Top boundary logic
    if (isAtTop) {
      if (!scrollLock.current.top) {
        scrollLock.current.top = true; // Engage top lock
        const previousDay = subDays(selectedDate, 1);
        handleDateSelect(previousDay);
      }
    } else {
      scrollLock.current.top = false; // Disengage top lock when not at top
    }

    // Bottom boundary logic
    if (isAtBottom) {
      if (!scrollLock.current.bottom) {
        scrollLock.current.bottom = true; // Engage bottom lock
        const nextDay = addDays(selectedDate, 1);
        handleDateSelect(nextDay);
      }
    } else {
      scrollLock.current.bottom = false; // Disengage bottom lock when not at bottom
    }
  }, [selectedDate, handleDateSelect]);

  const tasksForSelectedDay = useMemo(() => {
    if (isGuest || !calendarData) return [];
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const matchingKey = Object.keys(calendarData).find(key => key.startsWith(dateKey));
    return matchingKey ? calendarData[matchingKey] : [];
  }, [selectedDate, calendarData, isGuest]);

  // Guest View
  if (isGuest) {
    return (
      <View style={styles.container}>
        <WeekStrip 
          selectedDate={selectedDate} 
          onDateSelect={() => {}} // Disabled for guests
        />
        <View style={styles.guestTimelineContainer}>
          <Text style={styles.guestText}>
            Your schedule will appear here.
          </Text>
          <Text style={styles.guestSubText}>
            Sign up to add lectures, assignments, and study sessions to your personal calendar.
          </Text>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => navigation.navigate('AuthChooser')}
          >
            <Text style={styles.signUpButtonText}>Sign Up for Free</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Handle loading and error states for authenticated users
  if (isLoading) {
    return (
      <View style={styles.container}>
        <WeekStrip 
          selectedDate={selectedDate} 
          onDateSelect={() => {}} // Disabled while loading
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <WeekStrip 
          selectedDate={selectedDate} 
          onDateSelect={() => {}} // Disabled while error
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load calendar data</Text>
          <Text style={styles.errorSubtext}>
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['calendarData', currentDate.toDateString()] })}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Authenticated View
  return (
    <View style={styles.container}>
      <WeekStrip 
        selectedDate={selectedDate} 
        onDateSelect={handleDateSelect} 
      />
      <Timeline 
        tasks={tasksForSelectedDay} 
        onTaskPress={handleTaskPress} 
        onScroll={handleScroll}
      />
      <TaskDetailSheet
        task={selectedTask}
        isVisible={!!selectedTask}
        onClose={handleCloseSheet}
        onEdit={handleEditTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  guestTimelineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  guestText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  guestSubText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  signUpButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
  },
  signUpButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.bold as any,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
});

export default CalendarScreen;