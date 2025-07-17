import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATIONS,
  GRADIENTS,
} from '../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  showIcon?: boolean;
  hapticFeedback?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onClose,
  showIcon = true,
  hapticFeedback = true,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const getToastConfig = () => {
    const configs = {
      success: {
        backgroundColor: COLORS.success,
        gradient: [COLORS.green500, COLORS.green600] as [string, string],
        icon: 'checkmark-circle',
        iconColor: COLORS.white,
        textColor: COLORS.white,
        hapticType: Haptics.NotificationFeedbackType.Success,
      },
      error: {
        backgroundColor: COLORS.error,
        gradient: [COLORS.red500, COLORS.red600] as [string, string],
        icon: 'close-circle',
        iconColor: COLORS.white,
        textColor: COLORS.white,
        hapticType: Haptics.NotificationFeedbackType.Error,
      },
      warning: {
        backgroundColor: COLORS.warning,
        gradient: [COLORS.orange500, COLORS.orange600] as [string, string],
        icon: 'warning',
        iconColor: COLORS.white,
        textColor: COLORS.white,
        hapticType: Haptics.NotificationFeedbackType.Warning,
      },
      info: {
        backgroundColor: COLORS.info,
        gradient: [COLORS.blue500, COLORS.blue600] as [string, string],
        icon: 'information-circle',
        iconColor: COLORS.white,
        textColor: COLORS.white,
        hapticType: Haptics.NotificationFeedbackType.Success,
      },
    };
    return configs[type];
  };

  const config = getToastConfig();

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      if (hapticFeedback) {
        Haptics.notificationAsync(config.hapticType);
      }

      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          ...ANIMATIONS.spring,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATIONS.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          ...ANIMATIONS.spring,
        }),
      ]).start();

      // Auto dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration]);

  const handleClose = () => {
    onClose?.();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <LinearGradient
        colors={config.gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {showIcon && (
            <Ionicons
              name={config.icon as any}
              size={24}
              color={config.iconColor}
              style={styles.icon}
            />
          )}
          <Text style={[styles.message, { color: config.textColor }]}>
            {message}
          </Text>
          {onClose && (
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close toast"
            >
              <Ionicons name="close" size={20} color={config.textColor} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 1000,
    ...SHADOWS.lg,
  },
  gradient: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    minHeight: 56,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  message: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    lineHeight: 20,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});

// Toast manager for global usage
export class ToastManager {
  private static instance: ToastManager;
  private listeners: Array<(toast: ToastProps) => void> = [];

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  subscribe(listener: (toast: ToastProps) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(toast: ToastProps) {
    this.listeners.forEach(listener => listener(toast));
  }

  show(message: string, type: ToastProps['type'] = 'info', duration?: number) {
    this.notify({
      visible: true,
      message,
      type,
      duration,
    });
  }

  success(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }
}

export const toast = ToastManager.getInstance(); 