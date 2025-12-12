import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UpgradeSuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  onContinue?: () => void;
}

export const UpgradeSuccessModal: React.FC<UpgradeSuccessModalProps> = ({
  isVisible,
  onClose,
  onContinue,
}) => {
  const { theme } = useTheme();

  // Auto-close after 3 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        if (onContinue) {
          onContinue();
        }
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, onContinue]);

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      <View style={styles.container}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
            },
          ]}>
          {/* Success Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: COLORS.success + '20' },
            ]}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            You're now an Oddity!
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            You can now add 10 courses and 70 activities/month
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});

