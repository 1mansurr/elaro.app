import React, { useRef, useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  BackHandler,
  Text,
  Pressable,
  AccessibilityRole,
} from 'react-native';
// @ts-ignore
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATIONS,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { height: screenHeight } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
  backdropOpacity?: number;
  backdropBlur?: boolean;
  closeOnBackdropPress?: boolean;
  closeOnBackButton?: boolean;
  maxHeight?: number;
  minHeight?: number;
  borderRadius?: keyof typeof BORDER_RADIUS;
  showBackdrop?: boolean;
  animated?: boolean;
  accessibilityRole?: AccessibilityRole;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  animationType = 'slide',
  presentationStyle = 'pageSheet',
  backdropOpacity = 0.4,
  backdropBlur = true,
  closeOnBackdropPress = true,
  closeOnBackButton = true,
  maxHeight = screenHeight * 0.8,
  minHeight = screenHeight * 0.3,
  borderRadius = 'xl',
  showBackdrop = true,
  animated = true,
  accessibilityRole = 'dialog',
}) => {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATIONS.duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
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
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (closeOnBackButton && visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });

      return () => backHandler.remove();
    }
  }, [visible, closeOnBackButton, onClose]);

  const { theme, isDark } = useTheme();

  const backdrop = showBackdrop && (
    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}> 
      {backdropBlur ? (
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(0,0,0,${backdropOpacity})` },
          ]}
        />
      )}
      {closeOnBackdropPress && (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      )}
    </Animated.View>
  );

  const modalAnimatedStyle = {
    transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
  };

  const modalContent = (
    <Animated.View
      style={[
        styles.content,
        {
          backgroundColor: theme.card,
          maxHeight,
          minHeight,
          borderRadius: BORDER_RADIUS[borderRadius],
        },
        modalAnimatedStyle,
      ]}
      accessible
      accessibilityRole={accessibilityRole as any}
    >
      {(title || showCloseButton) && (
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}> 
          {title && (
            <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
              {title}
            </Text>
          )}
          {showCloseButton && (
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: isDark ? theme.input : theme.surface }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle={presentationStyle}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {backdrop}
        {modalContent}
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  content: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
  },
  body: {
    padding: SPACING.lg,
  },
});

