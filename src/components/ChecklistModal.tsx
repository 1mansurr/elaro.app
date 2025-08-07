import React, { useRef, useEffect, FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Animated as RNAnimated,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Feather } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  FONT_WEIGHTS,
} from '../constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import ChecklistItem from './ChecklistItem';

export interface ChecklistItem {
  id: number | string;
  title: string;
  icon?: string;
  completed: boolean;
}

interface ChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  items: ChecklistItem[];
  onItemPress: (item: ChecklistItem) => void;
  completedCount: number;
  totalCount: number;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({
  visible,
  onClose,
  items,
  onItemPress,
  completedCount,
  totalCount,
}) => {
  // THEME
  const { theme, isDark } = useTheme();

  // HEADER BOUNCE ANIMATION
  const bounce = useRef(new RNAnimated.Value(0.8)).current;
  useEffect(() => {
    if (visible) {
      bounce.setValue(0.8);
      RNAnimated.spring(bounce, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, bounce]);

  // Confetti trigger
  useEffect(() => {
    if (visible && completedCount === totalCount && totalCount > 0) {
      // setShowConfetti(true); // This line was removed as per the edit hint
      // setTimeout(() => setShowConfetti(false), 3500); // This line was removed as per the edit hint
    }
  }, [completedCount, totalCount, visible]);

  // Fun header emoji
  const headerEmoji =
    completedCount === totalCount && totalCount > 0 ? '🎉' : '✨';
  const titleText =
    completedCount === totalCount && totalCount > 0
      ? 'You did it!'
      : "Let's make studying fun!";
  const subtitleText =
    completedCount === totalCount && totalCount > 0
      ? "All steps complete. You're ready to crush your goals!"
      : 'A few quick steps to set up your study system:';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark ? 'rgba(10,10,10,0.7)' : 'rgba(0,0,0,0.3)',
          },
        ]}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.card,
              shadowColor: isDark ? '#000' : theme.border,
            },
          ]}>
          {/* Confetti */}
          {/* {showConfetti && ( // This line was removed as per the edit hint */}
          {/*   <ConfettiCannon // This line was removed as per the edit hint */}
          {/*     count={80} // This line was removed as per the edit hint */}
          {/*     origin={{ x: 180, y: 0 }} // This line was removed as per the edit hint */}
          {/*     fadeOut // This line was removed as per the edit hint */}
          {/*     explosionSpeed={350} // This line was removed as per the edit hint */}
          {/*     fallSpeed={2500} // This line was removed as per the edit hint */}
          {/*   /> // This line was removed as per the edit hint */}
          {/* )} // This line was removed as per the edit hint */}
          {/* Header */}
          <View style={styles.header}>
            <RNAnimated.Text
              style={[styles.headerEmoji, { transform: [{ scale: bounce }] }]}>
              {headerEmoji}
            </RNAnimated.Text>
            <RNAnimated.Text
              style={[
                styles.title,
                { color: theme.text, transform: [{ scale: bounce }] },
              ]}>
              {titleText}
            </RNAnimated.Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close onboarding">
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitleText}
          </Text>
          {/* Checklist Items */}
          <ScrollView
            style={styles.itemsContainer}
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
            showsVerticalScrollIndicator={false}>
            {items.map((item, idx) => {
              return (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  theme={theme}
                  onItemPress={onItemPress}
                  isDark={isDark}
                  styles={styles}
                />
              );
            })}
          </ScrollView>
          {/* Completion Message */}
          {completedCount === totalCount && totalCount > 0 && (
            <View style={styles.completionMessage}>
              <Text style={[styles.completionText, { color: theme.success }]}>
                389 You&apos;re all set for today. Let&apos;s stay consistent.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    borderRadius: BORDER_RADIUS.xl,
    margin: SPACING.lg,
    maxHeight: '80%',
    width: '90%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerEmoji: {
    fontSize: 36,
    marginRight: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    flex: 1,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  itemsContainer: {
    flexGrow: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  itemTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: SPACING.md,
  },
  itemText: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
  },
  completionMessage: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  completionText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});
