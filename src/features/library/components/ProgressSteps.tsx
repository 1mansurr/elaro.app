import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { ImportStep } from '../hooks/useAiImport';

interface ProgressStepsProps {
  currentStep: ImportStep;
  questionCount?: number;
}

const STEPS: Array<{ key: ImportStep; label: string; sub: string }> = [
  { key: 'uploading', label: 'Uploading', sub: 'Sending file to server' },
  { key: 'reading', label: 'Reading', sub: 'Extracting questions from file' },
  { key: 'generating', label: 'Analysing', sub: 'Generating explanations' },
  { key: 'done', label: 'Done', sub: 'Ready to review' },
];

const STEP_KEYS: ImportStep[] = STEPS.map(s => s.key);

const ProgressSteps: React.FC<ProgressStepsProps> = ({
  currentStep,
  questionCount = 0,
}) => {
  const currentIdx = STEP_KEYS.indexOf(currentStep);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Importing…</Text>
      <View style={styles.steps}>
        {STEPS.map((step, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <View key={step.key} style={styles.stepRow}>
              {/* Connector line above (all except first) */}
              {idx > 0 && (
                <View
                  style={[
                    styles.connector,
                    isPast || isCurrent
                      ? styles.connectorActive
                      : styles.connectorInactive,
                  ]}
                />
              )}

              <View style={styles.stepContent}>
                {/* Icon */}
                <View
                  style={[
                    styles.iconWrap,
                    isPast && styles.iconWrapDone,
                    isCurrent && styles.iconWrapActive,
                  ]}>
                  {isPast ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>

                {/* Labels */}
                <View style={styles.labelWrap}>
                  <Text
                    style={[
                      styles.stepLabel,
                      isPast && styles.stepLabelDone,
                      isCurrent && styles.stepLabelActive,
                    ]}>
                    {step.label}
                  </Text>
                  {isCurrent && (
                    <Text style={styles.stepSub}>
                      {step.key === 'generating' && questionCount > 0
                        ? `${questionCount} question${questionCount !== 1 ? 's' : ''} found…`
                        : step.sub}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ICON_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
  },
  steps: {
    width: '100%',
    maxWidth: 320,
  },
  stepRow: {
    alignItems: 'flex-start',
  },
  connector: {
    width: 2,
    height: 16,
    marginLeft: ICON_SIZE / 2 - 1,
    marginVertical: 2,
  },
  connectorActive: {
    backgroundColor: COLORS.primary,
  },
  connectorInactive: {
    backgroundColor: COLORS.lightGray,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrapDone: {
    backgroundColor: '#3DBF7A',
  },
  iconWrapActive: {
    backgroundColor: COLORS.primary,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
    opacity: 0.4,
  },
  labelWrap: {
    flex: 1,
    paddingTop: 6,
  },
  stepLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  stepLabelDone: {
    color: '#3DBF7A',
  },
  stepLabelActive: {
    color: COLORS.textPrimary,
  },
  stepSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default ProgressSteps;
