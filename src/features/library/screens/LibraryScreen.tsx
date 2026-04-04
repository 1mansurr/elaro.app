import React, { useState, useMemo, useRef, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LibraryStackParamList } from '@/types';
import RNModal from 'react-native-modal';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '@/constants/theme';
import { BankWithCount, Quiz } from '@/types';
import { useDeviceId } from '@/hooks/useDeviceId';
import FloatingActionButton from '@/shared/components/FloatingActionButton';
import { useLibrary } from '../hooks/useLibrary';
import CreateBankSheet from '../components/CreateBankSheet';
import CreateQuizModal from '../components/CreateQuizModal';
import { PreviewQuestion } from '../services/aiImportService';

// ─── List item types ──────────────────────────────────────────────────────────

type LibraryItem =
  | { kind: 'bank'; data: BankWithCount }
  | { kind: 'quiz'; data: Quiz };

// ─── Inline card components ───────────────────────────────────────────────────

const BankCardView: React.FC<{ bank: BankWithCount }> = ({ bank }) => (
  <View style={bankStyles.card}>
    <View style={bankStyles.iconWrap}>
      <Ionicons name="folder-outline" size={22} color={COLORS.primary} />
    </View>
    <View style={bankStyles.info}>
      <Text style={bankStyles.name} numberOfLines={1}>
        {bank.name}
      </Text>
      <Text style={bankStyles.count}>
        {bank.quiz_count === 1 ? '1 quiz' : `${bank.quiz_count} quizzes`}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
  </View>
);

