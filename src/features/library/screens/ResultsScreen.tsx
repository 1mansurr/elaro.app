import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';
import { LibraryStackParamList } from '@/types';

type Props = StackScreenProps<LibraryStackParamList, 'Results'>;

function getLabel(percentage: number): string {
  if (percentage >= 90) return 'Excellent!';
  if (percentage >= 70) return 'Good work!';
  if (percentage >= 50) return 'Keep going!';
  return 'More practice needed';
}

const ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { quizId, score, total, percentage } = route.params;
  const insets = useSafeAreaInsets();
  const rounded = Math.round(percentage);
  const label = getLabel(percentage);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.lg },
      ]}>
      <View style={styles.scoreSection}>
        <Text style={styles.scoreLarge}>
          {score} / {total}
        </Text>
        <Text style={styles.percentage}>{rounded}%</Text>
        <Text style={styles.label}>{label}</Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('QuizDetail', { quizId })}
        activeOpacity={0.8}>
        <Text style={styles.backButtonText}>Back to Quiz</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  scoreSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  scoreLarge: {
    fontSize: 64,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    lineHeight: 72,
  },
  percentage: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  label: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default ResultsScreen;
