// hooks/useCelebrationAnimation.ts
import { useState, useCallback } from 'react';
import { Animated } from 'react-native';

export const useCelebrationAnimation = () => {
  const [completionAnimation] = useState(new Animated.Value(0));
  const [showCelebration, setShowCelebration] = useState(false);

  const triggerCelebration = useCallback(() => {
    Animated.sequence([
      Animated.timing(completionAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(completionAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  }, [completionAnimation]);

  return {
    completionAnimation,
    showCelebration,
    triggerCelebration,
  };
}; 