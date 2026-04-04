import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';
import { LibraryStackParamList } from '@/types';
import { useDeviceId } from '@/hooks/useDeviceId';
import { PreviewQuestion } from '../services/aiImportService';
import { useSaveQuizFromPreview } from '../hooks/useCreateQuiz';
import PreviewQuestionCard from '../components/PreviewQuestionCard';

type Props = StackScreenProps<LibraryStackParamList, 'QuizPreview'>;

const QuizPreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { parsedQuiz, quizName, color } = route.params;
  const insets = useSafeAreaInsets();
  const deviceId = useDeviceId();
  const { mutate: saveQuiz, isPending } = useSaveQuizFromPreview();

  const [questions, setQuestions] = useState<PreviewQuestion[]>(
    parsedQuiz.questions,
  );
  // Stagger cards in one by one for a progressive feel
  const [visibleCount, setVisibleCount] = useState(0);
  React.useEffect(() => {
    if (visibleCount >= parsedQuiz.questions.length) return;
    const t = setTimeout(() => setVisibleCount(c => c + 1), 60);
    return () => clearTimeout(t);
  }, [visibleCount, parsedQuiz.questions.length]);

  const flaggedCount = questions.filter(q => q.flagged).length;

  const handleChange = (index: number, updated: PreviewQuestion) => {
    setQuestions(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const handleSave = () => {
    if (isPending) return;
    saveQuiz(
      {
        name: quizName,
        color,
        userId: deviceId ?? '',
        quiz: { ...parsedQuiz, questions },
      },
      {
        onSuccess: quizId => {
          // Reset the Library stack to LibraryScreen → QuizDetail
          // so back navigation leads to the list (modal closed, fresh mount)
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                { name: 'LibraryScreen' },
                { name: 'QuizDetail', params: { quizId } },
              ],
            }),
          );
        },
      },
    );
  };

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
        <Text style={styles.headerTitle}>Review Questions</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Flagged banner */}
      {flaggedCount > 0 && (
        <View style={styles.flagBanner}>
          <Ionicons name="warning-outline" size={16} color="#D97706" />
          <Text style={styles.flagBannerText}>
            {questions.length} question{questions.length !== 1 ? 's' : ''}{' '}
            extracted
            {' · '}
            {flaggedCount} flagged for review
          </Text>
        </View>
      )}

      {/* Summary row when no flags */}
      {flaggedCount === 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {questions.length} question{questions.length !== 1 ? 's' : ''}{' '}
            extracted
          </Text>
        </View>
      )}

      {/* Scrollable question list */}
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {questions.slice(0, visibleCount).map((q, i) => (
          <PreviewQuestionCard
            key={q.id}
            question={q}
            index={i}
            onChange={updated => handleChange(i, updated)}
          />
        ))}
      </ScrollView>

      {/* Save button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + SPACING.md },
        ]}>
        <TouchableOpacity
          style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.8}>
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Quiz</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  flagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#FEF3C7',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  flagBannerText: {
    fontSize: FONT_SIZES.sm,
    color: '#92400E',
    flex: 1,
  },
  summaryRow: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  summaryText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.background,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default QuizPreviewScreen;
