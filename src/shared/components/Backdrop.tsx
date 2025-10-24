import React from 'react';
import { Animated, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface BackdropProps {
  isVisible: boolean;
  onPress: () => void;
  opacity?: Animated.Value;
}

export const Backdrop: React.FC<BackdropProps> = ({ 
  isVisible, 
  onPress, 
  opacity 
}) => {
  if (!isVisible) return null;

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View style={[styles.backdrop, { opacity: opacity || 1 }]}>
        <BlurView
          intensity={40}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
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

export default Backdrop;
