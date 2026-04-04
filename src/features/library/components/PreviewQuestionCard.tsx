import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';
import { PreviewQuestion } from '../services/aiImportService';

type OptionKey = 'A' | 'B' | 'C' | 'D';
const ALL_OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

interface PreviewQuestionCardProps {
  question: PreviewQuestion;
  index: number;
  onChange: (updated: PreviewQuestion) => void;
}

const PreviewQuestionCard: React.FC<PreviewQuestionCardProps> = ({
  question,
  index,
  onChange,
}) => {
  const visibleOptions = ALL_OPTION_KEYS.filter(
    key => key === 'A' || key === 'B' || question.options[key] !== undefined,
  );

  const setField = (field: keyof PreviewQuestion, value: unknown) => {
    onChange({ ...question, [field]: value } as PreviewQuestion);
  };

  const setOption = (key: OptionKey, value: string) => {
    onChange({
      ...question,
      options: { ...question.options, [key]: value },
    });
  };

  return (
    <View style={styles.card}>
      {/* Flag warning */}
      {question.flagged && (
        <View style={styles.flagBanner}>
          <Ionicons name="warning-outline" size={16} color="#D97706" />
          <Text style={styles.flagText}>
            {question.flag_reason ?? 'Flagged for review'}
          </Text>
        </View>
      )}

      {/* Question number + text */}
      <Text style={styles.qNumber}>Q{index + 1}</Text>
      <TextInput
        style={styles.questionInput}
        value={question.question}
        onChangeText={text => setField('question', text)}
        multiline
        textAlignVertical="top"
        placeholder="Question text"
        placeholderTextColor={COLORS.textSecondary}
      />

      {/* Options */}
      <Text style={styles.sectionLabel}>Options</Text>
      {visibleOptions.map(key => (
        <View key={key} style={styles.optionRow}>
          <TouchableOpacity
            style={[
              styles.optionLetter,
              question.correct_option === key && styles.optionLetterSelected,
            ]}
            onPress={() => setField('correct_option', key)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.optionLetterText,
                question.correct_option === key &&
                  styles.optionLetterTextSelected,
              ]}>
              {key}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={styles.optionInput}
            value={question.options[key] ?? ''}
            onChangeText={text => setOption(key, text)}
            placeholder={`Option ${key}`}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
      ))}
      <Text style={styles.optionHint}>
        Tap a letter to set the correct answer
      </Text>

      {/* Explanation */}
      <Text style={styles.sectionLabel}>Explanation</Text>
      <TextInput
        style={styles.explanationInput}
        value={question.explanation}
        onChangeText={text => setField('explanation', text)}
        multiline
        textAlignVertical="top"
        placeholder="Why is this the correct answer?"
        placeholderTextColor={COLORS.textSecondary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  flagBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: '#FEF3C7',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  flagText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#92400E',
    lineHeight: 18,
  },
  qNumber: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionInput: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 72,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  optionLetterSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionLetterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  optionLetterTextSelected: {
    color: '#fff',
  },
  optionInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  optionHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  explanationInput: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 80,
  },
});

export default PreviewQuestionCard;
