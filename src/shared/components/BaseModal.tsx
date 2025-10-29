import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  ViewStyle,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { ANIMATIONS, SHADOWS } from '@/constants/theme';

interface BaseModalProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropType?: 'blur' | 'opacity' | 'none';
  animationType?: 'slide' | 'fade' | 'none';
  overlayOpacity?: number;
  animationDuration?: number;
  closeOnBackdropPress?: boolean;
  modalStyle?: ViewStyle;
  overlayStyle?: ViewStyle;
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isVisible,
  onClose,
  children,
  backdropType = 'opacity',
  animationType = 'fade',
  overlayOpacity = 0.5,
  animationDuration = 300,
  closeOnBackdropPress = true,
  modalStyle,
  overlayStyle,
  presentationStyle = 'overFullScreen',
}) => {
  const { theme } = useTheme();
  
  // Animation refs for smooth modal interactions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Handle modal visibility changes with smooth animations
  useEffect(() => {
    if (isVisible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animationDuration,
          easing: ANIMATIONS.animatedEasing.smooth,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: animationDuration,
          easing: ANIMATIONS.animatedEasing.smooth,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: animationDuration * 0.8, // Slightly faster exit
          easing: ANIMATIONS.animatedEasing.smooth,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: animationDuration * 0.8,
          easing: ANIMATIONS.animatedEasing.smooth,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, animationDuration, fadeAnim, scaleAnim]);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const renderBackdrop = () => {
    if (backdropType === 'none') {
      return null;
    }

    if (backdropType === 'blur') {
      return (
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <BlurView
            intensity={40}
            tint="dark"
            style={[StyleSheet.absoluteFill, overlayStyle]}
          />
        </TouchableWithoutFeedback>
      );
    }

    // Default: opacity backdrop
    return (
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
            },
            overlayStyle,
          ]}
        />
      </TouchableWithoutFeedback>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none" // We handle animations manually
      onRequestClose={onClose}
      presentationStyle={presentationStyle as any}
    >
      <View style={styles.container}>
        {renderBackdrop()}
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              // Enhanced shadow system
              ...SHADOWS.lg,
            },
            modalStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: 'transparent',
    // Shadow is now handled by enhanced shadow system
  },
});

export default BaseModal;
