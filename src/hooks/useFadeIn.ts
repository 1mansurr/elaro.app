// hooks/useFadeIn.ts
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export const useFadeIn = (delay = 0, duration = 600) => {
  const animated = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animated, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [delay, duration]);

  return animated;
}; 