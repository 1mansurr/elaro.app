import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, useColorScheme, Animated as RNAnimated } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, FONT_WEIGHTS } from '../constants/theme';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

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
  }, [visible]);

  // Confetti trigger
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (visible && completedCount === totalCount && totalCount > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [completedCount, totalCount, visible]);

  // Checklist item animation state
  const itemScales = useRef(items.map(() => useSharedValue(1))).current;
  useEffect(() => {
    // Reset scales if modal closes
    if (!visible) {
      itemScales.forEach(scale => (scale.value = 1));
    }
  }, [visible, itemScales]);

  // Fun header emoji
  const headerEmoji = completedCount === totalCount && totalCount > 0 ? '🎉' : '✨';
  const titleText = completedCount === totalCount && totalCount > 0
    ? "You did it!"
    : "Let's make studying fun!";
  const subtitleText = completedCount === totalCount && totalCount > 0
    ? "All steps complete. You're ready to crush your goals!"
    : "A few quick steps to set up your study system:";

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(10,10,10,0.7)' : 'rgba(0,0,0,0.3)' }]}> 
        <View style={[styles.modal, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : theme.border }]}> 
          {/* Confetti */}
          {showConfetti && (
            <ConfettiCannon count={80} origin={{ x: 180, y: 0 }} fadeOut explosionSpeed={350} fallSpeed={2500} />
          )}
          {/* Header */}
          <View style={styles.header}>
            <RNAnimated.Text
              style={[
                styles.headerEmoji,
                { transform: [{ scale: bounce }] },
              ]}
            >
              {headerEmoji}
            </RNAnimated.Text>
            <RNAnimated.Text
              style={[
                styles.title,
                { color: theme.text, transform: [{ scale: bounce }] },
              ]}
            >
              {titleText}
            </RNAnimated.Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close onboarding">
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitleText}</Text>
          {/* Checklist Items */}
          <ScrollView style={styles.itemsContainer} contentContainerStyle={{ paddingBottom: SPACING.xl }} showsVerticalScrollIndicator={false}>
            {items.map((item, idx) => {
              const scale = itemScales[idx];
              const animatedStyle = useAnimatedStyle(() => ({
                transform: [{ scale: scale.value }],
                opacity: scale.value < 1 ? 0.7 : 1,
              }));
              return (
                <Animated.View key={item.id} style={[styles.item, { backgroundColor: item.completed ? theme.success : theme.card, borderColor: item.completed ? theme.success : theme.border }, animatedStyle]}>
              <TouchableOpacity
                    onPress={() => {
                      // Animate tap
                      scale.value = 0.95;
                      setTimeout(() => {
                        scale.value = withSpring(1, { damping: 5, stiffness: 120 });
                        onItemPress(item);
                      }, 80);
                    }}
                    style={styles.itemTouch}
                accessibilityRole="button"
                    accessibilityLabel={item.title}
                  >
                    <Text style={[styles.itemIcon, { fontSize: 32 }]}>{item.icon}</Text>
                    <Text style={[styles.itemText, { color: item.completed ? theme.background : theme.text }, item.completed && styles.itemTextCompleted]}>{item.title}</Text>
              </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
          {/* Completion Message */}
          {completedCount === totalCount && totalCount > 0 && (
            <View style={styles.completionMessage}>
              <Text style={[styles.completionText, { color: theme.success }]}>🎉 You're all set for today. Let's stay consistent.</Text>
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

