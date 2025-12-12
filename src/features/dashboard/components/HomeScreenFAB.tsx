import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getDraftCount } from '@/utils/draftStorage';
import { COLORS } from '@/constants/theme';
import { useLimitCheck } from '@/hooks/useLimitCheck';
import { useUsageLimitPaywall } from '@/contexts/UsageLimitPaywallContext';

import FloatingActionButton from '@/shared/components/FloatingActionButton';

type HomeScreenFABNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

interface HomeScreenFABProps {
  onStateChange: (state: { isOpen: boolean }) => void;
  onQuickAddPress?: () => void; // Callback for quick add modal (optional)
}

export const HomeScreenFAB: React.FC<HomeScreenFABProps> = ({
  onStateChange,
  onQuickAddPress,
}) => {
  const navigation = useNavigation<HomeScreenFABNavigationProp>();
  const { session } = useAuth();
  const isGuest = !session;
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const { checkCourseLimit, checkActivityLimit } = useLimitCheck();
  const { showUsageLimitPaywall } = useUsageLimitPaywall();

  // Load draft count on mount
  useEffect(() => {
    const loadDraftCount = async () => {
      const count = await getDraftCount();
      setDraftCount(count);
    };

    loadDraftCount();
  }, []);

  // Update backdrop opacity when FAB opens/closes
  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: isFabOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFabOpen, backdropOpacity]);

  const handleFabStateChange = (state: { isOpen: boolean }) => {
    setIsFabOpen(state.isOpen);
    onStateChange(state);
  };

  const handleQuickAdd = () => {
    // Use callback if provided (preferred pattern for modals)
    // Otherwise do nothing (QuickAddModal is controlled by parent component state)
    if (onQuickAddPress) {
      onQuickAddPress();
    }
    // Note: QuickAddModal is not a navigation route - it's a state-controlled component
  };

  const handleAddCourse = async () => {
    const limitCheck = await checkCourseLimit();
    if (!limitCheck.allowed && limitCheck.limitType) {
      showUsageLimitPaywall(
        limitCheck.limitType,
        limitCheck.currentUsage!,
        limitCheck.maxLimit!,
        limitCheck.actionLabel!,
        { route: 'AddCourseFlow', params: undefined },
      );
      return;
    }
    navigation.navigate('AddCourseFlow');
  };

  const handleAddActivity = async (
    flowName: 'AddAssignmentFlow' | 'AddLectureFlow' | 'AddStudySessionFlow',
  ) => {
    const limitCheck = await checkActivityLimit();
    if (!limitCheck.allowed && limitCheck.limitType) {
      showUsageLimitPaywall(
        limitCheck.limitType,
        limitCheck.currentUsage!,
        limitCheck.maxLimit!,
        limitCheck.actionLabel!,
        { route: flowName, params: undefined },
      );
      return;
    }
    navigation.navigate(flowName);
  };

  const fabActions = [
    {
      icon: 'book-outline' as any,
      label: 'Add Course',
      onPress: handleAddCourse,
      backgroundColor: COLORS.primary,
    },
    {
      icon: 'calendar-outline' as any,
      label: 'Add Assignment',
      onPress: () => handleAddActivity('AddAssignmentFlow'),
      backgroundColor: COLORS.secondary,
    },
    {
      icon: 'time-outline' as any,
      label: 'Add Study Session',
      onPress: () => handleAddActivity('AddStudySessionFlow'),
      backgroundColor: COLORS.success,
    },
  ];

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
        onDoubleTap={handleQuickAdd}
        draftCount={draftCount}
        onDraftBadgePress={() => navigation.navigate('Drafts')}
      />
    </>
  );
};

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
