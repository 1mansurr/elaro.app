import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { Button } from '../../components/Button';
import { useTheme } from '../../contexts/ThemeContext';

interface LearningStyleScreenProps {
  navigation: any;
  route: any;
}

export default function LearningStyleScreen({
  navigation,
  route,
}: LearningStyleScreenProps) {
  const { mode } = route.params || { mode: 'quick' };
  const { theme } = useTheme();

  const handleClose = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleCopyPrompt = (prompt: string, type: string) => {
    // Copy to clipboard functionality
    console.log('Copy prompt:', type, prompt);
    // You can implement actual clipboard functionality here
  };

  const quickPrompt =
    "I want to understand my learning style. Can you ask me a few quick questions to help identify whether I'm more of a visual, auditory, reading/writing, or kinesthetic learner? Please keep it brief and practical.";

  const deepPrompt =
    "I'd like a comprehensive analysis of my learning style. Please guide me through a detailed assessment that covers visual, auditory, reading/writing, and kinesthetic learning preferences. Include questions about my study habits, information processing, and retention methods.";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Discover Your Learning Style
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.introSection,
            { backgroundColor: theme.card, shadowColor: '#000' },
          ]}>
          <Text style={[styles.introTitle, { color: theme.text }]}>
            {mode === 'quick'
              ? 'Quick Learning Style Quiz'
              : 'Deep Learning Style Analysis'}
          </Text>
          <Text
            style={[styles.introDescription, { color: theme.textSecondary }]}>
            {mode === 'quick'
              ? 'Get a fast assessment of your learning preferences with targeted questions.'
              : 'Get a comprehensive analysis of your learning style with detailed insights and personalized recommendations.'}
          </Text>
        </View>

        <View style={styles.promptSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            AI Prompt
          </Text>
          <View
            style={[
              styles.promptCard,
              { backgroundColor: theme.card, shadowColor: '#000' },
            ]}>
            <Text style={[styles.promptText, { color: theme.text }]}>
              {mode === 'quick' ? quickPrompt : deepPrompt}
            </Text>
            <Button
              title="Copy Prompt"
              onPress={() =>
                handleCopyPrompt(
                  mode === 'quick' ? quickPrompt : deepPrompt,
                  mode === 'quick' ? 'Quick Quiz' : 'Deep Dive',
                )
              }
              style={{ ...styles.copyButton, backgroundColor: theme.primary }}
            />
          </View>
        </View>

        <View style={styles.instructionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            How to Use
          </Text>
          <View
            style={[
              styles.instructionCard,
              { backgroundColor: theme.card, shadowColor: '#000' },
            ]}>
            <View style={styles.instructionStep}>
              <View
                style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                <Text style={[styles.stepNumberText, { color: theme.card }]}>
                  1
                </Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.text }]}>
                Copy the prompt above
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View
                style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                <Text style={[styles.stepNumberText, { color: theme.card }]}>
                  2
                </Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.text }]}>
                Open your preferred AI assistant (ChatGPT, Claude, etc.)
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View
                style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                <Text style={[styles.stepNumberText, { color: theme.card }]}>
                  3
                </Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.text }]}>
                Paste the prompt and follow the AI&apos;s guidance
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <View
                style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                <Text style={[styles.stepNumberText, { color: theme.card }]}>
                  4
                </Text>
              </View>
              <Text style={[styles.instructionText, { color: theme.text }]}>
                Apply the insights to your study routine
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tipsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            💡 Tips
          </Text>
          <View
            style={[
              styles.tipsCard,
              { backgroundColor: theme.card, shadowColor: '#000' },
            ]}>
            <Text style={[styles.tipText, { color: theme.text }]}>
              • Be honest with your responses for the most accurate results
              {`\n`}• Consider your natural preferences, not what you think you
              should prefer{`\n`}• The analysis will help you choose study
              methods that work best for you{`\n`}• You can retake the
              assessment anytime as your preferences may evolve
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  introSection: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  introTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  introDescription: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  promptSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  promptCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  promptText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  copyButton: {},
  instructionsSection: {
    marginBottom: SPACING.lg,
  },
  instructionCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
  },
  tipsSection: {
    marginBottom: SPACING.lg,
  },
  tipsCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
});
