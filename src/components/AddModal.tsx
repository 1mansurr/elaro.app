import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { height } = Dimensions.get('window');

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: 'study' | 'event') => void;
}

export default function AddModal({ visible, onClose, onSelect }: AddModalProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const { theme, isDark } = useTheme();

  useEffect(() => {
    if (visible) {
      animateIn();
    } else {
      resetAnimation();
    }
  }, [visible]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(height);
    scaleAnim.setValue(0.95);
  };

  const handleSelect = (type: 'study' | 'event') => {
    // Add haptic feedback here if available
    onClose();
    onSelect(type);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.modalCard, 
                { 
                  backgroundColor: theme.card,
                  ...SHADOWS.medium,
                  borderTopLeftRadius: BORDER_RADIUS.xl,
                  borderTopRightRadius: BORDER_RADIUS.xl,
                  paddingHorizontal: SPACING.lg,
                  paddingTop: SPACING.md,
                  paddingBottom: Platform.OS === 'ios' ? SPACING.xl * 1.5 : SPACING.xl,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ] 
                }
              ]}
            >
              <View style={[styles.dragHandle, { backgroundColor: theme.inputBorder }]} />

              <Text style={[styles.title, { color: theme.text }]} >What do you want to add?</Text>

              <Pressable 
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: pressed ? theme.input : theme.input },
                ]}
                onPress={() => handleSelect('study')}
                accessibilityRole="button"
                accessibilityLabel="Add study session"
                accessibilityHint="Opens form to create a new study session"
              >
                <View style={[styles.optionIcon, { backgroundColor: theme.accent + '22' }]}> 
                  <Feather name="book-open" size={22} color={theme.accent} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, { color: theme.text }]} >Study Session</Text>
                  <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>Schedule a learning session</Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: pressed ? theme.input : theme.input },
                ]}
                onPress={() => handleSelect('event')}
                accessibilityRole="button"
                accessibilityLabel="Add task or event"
                accessibilityHint="Opens form to create a new task or event"
              >
                <View style={[styles.optionIcon, { backgroundColor: theme.accent + '22' }]}> 
                  <Feather name="calendar" size={22} color={theme.accent} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, { color: theme.text }]} >Task / Event</Text>
                  <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>Create a reminder or event</Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl * 1.5 : SPACING.xl,
    ...SHADOWS.medium,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.gray50,
    minHeight: 72,
    ...SHADOWS.small,
  },
  optionPressed: {
    backgroundColor: COLORS.gray100,
    transform: [{ scale: 0.98 }],
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
}); 