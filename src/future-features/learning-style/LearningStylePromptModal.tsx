import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../constants/theme';

interface LearningStylePromptModalProps {
  visible: boolean;
  onClose: () => void;
  prompt: string;
  isGuest: boolean;
  title: string;
}

export const LearningStylePromptModal: React.FC<
  LearningStylePromptModalProps
> = ({ visible, onClose, prompt, isGuest, title }) => {
  const { height } = Dimensions.get('window');
  const truncatedPrompt =
    prompt.slice(0, 400) + (prompt.length > 400 ? '...' : '');
  const canCopy = !isGuest;

  const handleCopy = () => {
    if (canCopy) {
      Clipboard.setStringAsync(prompt);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { maxHeight: height * 0.7 }]}>
          {' '}
          {/* Reduced modal height */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeIcon}
            accessibilityLabel="Close modal">
            <Feather name="x" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={true}>
            <Text style={styles.heading}>{title}</Text>
            <Text style={styles.instructions}>How to Use This Prompt</Text>
            <Text style={styles.body}>
              1. Copy the prompt below
              {isGuest ? ' (sign in for full access)' : ''}
              {'\n'}2. Replace [Enter your field] with your specific field
              {'\n'}3. Paste into ChatGPT, Claude, or any AI chatbot
              {'\n'}4. Answer the questions as they appear
              {'\n'}5. Get instant personalized results
            </Text>
            <Text style={styles.proTips}>💡 Pro Tips:</Text>
            <Text style={styles.body}>
              • Be specific about your field for better questions
              {'\n'}• Answer honestly for accurate results
              {'\n'}• Save your results for future reference
              {'\n'}• Try both prompts to compare insights
            </Text>
            <View style={styles.promptCard}>
              <Text selectable style={styles.promptText}>
                {isGuest ? truncatedPrompt : prompt}
              </Text>
              <TouchableOpacity
                style={[
                  styles.copyButton,
                  !canCopy && styles.copyButtonDisabled,
                ]}
                onPress={handleCopy}
                disabled={!canCopy}
                accessibilityLabel={
                  canCopy
                    ? 'Copy prompt to clipboard'
                    : 'Sign in to copy prompt'
                }>
                <Feather
                  name={canCopy ? 'copy' : 'lock'}
                  size={18}
                  color={canCopy ? COLORS.primary : COLORS.gray400}
                />
                <Text
                  style={[
                    styles.copyButtonText,
                    !canCopy && styles.copyButtonTextDisabled,
                  ]}>
                  {canCopy ? 'Copy Prompt' : 'Sign in to Copy'}
                </Text>
              </TouchableOpacity>
              {isGuest && (
                <View style={styles.lockedMessageBox}>
                  <Text style={styles.lockedMessage}>
                    ✋ You’re viewing a limited version of this prompt.{'\n\n'}
                    To access the full prompt and enable the Copy feature,
                    please sign in or create an account.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  container: {
    width: '100%',
    borderRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  closeIcon: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    padding: 8,
  },
  content: {
    alignItems: 'flex-start',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  heading: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: SPACING.sm,
    color: COLORS.primary,
  },
  instructions: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  proTips: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.blue,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  body: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  promptCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    width: '100%',
  },
  promptText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  copyButtonDisabled: {
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray100,
  },
  copyButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: FONT_SIZES.md,
  },
  copyButtonTextDisabled: {
    color: COLORS.gray400,
  },
  lockedMessageBox: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.yellow50,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  lockedMessage: {
    color: COLORS.orange600,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});

export default LearningStylePromptModal;
