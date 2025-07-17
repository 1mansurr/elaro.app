import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthScreen } from '../screens/AuthScreen';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  title?: string;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onAuthSuccess,
  title = 'Sign In Required',
  message = 'Please sign in to access this feature.',
}) => {
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const { theme, isDark } = useTheme();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleAuthSuccess = () => {
    setShowAuthScreen(false);
    onClose();
    onAuthSuccess?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}> 
        <Animated.View style={[styles.modal, {
          backgroundColor: theme.card,
          shadowColor: isDark ? '#000' : theme.accent,
          transform: [{ scale: scaleAnim }],
        }]}> 
          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close sign in modal">
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>

          {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

          {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color={theme.accent} />
            </View>
            
          {/* Message */}
            <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
            
          {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <Text style={[styles.benefitsTitle, { color: theme.text }]} >Sign in to unlock:</Text>
            {[
              'Full AI prompts and learning tools',
              'Create and manage study sessions',
              'Track your learning progress',
              'Sync across all your devices',
            ].map((text, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={[styles.benefitText, { color: theme.textSecondary }]}>{text}</Text>
              </View>
            ))}
            </View>

          {/* Sign In Button */}
          <TouchableOpacity style={[styles.signInButton, { backgroundColor: theme.accent, shadowColor: theme.accent }]} onPress={() => setShowAuthScreen(true)} accessibilityRole="button" accessibilityLabel="Sign in or sign up">
              <Text style={[styles.signInButtonText, { color: theme.text === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF' }]}>Sign In / Sign Up</Text>
            </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Maybe later">
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Maybe Later</Text>
            </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Nested Auth Screen */}
      <Modal visible={showAuthScreen} animationType="slide" presentationStyle="pageSheet">
        <AuthScreen onClose={() => setShowAuthScreen(false)} onAuthSuccess={handleAuthSuccess} />
        </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: width * 0.9,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    padding: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: SPACING.lg,
  },
  benefitsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  benefitText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  signInButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  cancelButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
}); 