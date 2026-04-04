import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { LibraryStackParamList } from '@/types';
import { useQuizDetail } from '../hooks/useQuizDetail';
import AttemptHistoryRow from '../components/AttemptHistoryRow';

type Props = StackScreenProps<LibraryStackParamList, 'QuizDetail'>;

// ─── Stat tile ───────────────────────────────────────────────────────────────

const StatTile: React.FC<{ label: string; value: string; sub?: string }> = ({
  label,
  value,
  sub,
}) => (
  <View style={tileStyles.tile}>
    <Text style={tileStyles.label}>{label}</Text>
    <Text style={tileStyles.value}>{value}</Text>
    {sub ? <Text style={tileStyles.sub}>{sub}</Text> : null}
  </View>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

const QuizDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { quizId } = route.params;
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuizDetail(quizId);

  if (isLoading || !data?.quiz) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const { quiz, stats, attempts, wrongIds } = data;
  const canRetake = attempts.length > 0 && wrongIds.length > 0;

  const handleStartQuiz = () => {
    navigation.navigate('QuizTaking', { quizId, mode: 'full' });
  };

  const handleRetake = () => {
    navigation.navigate('QuizTaking', {
      quizId,
      mode: 'retake',
      wrongQuestionIds: wrongIds,
    });
  };

  return (
    <View style={styles.container}>
      {/* Colored header */}
      <View
        style={[
          styles.header,
          { backgroundColor: quiz.color, paddingTop: insets.top + SPACING.sm },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.quizName} numberOfLines={2}>
            {quiz.name}
          </Text>
          {quiz.subject ? (
            <Text style={styles.subject} numberOfLines={1}>
              {quiz.subject}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Stat tiles */}
        <View style={styles.tilesGrid}>
          <StatTile label="Questions" value={String(quiz.total_questions)} />
          <StatTile label="Attempts" value={String(stats.total_attempts)} />
          <StatTile
            label="Best Score"
            value={
              stats.total_attempts > 0
                ? `${stats.best_score}/${stats.best_total}`
                : '—'
            }
            sub={
              stats.total_attempts > 0
                ? `${Math.round(stats.best_percentage)}%`
                : undefined
            }
          />
          <StatTile
            label="Average"
            value={
              stats.total_attempts > 0
                ? `${Math.round(stats.avg_percentage)}%`
                : '—'
            }
          />
        </View>

        {/* Attempt History */}
        <Text style={styles.sectionTitle}>Attempt History</Text>
        {attempts.length === 0 ? (
          <Text style={styles.emptyText}>
            No attempts yet. Start your first quiz!
          </Text>
        ) : (
          attempts.map(attempt => (
            <AttemptHistoryRow key={attempt.id} attempt={attempt} />
          ))
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + SPACING.md },
        ]}>
        {canRetake && (
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            activeOpacity={0.8}>
            <Text style={styles.retakeButtonText}>Retake Wrong Answers</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartQuiz}
          activeOpacity={0.8}>
          <Text style={styles.startButtonText}>Start Quiz</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
    padding: SPACING.xs,
    marginLeft: -SPACING.xs,
  },
  headerContent: {
    gap: 4,
  },
  quizName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#fff',
    lineHeight: 34,
  },
  subject: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.background,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  retakeButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

const tileStyles = StyleSheet.create({
  tile: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.xs,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  sub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default QuizDetailScreen;
