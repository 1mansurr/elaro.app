// hooks/useBouncePress.ts
import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export const useBouncePress = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(
    (callback: () => void) => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      callback();
    },
    [scaleAnim],
  );

  return {
    scaleAnim,
    handlePress,
  };
};
