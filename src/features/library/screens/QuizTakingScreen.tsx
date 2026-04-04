import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';
import { LibraryStackParamList, Question } from '@/types';
import { useDeviceId } from '@/hooks/useDeviceId';
import { getQuestionsByQuiz } from '../services/libraryDb';
import { useQuizSession } from '../hooks/useQuizSession';
import ExplainSheet from '../components/ExplainSheet';

type Props = StackScreenProps<LibraryStackParamList, 'QuizTaking'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type OptionItem = { key: string; label: string; text: string };

function getOptions(question: Question): OptionItem[] {
  if (question.question_type === 'true_false') {
    return [
      { key: 'A', label: 'True', text: question.option_a },
      { key: 'B', label: 'False', text: question.option_b },
    ];
  }
  const opts: OptionItem[] = [
    { key: 'A', label: 'A', text: question.option_a },
    { key: 'B', label: 'B', text: question.option_b },
  ];
  if (question.option_c)
    opts.push({ key: 'C', label: 'C', text: question.option_c });
  if (question.option_d)
    opts.push({ key: 'D', label: 'D', text: question.option_d });
  return opts;
}

function getOptionColors(
  isAnswered: boolean,
  isSelected: boolean,
  isCorrectOption: boolean,
): {
  bg: string;
  border: string;
  textColor: string;
  labelBg: string;
  dim: boolean;
} {
  if (!isAnswered) {
    return {
      bg: COLORS.background,
      border: COLORS.border,
      textColor: COLORS.textPrimary,
      labelBg: `${COLORS.primary}18`,
      dim: false,
    };
  }
  if (isCorrectOption) {
    return {
      bg: '#3DBF7A',
      border: '#3DBF7A',
      textColor: '#fff',
      labelBg: 'rgba(255,255,255,0.25)',
      dim: false,
    };
  }
  if (isSelected) {
    return {
      bg: '#E05252',
      border: '#E05252',
      textColor: '#fff',
      labelBg: 'rgba(255,255,255,0.25)',
      dim: false,
    };
  }
  return {
    bg: COLORS.background,
    border: COLORS.border,
    textColor: COLORS.textPrimary,
    labelBg: `${COLORS.primary}18`,
    dim: true,
  };
}

// ─── Inner session view (has hooks, only mounted after questions load) ─────────

interface SessionProps {
  navigation: Props['navigation'];
  questions: Question[];
  quizId: string;
  isRetake: boolean;
  userId: string;
}

const QuizSessionView: React.FC<SessionProps> = ({
  navigation,
  questions,
  quizId,
  isRetake,
  userId,
}) => {
  const insets = useSafeAreaInsets();
  const session = useQuizSession(questions, userId, isRetake);
  const [explainVisible, setExplainVisible] = useState(false);

  const {
    currentQuestion,
    currentIndex,
    answers,
    isLastQuestion,
    hasStarted,
    isFinishing,
    selectAnswer,
    goToIndex,
    goNext,
    finishSession,
  } = session;

  // Abandonment dialog — intercept back gesture / back button
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!hasStarted || isFinishing) return;
      e.preventDefault();
      Alert.alert(
        'Abandon Quiz?',
        'Are you sure? Your progress will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, hasStarted, isFinishing]);

  const handleFinish = useCallback(async () => {
    if (isFinishing) return;
    const result = await finishSession(quizId);
    navigation.replace('Results', {
      attemptId: result.attemptId,
      quizId,
      score: result.score,
      total: result.total,
      percentage: result.percentage,
    });
  }, [isFinishing, finishSession, quizId, navigation]);

  if (!currentQuestion) return null;

  const currentAnswer = answers[currentQuestion.id];
  const isCurrentAnswered = !!currentAnswer;
  const options = getOptions(currentQuestion);
  const isTrueFalse = currentQuestion.question_type === 'true_false';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.counter}>
          {currentIndex + 1} of {questions.length}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {questions.map((q, i) => {
          const ans = answers[q.id];
          const dotColor = ans
            ? ans.isCorrect
              ? '#3DBF7A'
              : '#E05252'
            : i === currentIndex
              ? COLORS.primary
              : COLORS.lightGray;
          return (
            <TouchableOpacity
              key={q.id}
              onPress={() => goToIndex(i)}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: dotColor },
                  i === currentIndex && styles.dotActive,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Question text */}
        <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

        {/* Option buttons */}
        <View style={styles.optionsContainer}>
          {options.map(opt => {
            const isSelected = currentAnswer?.selectedOption === opt.key;
            const isCorrectOption = currentQuestion.correct_option === opt.key;
            const colors = getOptionColors(
              isCurrentAnswered,
              isSelected,
              isCorrectOption,
            );

            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.option,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    opacity: colors.dim ? 0.4 : 1,
                  },
                  isTrueFalse && styles.optionTrueFalse,
                ]}
                onPress={() => selectAnswer(currentQuestion.id, opt.key)}
                disabled={isCurrentAnswered}
                activeOpacity={0.7}>
                {isTrueFalse ? (
                  <Text
                    style={[styles.trueFalseText, { color: colors.textColor }]}>
                    {opt.label}
                  </Text>
                ) : (
                  <>
                    <View
                      style={[
                        styles.optionBadge,
                        { backgroundColor: colors.labelBg },
                      ]}>
                      <Text
                        style={[
                          styles.optionBadgeText,
                          { color: colors.textColor },
                        ]}>
                        {opt.label}
                      </Text>
                    </View>
                    <Text
                      style={[styles.optionText, { color: colors.textColor }]}
                      numberOfLines={4}>
                      {opt.text}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explain button */}
        {isCurrentAnswered && (
          <TouchableOpacity
            style={styles.explainButton}
            onPress={() => setExplainVisible(true)}
            activeOpacity={0.7}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.explainButtonText}>Explain</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Next / Finish button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + SPACING.md },
        ]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!isCurrentAnswered || isFinishing) && styles.nextButtonDisabled,
          ]}
          onPress={isLastQuestion ? handleFinish : goNext}
          disabled={!isCurrentAnswered || isFinishing}
          activeOpacity={0.8}>
          {isFinishing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? 'Finish' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ExplainSheet
        isVisible={explainVisible}
        explanation={currentQuestion.explanation}
        onClose={() => setExplainVisible(false)}
      />
    </View>
  );
};

// ─── Screen (fetches questions, shows loading) ────────────────────────────────

const QuizTakingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { quizId, mode, wrongQuestionIds } = route.params;
  const deviceId = useDeviceId();

  const { data: allQuestions, isLoading } = useQuery({
    queryKey: ['questions', quizId],
    queryFn: () => getQuestionsByQuiz(quizId),
  });

  const questions = useMemo(() => {
    if (!allQuestions) return [];
    if (mode === 'retake' && wrongQuestionIds?.length) {
      return allQuestions.filter(q => wrongQuestionIds.includes(q.id));
    }
    return allQuestions;
  }, [allQuestions, mode, wrongQuestionIds]);

  if (isLoading || !allQuestions) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <QuizSessionView
      navigation={navigation}
      questions={questions}
      quizId={quizId}
      isRetake={mode === 'retake'}
      userId={deviceId ?? ''}
    />
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  questionText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    lineHeight: 30,
    marginBottom: SPACING.xl,
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  optionTrueFalse: {
    justifyContent: 'center',
    paddingVertical: SPACING.md + 4,
  },
  optionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  optionBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  optionText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  trueFalseText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
  },
  explainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  explainButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.background,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default QuizTakingScreen;
