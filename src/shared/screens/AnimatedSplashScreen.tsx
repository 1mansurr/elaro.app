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
  const hasCalledFinishRef = useRef(false);

  // 2. Guarantee onAnimationFinish is called exactly once, even if animation fails
  const callFinishOnce = () => {
    if (!hasCalledFinishRef.current && onAnimationFinish) {
      hasCalledFinishRef.current = true;
      onAnimationFinish();
    }
  };

  // 3. Define the animation sequence with fail-safe guarantees
  useEffect(() => {
    // Hard timeout fallback - guarantees callback fires even if animation fails
    const timeoutId = setTimeout(() => {
      callFinishOnce();
    }, 1500); // 1.5 seconds max (longer than animation duration)

    // Define animation with useNativeDriver: false to avoid device-specific failures
    const animation = Animated.timing(fadeAnim, {
      toValue: 1, // Animate to full opacity
      duration: 1000,
      useNativeDriver: false, // CRITICAL: Disable native driver to prevent device-specific failures
    });

    // Wrap animation start in try/catch to handle any failures
    try {
      animation.start((finished) => {
        // Clear timeout since animation completed
        clearTimeout(timeoutId);
        
        // Call finish callback (idempotent via hasCalledFinishRef)
        if (finished !== false) {
          callFinishOnce();
        } else {
          // Animation was interrupted - still call finish to unblock app
          callFinishOnce();
        }
      });
    } catch (error) {
      // Animation failed to start - clear timeout and immediately unblock
      clearTimeout(timeoutId);
      callFinishOnce();
    }

    // Cleanup: stop animation if component unmounts
    return () => {
      clearTimeout(timeoutId);
      animation.stop();
      // Ensure callback fires on unmount if not already called
      callFinishOnce();
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
