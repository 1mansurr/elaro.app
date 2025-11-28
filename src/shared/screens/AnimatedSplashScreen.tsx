// FILE: src/screens/AnimatedSplashScreen.tsx
// Create this new file.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/constants/theme';

interface AnimatedSplashScreenProps {
  onAnimationFinish: () => void;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationFinish,
}) => {
  // 1. Set up the animated value - start at 0.7 opacity for immediate visibility with smooth fade-in
  const fadeAnim = useRef(new Animated.Value(0.7)).current;

  // 2. Define the animation sequence
  useEffect(() => {
    const animation = Animated.timing(fadeAnim, {
      toValue: 1, // Animate to full opacity
      duration: 1000, // Slightly faster since we're starting from visible state
      useNativeDriver: true, // Use native driver for better performance
    });

    animation.start(() => {
      // Call the callback function once the animation is complete
      if (onAnimationFinish) {
        onAnimationFinish();
      }
    });

    // Cleanup: stop animation if component unmounts
    return () => {
      animation.stop();
    };
  }, [fadeAnim, onAnimationFinish]);

  // 3. Render the component
  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.wordmark}>ELARO</Text>
      </Animated.View>
    </View>
  );
};

// 4. Define the styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary, // Matches app primary color (#2C5EFF) and native splash screen
  },
  wordmark: {
    fontSize: 64, // Increased for better visibility
    fontWeight: '900', // Extra bold for better visibility
    color: '#FFFFFF', // White text
    letterSpacing: 4, // Increased spacing for better readability
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // Add shadow for better visibility
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default AnimatedSplashScreen;
