import React, { memo, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';
import { RootStackParamList } from '@/types';
import FloatingActionButton from '@/shared/components/FloatingActionButton';
import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';
import { useStableCallback, useExpensiveMemo } from '@/hooks/useMemoization';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenFABProps {
  isFabOpen: boolean;
  draftCount: number;
  onStateChange: (state: { isOpen: boolean }) => void;
  onDoubleTap: () => void;
  onDraftBadgePress: () => void;
}

const HomeScreenFAB: React.FC<HomeScreenFABProps> = memo(
  ({
    isFabOpen,
    draftCount,
    onStateChange,
    onDoubleTap,
    onDraftBadgePress,
  }) => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const fabAnimation = useRef(new Animated.Value(0)).current;

    // Enhanced performance monitoring
    useEffect(() => {
      performanceMonitoringService.startTimer('fab-component-mount');
      return () => {
        performanceMonitoringService.endTimer('fab-component-mount');
      };
    }, []);

    // Optimized FAB actions with expensive memoization
    const fabActions = useExpensiveMemo(
      () => [
        {
          icon: 'book-outline' as any,
          label: 'Add Study Session',
          onPress: () => {
            mixpanelService.track(AnalyticsEvents.STUDY_SESSION_CREATED, {
              task_type: 'study_session',
              source: 'home_screen_fab',
              creation_method: 'manual',
              timestamp: new Date().toISOString(),
            });
            navigation.navigate('AddStudySessionFlow');
          },
        },
        {
          icon: 'document-text-outline' as any,
          label: 'Add Assignment',
          onPress: () => {
            mixpanelService.track(AnalyticsEvents.ASSIGNMENT_CREATED, {
              task_type: 'assignment',
              source: 'home_screen_fab',
              creation_method: 'manual',
              timestamp: new Date().toISOString(),
            });
            navigation.navigate('AddAssignmentFlow');
          },
        },
        {
          icon: 'school-outline' as any,
          label: 'Add Lecture',
          onPress: () => {
            mixpanelService.track(AnalyticsEvents.LECTURE_CREATED, {
              task_type: 'lecture',
              source: 'home_screen_fab',
              creation_method: 'manual',
              timestamp: new Date().toISOString(),
            });
            navigation.navigate('AddLectureFlow');
          },
        },
      ],
      [navigation],
    );

    const backdropOpacity = fabAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const handleFabStateChange = useCallback(
      ({ isOpen }: { isOpen: boolean }) => {
        performanceMonitoringService.startTimer('fab-state-change');

        onStateChange({ isOpen });
        Animated.spring(fabAnimation, {
          toValue: isOpen ? 1 : 0,
          friction: 7,
          useNativeDriver: false,
        }).start(() => {
          performanceMonitoringService.endTimer('fab-state-change');
        });
      },
      [onStateChange, fabAnimation],
    );

    return (
      <>
        {isFabOpen && (
          <TouchableWithoutFeedback
            onPress={() => handleFabStateChange({ isOpen: false })}>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropOpacity }]}>
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
          onDoubleTap={onDoubleTap}
          draftCount={draftCount}
          onDraftBadgePress={onDraftBadgePress}
          isOpen={isFabOpen}
        />
      </>
    );
  },
);

HomeScreenFAB.displayName = 'HomeScreenFAB';

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
});

export default HomeScreenFAB;
