import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { getDraftCount } from '@/utils/draftStorage';
import { COLORS } from '@/constants/theme';

import FloatingActionButton from '@/shared/components/FloatingActionButton';

type HomeScreenFABNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenFABProps {
  onStateChange: (state: { isOpen: boolean }) => void;
}

export const HomeScreenFAB: React.FC<HomeScreenFABProps> = ({ onStateChange }) => {
  const navigation = useNavigation<HomeScreenFABNavigationProp>();
  const { session } = useAuth();
  const isGuest = !session;
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
    // Navigate to quick add modal
    navigation.navigate('QuickAddModal' as any);
  };

  const fabActions = [
    {
      icon: 'book-outline' as any,
      label: 'Add Course',
      onPress: () => navigation.navigate('AddCourseFlow' as any),
      backgroundColor: COLORS.primary,
    },
    {
      icon: 'calendar-outline' as any,
      label: 'Add Assignment',
      onPress: () => navigation.navigate('AddAssignmentFlow' as any),
      backgroundColor: COLORS.secondary,
    },
    {
      icon: 'time-outline' as any,
      label: 'Add Study Session',
      onPress: () => navigation.navigate('AddStudySessionFlow' as any),
      backgroundColor: COLORS.success,
    },
  ];

  return (
    <>
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