const QuizCardView: React.FC<{ quiz: Quiz; onPress: () => void }> = ({
  quiz,
  onPress,
}) => (
  <TouchableOpacity
    style={[quizStyles.card, { backgroundColor: quiz.color }]}
    onPress={onPress}
    activeOpacity={0.85}>
    <View style={quizStyles.info}>
      <Text style={quizStyles.name} numberOfLines={2}>
        {quiz.name}
      </Text>
      {quiz.subject ? (
        <Text style={quizStyles.subject} numberOfLines={1}>
          {quiz.subject}
        </Text>
      ) : null}
    </View>
    <Text style={quizStyles.count}>
      {quiz.total_questions}{' '}
      {quiz.total_questions === 1 ? 'question' : 'questions'}
    </Text>
  </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

type NavProp = StackNavigationProp<LibraryStackParamList, 'LibraryScreen'>;

const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const deviceId = useDeviceId();

  const { data, isLoading } = useLibrary(deviceId);

  const [fabSheetVisible, setFabSheetVisible] = useState(false);
  const [bankSheetVisible, setBankSheetVisible] = useState(false);
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  // Tracks which modal to open once the fab picker finishes its dismiss animation
  const [pendingAction, setPendingAction] = useState<'bank' | 'quiz' | null>(
    null,
  );
  // Pending navigation to QuizPreview after the quiz modal finishes closing
  const [pendingPreview, setPendingPreview] = useState<{
    parsedQuiz: { subject: string; questions: PreviewQuestion[] };
    quizName: string;
    color: string;
  } | null>(null);
  // Set to true when we navigate to QuizPreview so we can re-open the modal on return
  const reopenModalOnFocusRef = useRef(false);

  // Merge banks and quizzes into a single list sorted by created_at DESC
  const sortedItems = useMemo<LibraryItem[]>(() => {
    const bankItems: LibraryItem[] = (data?.banks ?? []).map(b => ({
      kind: 'bank',
      data: b,
    }));
    const quizItems: LibraryItem[] = (data?.quizzes ?? []).map(q => ({
      kind: 'quiz',
      data: q,
    }));
    return [...bankItems, ...quizItems].sort((a, b) =>
      b.data.created_at.localeCompare(a.data.created_at),
    );
  }, [data]);

  const handleFabPress = () => setFabSheetVisible(true);

  const handleCreateBank = () => {
    setPendingAction('bank');
    setFabSheetVisible(false);
  };

  const handleCreateQuiz = () => {
    setPendingAction('quiz');
    setFabSheetVisible(false);
  };

  // Re-open the quiz modal when user navigates back from QuizPreview
  useFocusEffect(
    useCallback(() => {
      if (reopenModalOnFocusRef.current) {
        reopenModalOnFocusRef.current = false;
        setQuizModalVisible(true);
      }
    }, []),
  );

  // Called by RNModal once the fab picker dismiss animation fully completes
  const handleFabSheetHide = () => {
    if (pendingAction === 'bank') {
      setBankSheetVisible(true);
    } else if (pendingAction === 'quiz') {
      setQuizModalVisible(true);
    }
    setPendingAction(null);
  };

  // Called by CreateQuizModal when JSON is validated and ready for preview
  const handleQuizExtracted = (
    parsedQuiz: { subject: string; questions: PreviewQuestion[] },
    quizName: string,
    color: string,
  ) => {
    setPendingPreview({ parsedQuiz, quizName, color });
    setQuizModalVisible(false); // onModalHide fires after animation completes
  };

  // Called by RNModal once the quiz modal's close animation completes
  const handleQuizModalHide = () => {
    if (pendingPreview) {
      reopenModalOnFocusRef.current = true;
      navigation.navigate('QuizPreview', {
        parsedQuiz: pendingPreview.parsedQuiz,
        quizName: pendingPreview.quizName,
        color: pendingPreview.color,
      });
      setPendingPreview(null);
    }
  };

  const isEmpty = !isLoading && sortedItems.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : isEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyStateText}>
            No quizzes yet. Tap + to create your first.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 140 },
          ]}
          showsVerticalScrollIndicator={false}>
          {sortedItems.map(item =>
            item.kind === 'bank' ? (
              <BankCardView key={`bank-${item.data.id}`} bank={item.data} />
            ) : (
              <QuizCardView
                key={`quiz-${item.data.id}`}
                quiz={item.data}
                onPress={() =>
                  navigation.navigate('QuizDetail', { quizId: item.data.id })
                }
              />
            ),
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <FloatingActionButton onPress={handleFabPress} />

      {/* FAB action picker */}
      <RNModal
        isVisible={fabSheetVisible}
        onBackdropPress={() => setFabSheetVisible(false)}
        onModalHide={handleFabSheetHide}
        style={pickerStyles.modal}>
        <View style={pickerStyles.sheet}>
          <View style={pickerStyles.dragHandle} />
          <Text style={pickerStyles.sheetTitle}>Create</Text>
          <TouchableOpacity
            style={pickerStyles.option}
            onPress={handleCreateBank}
            activeOpacity={0.7}>
            <View style={pickerStyles.optionIcon}>
              <Ionicons
                name="folder-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={pickerStyles.optionText}>
              <Text style={pickerStyles.optionLabel}>Create Bank</Text>
              <Text style={pickerStyles.optionSub}>
                Group related quizzes together
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={pickerStyles.option}
            onPress={handleCreateQuiz}
            activeOpacity={0.7}>
            <View style={pickerStyles.optionIcon}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={pickerStyles.optionText}>
              <Text style={pickerStyles.optionLabel}>Create Quiz</Text>
              <Text style={pickerStyles.optionSub}>
                Build a quiz from JSON data
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </RNModal>

      {/* Create Bank sheet */}
      <CreateBankSheet
        isVisible={bankSheetVisible}
        onClose={() => setBankSheetVisible(false)}
        userId={deviceId ?? ''}
      />

      {/* Create Quiz modal */}
      <CreateQuizModal
        isVisible={quizModalVisible}
        onClose={() => setQuizModalVisible(false)}
        userId={deviceId ?? ''}
        onExtracted={handleQuizExtracted}
        onModalHide={handleQuizModalHide}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    gap: SPACING.sm,
  },
});

const bankStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.xs,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.primary}14`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  count: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

const quizStyles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    minHeight: 100,
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#fff',
  },
  subject: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  count: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: SPACING.md,
  },
});

const pickerStyles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    paddingTop: SPACING.sm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.primary}14`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  optionSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default LibraryScreen;
