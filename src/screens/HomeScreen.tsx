import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, TouchableWithoutFeedback, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import TrialBanner from '../components/TrialBanner';
import { differenceInCalendarDays } from 'date-fns';
import { useData } from '../contexts/DataContext';
import FloatingActionButton from '../components/FloatingActionButton';
import { Button } from '../components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants/theme';
import NextTaskCard from '../components/NextTaskCard';
import TodayOverviewCard from '../components/TodayOverviewCard';
import TaskDetailSheet from './modals/TaskDetailSheet';
import { supabase } from '../services/supabase';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { session, user } = useAuth();
  const { homeData, loading: isDataLoading, fetchInitialData } = useData();
  const isGuest = !session;
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const fabAnimation = useRef(new Animated.Value(0)).current;

  const promptSignUp = () => {
    navigation.navigate('AuthChooser');
  };

  const fabActions = [
    {
      icon: 'book-outline' as any,
      label: 'Add Study Session',
      onPress: () => navigation.navigate('AddStudySessionModal')
    },
    {
      icon: 'document-text-outline' as any,
      label: 'Add Assignment',
      onPress: () => navigation.navigate('AddAssignmentModal')
    },
    {
      icon: 'school-outline' as any,
      label: 'Add Lecture',
      onPress: () => navigation.navigate('AddLectureModal')
    },
  ];

  const backdropOpacity = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1], // Animate opacity to 1 to show the blur view
  });

  const handleFabStateChange = ({ isOpen }) => {
    setIsFabOpen(isOpen);
    Animated.spring(fabAnimation, {
        toValue: isOpen ? 1 : 0,
        friction: 7,
        useNativeDriver: false,
    }).start();
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;
    
    // Determine which modal to navigate to based on task type
    let modalName;
    switch (selectedTask.type) {
      case 'lecture':
        modalName = 'AddLectureModal';
        break;
      case 'assignment':
        modalName = 'AddAssignmentModal';
        break;
      case 'study_session':
        modalName = 'AddStudySessionModal';
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
        await fetchInitialData(); // Refresh all data
        Alert.alert('Success', 'Task marked as complete!');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Could not mark task as complete.');
    }
    handleCloseSheet();
  }, [selectedTask, fetchInitialData, handleCloseSheet]);

  const handleDeleteTask = useCallback(() => {
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
                await fetchInitialData(); // Refresh all data
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
  }, [selectedTask, fetchInitialData, handleCloseSheet]);

  // Trial banner logic
  const getTrialDaysRemaining = () => {
    if (user?.subscription_status !== 'trialing' || !user?.subscription_expires_at) {
      return null;
    }
    const today = new Date();
    const expirationDate = new Date(user.subscription_expires_at);
    return differenceInCalendarDays(expirationDate, today);
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const shouldShowBanner = trialDaysRemaining !== null && trialDaysRemaining <= 3;

  const handleSubscribePress = () => {
    navigation.navigate('AddOddityModal' as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isDataLoading} onRefresh={fetchInitialData} />
        }
        scrollEnabled={!isFabOpen}
      >
        {shouldShowBanner && (
          <TrialBanner
            daysRemaining={trialDaysRemaining as number}
            onPressSubscribe={handleSubscribePress}
          />
        )}
        <Text style={styles.title}>Let's Make Today Count</Text>
        <NextTaskCard 
          task={isGuest ? null : (homeData?.nextUpcomingTask || null)} 
          isGuestMode={isGuest}
          onAddActivity={() => handleFabStateChange({ isOpen: true })}
          onViewDetails={handleViewDetails}
        />
        <TodayOverviewCard
          overview={isGuest ? null : (homeData?.todayOverview || null)}
          weeklyTaskCount={isGuest ? 0 : (homeData?.weeklyTaskCount || 0)}
        />
        <Button
          title="View Full Calendar"
          onPress={() => navigation.navigate('Calendar')}
        />
      </ScrollView>

      {isFabOpen && (
        <TouchableWithoutFeedback onPress={() => handleFabStateChange({ isOpen: false })}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      )}

      <FloatingActionButton 
        actions={fabActions}
        onStateChange={handleFabStateChange}
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
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
});

export default HomeScreen;