// FILE: src/screens/AnimatedSplashScreen.tsx
// Create this new file.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface AnimatedSplashScreenProps {
  onAnimationFinish: () => void;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({ onAnimationFinish }) => {
  // 1. Set up the animated value
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial opacity is 0

  // 2. Define the animation sequence
  useEffect(() => {
    const animation = Animated.timing(
      fadeAnim,
      {
        toValue: 1, // Animate to opacity 1
        duration: 1500, // Animation duration in milliseconds
        useNativeDriver: true, // Use native driver for better performance
      }
    );
    
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
    backgroundColor: '#0A2540', // Must match the native splash screen color
  },
  wordmark: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    letterSpacing: 2,
  },
});

export default AnimatedSplashScreen;
