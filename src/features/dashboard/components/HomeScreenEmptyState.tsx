import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface HomeScreenEmptyStateProps {
  onAddActivity: () => void;
}

export const HomeScreenEmptyState: React.FC<HomeScreenEmptyStateProps> = ({ onAddActivity }) => {
  return (
    <View style={styles.container}>
      {/* Illustration using Ionicons */}
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar-outline" size={80} color={COLORS.primary} />
        </View>
        <View style={[styles.decorativeIcon, styles.decorativeIcon1]}>
          <Ionicons name="book-outline" size={32} color="#FF9500" />
        </View>
        <View style={[styles.decorativeIcon, styles.decorativeIcon2]}>
          <Ionicons name="pencil-outline" size={28} color="#34C759" />
        </View>
        <View style={[styles.decorativeIcon, styles.decorativeIcon3]}>
          <Ionicons name="bulb-outline" size={30} color="#FF3B30" />
        </View>
      </View>

      {/* Content */}
      <Text style={styles.title}>Your Schedule Awaits!</Text>
      <Text style={styles.subtitle}>
        Start your academic journey by adding your first lecture, assignment, or study session.
      </Text>

      {/* CTA Button */}
      <Button
        title="Schedule Your First Task"
        onPress={onAddActivity}
        style={styles.ctaButton}
      />

      {/* Additional tip */}
      <View style={styles.tipContainer}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.gray} />
        <Text style={styles.tipText}>
          Tip: You can also swipe right on tasks to mark them complete!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingTop: SPACING.xxl * 2,
  },
  iconContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F0F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E0EBFF',
  },
  decorativeIcon: {
    position: 'absolute',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  decorativeIcon1: {
    top: 20,
    right: 10,
  },
  decorativeIcon2: {
    bottom: 30,
    left: 10,
  },
  decorativeIcon3: {
    top: 80,
    right: -10,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  ctaButton: {
    minWidth: 250,
    marginBottom: SPACING.lg,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  tipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    flex: 1,
    lineHeight: 18,
  },
});

