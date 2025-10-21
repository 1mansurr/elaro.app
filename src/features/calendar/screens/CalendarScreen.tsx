import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useCalendarData } from '@/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Task, RootStackParamList } from '@/types';
import { WeekStrip, Timeline } from '../components';
import TaskDetailSheet from '@/shared/components/TaskDetailSheet';
import { QueryStateWrapper } from '@/shared/components';
import { supabase } from '@/services/supabase';
import { startOfWeek, isSameDay, format, addDays, subDays } from 'date-fns';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { useRevenueCat } from '@/hooks/useRevenueCat';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const CalendarScreen = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  const isGuest = !session;

  const { offerings, purchasePackage } = useRevenueCat();

  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: calendarData, isLoading, isError, error, refetch, isRefetching } = useCalendarData(currentDate);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const scrollLock = useRef({ top: false, bottom: false });

  const handleDateSelect = useCallback((newDate: Date) => {
    if (isGuest) return;
    
    const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
    if (!isSameDay(newWeekStart, currentWeekStart)) {
      setCurrentWeekStart(newWeekStart);
      setCurrentDate(newWeekStart);
    }
    setSelectedDate(newDate);
  }, [isGuest, currentWeekStart]);

  const handleTaskPress = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;
    
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
    
    handleCloseSheet();
    (navigation as any).navigate(modalName, { taskToEdit: selectedTask });
  }, [selectedTask, handleCloseSheet, navigation]);

  const handleCompleteTask = useCallback(async () => {
    // Implementation omitted for brevity
  }, []);

  const handleDeleteTask = useCallback(async () => {
    // Implementation omitted for brevity
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtTop = contentOffset.y <= 0;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

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
  }, [selectedDate, handleDateSelect]);

  const tasksWithLockState = useMemo(() => {
    if (!calendarData || !user || user.subscription_tier === 'oddity') {
      return Object.values(calendarData || {}).flat().map(task => ({ ...task, isLocked: false }));
    }

    const allTasks = Object.values(calendarData).flat();
    
    const limits = {
      assignments: 15,
      lectures: 15,
      study_sessions: 15,
    };

    const tasksByType = {
      assignment: allTasks.filter(t => t.type === 'assignment').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      lecture: allTasks.filter(t => t.type === 'lecture').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      study_session: allTasks.filter(t => t.type === 'study_session').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };

    return allTasks.map(task => {
      const taskType = task.type as 'assignment' | 'lecture' | 'study_session';
      const taskIndex = tasksByType[taskType].findIndex(t => t.id === task.id);
      const limit = limits[taskType] || Infinity;
      return {
        ...task,
        isLocked: taskIndex >= limit,
      };
    });
  }, [calendarData, user]);

  const tasksForSelectedDay = useMemo(() => {
    if (isGuest) return [];
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const tasksOnDay = tasksWithLockState.filter(task => format(new Date(task.date), 'yyyy-MM-dd') === dateKey);
    return tasksOnDay;
  }, [selectedDate, tasksWithLockState, isGuest]);

  const handleUpgrade = useCallback(async () => {
    if (!offerings?.current) {
      Alert.alert('Error', 'Subscription offerings are not available at the moment.');
      return;
    }
    try {
      const oddityPackage = offerings.current.availablePackages.find(pkg => pkg.identifier === 'oddity_monthly');
      if (!oddityPackage) {
        Alert.alert('Error', 'The Oddity plan is not available.');
        return;
      }
      await purchasePackage(oddityPackage);
      Alert.alert('Success!', 'You have successfully become an Oddity. Your locked content is now accessible.');
      await queryClient.invalidateQueries({ queryKey: ['calendarData'] });
    } catch (error) {
      console.error('Upgrade error:', error);
      if (!error.userCancelled) {
        Alert.alert('Error', 'Failed to complete the process. Please try again.');
      }
    }
  }, [offerings, purchasePackage, queryClient]);

  const handleLockedTaskPress = useCallback((task: Task) => {
    const taskTypeName = task.type === 'study_session' ? 'study sessions' : `${task.type}s`;
    
    Alert.alert(
      '🔒 Locked Content',
      `This ${task.type.replace('_', ' ')} is locked. Become an Oddity to access all your ${taskTypeName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Become an Oddity', onPress: handleUpgrade }
      ]
    );
  }, [handleUpgrade]);

  if (isGuest) {
    // Guest view implementation
    return <View><Text>Guest View</Text></View>;
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
      emptyMessage="You don't have any tasks scheduled for this week. Add a lecture, assignment, or study session to get started!"
      emptyIcon="calendar-outline"
    >
      <View style={styles.container}>
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
});

export default CalendarScreen;
