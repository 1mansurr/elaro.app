import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const { width, height } = Dimensions.get('window');

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  onClose,
  title = 'Success!',
  subtitle = '',
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0);
    }
  }, [fadeAnim, scaleAnim, visible]);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };
  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.content}>
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              {icon || (
                <Ionicons
                  name="checkmark-circle"
                  size={80}
                  color={COLORS.success}
                />
              )}
            </View>
            {/* Success Message */}
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {/* Continue Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.continueButton}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                accessibilityRole="button"
                accessibilityLabel="Continue"
                activeOpacity={0.8}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  sparkleContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: -50,
  },
  sparkle1: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  sparkle2: {
    position: 'absolute',
    top: 40,
    right: 30,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 60,
    left: 40,
  },
  sparkle4: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  badge: {
    marginBottom: SPACING.xl,
  },
  badgeGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
    opacity: 0.3,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.white,
    marginLeft: SPACING.sm,
    letterSpacing: 1,
  },
  featuresList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
});
