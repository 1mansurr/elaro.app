import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import RNModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';
import { PreviewQuestion } from '../services/aiImportService';
import {
  validateQuizJson,
  ParsedQuizQuestion,
} from '../services/jsonValidator';

// Same palette as CreateTypeSheet — quiz colors
const COLOR_PALETTE = [
  '#E05252', // red
  '#E07B52', // orange
  '#E0C352', // yellow
  '#3DBF7A', // green
  '#52B8E0', // sky
  '#5B8DEF', // blue
  '#8B5BEF', // purple
  '#E05BAA', // pink
  '#6B7280', // gray
  '#0D9488', // teal
  '#D97706', // amber
  '#059669', // emerald
];

function toPreviewQuestions(
  questions: ParsedQuizQuestion[],
): PreviewQuestion[] {
  return questions.map((q, i) => ({
    id: i + 1,
    question: q.question,
    options: {
      A: q.option_a,
      B: q.option_b,
      ...(q.option_c ? { C: q.option_c } : {}),
      ...(q.option_d ? { D: q.option_d } : {}),
    },
    correct_option: q.correct_option,
    explanation: q.explanation,
    flagged: false,
  }));
}

interface CreateQuizModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string;
  onExtracted: (
    parsedQuiz: { subject: string; questions: PreviewQuestion[] },
    quizName: string,
    color: string,
  ) => void;
  onModalHide?: () => void;
}

const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isVisible,
  onClose,
  userId: _userId,
  onExtracted,
  onModalHide,
}) => {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[5]); // blue default
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canCreate = name.trim().length > 0 && jsonText.trim().length > 0;

  const resetForm = () => {
    setName('');
    setColor(COLOR_PALETTE[5]);
    setJsonText('');
    setError(null);
  };

  // Reset form whenever the modal becomes visible
  useEffect(() => {
    if (isVisible) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = () => {
    if (!canCreate) return;
    setError(null);
    const result = validateQuizJson(jsonText);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    onExtracted(
      {
        subject: result.data.subject,
        questions: toPreviewQuestions(result.data.questions),
      },
      name.trim(),
      color,
    );
  };

  return (
    <RNModal
      isVisible={isVisible}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackdropPress={handleClose}
      onModalHide={onModalHide}
      avoidKeyboard>
      <View style={[styles.container, { marginTop: insets.top + 24 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>New Quiz</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Quiz name */}
          <Text style={styles.label}>Quiz name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chapter 4 Review"
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
          />

          {/* Color picker */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_PALETTE.map(hex => (
              <TouchableOpacity
                key={hex}
                onPress={() => setColor(hex)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: hex },
                  color === hex && styles.colorSwatchSelected,
                ]}
                activeOpacity={0.8}>
                {color === hex && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* JSON input */}
          <Text style={styles.label}>Quiz JSON</Text>
          <TextInput
            style={styles.jsonInput}
            placeholder={
              '{\n  "quiz": {\n    "subject": "...",\n    "questions": [...]\n  }\n}'
            }
            placeholderTextColor={COLORS.textSecondary}
            value={jsonText}
            onChangeText={text => {
              setJsonText(text);
              if (error) setError(null);
            }}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            textAlignVertical="top"
          />

          {/* Validation error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Create button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              !canCreate && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!canCreate}
            activeOpacity={0.8}>
            <Text style={styles.createButtonText}>Create Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  header: {
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  jsonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    minHeight: 160,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error ?? '#E05252',
    marginTop: SPACING.sm,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default CreateQuizModal;
