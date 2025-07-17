import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, FONT_WEIGHTS, SHADOWS } from '../constants/theme';
import { Button } from '../components/Button';
import { useTheme } from '../contexts/ThemeContext';

interface LearningStyleScreenProps {
  navigation: any;
  route: any;
}

export default function LearningStyleScreen({
  navigation,
  route,
}: LearningStyleScreenProps) {
  const { theme } = useTheme();
  const { mode } = route.params || { mode: 'quick' };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await Clipboard.setStringAsync(prompt);
      Alert.alert('Copied!', 'Prompt copied to clipboard.');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy prompt.');
    }
  };

  const quickPrompt =
    "I want to understand my learning style. Can you ask me a few quick questions to help identify whether I'm more of a visual, auditory, reading/writing, or kinesthetic learner? Keep it brief and practical.";

  const deepPrompt =
    "I'd like a full analysis of my learning style. Please guide me through a detailed assessment covering visual, auditory, reading/writing, and kinesthetic preferences. Include questions about my study habits and retention methods.";

  const prompt = mode === 'quick' ? quickPrompt : deepPrompt;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.lg,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray100,
      ...SHADOWS.sm,
    },
    closeButton: {
      padding: SPACING.sm,
      borderRadius: BORDER_RADIUS.sm,
    },
    closeButtonPressed: {
      backgroundColor: theme.gray100,
    },
    headerTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: theme.text,
    },
    placeholder: {
      width: 24,
    },
    content: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      ...SHADOWS.sm,
    },
    highlightCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    cardIcon: {
      marginBottom: SPACING.sm,
    },
    cardTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    cardDescription: {
      fontSize: FONT_SIZES.md,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
      gap: SPACING.xs,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: theme.text,
      marginLeft: SPACING.sm,
    },
    promptBox: {
      backgroundColor: theme.gray50,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.md,
    },
    promptText: {
      fontSize: FONT_SIZES.md,
      color: theme.text,
      fontStyle: 'italic',
      lineHeight: 24,
    },
    instructionStep: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    stepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    stepNumberText: {
      color: theme.white,
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.semibold as any,
    },
    instructionText: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      color: theme.text,
      lineHeight: 22,
    },
    tipText: {
      fontSize: FONT_SIZES.md,
      color: theme.text,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={handleClose} 
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close learning style screen"
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Discover Your Learning Style</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <View style={[styles.card, styles.highlightCard]}>
          <Ionicons name="bulb" size={24} color={theme.primary} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>
            {mode === 'quick' ? 'Quick Quiz' : 'Deep Dive Analysis'}
          </Text>
          <Text style={styles.cardDescription}>
            {mode === 'quick'
              ? 'A quick way to assess your learning tendencies with focused questions.'
              : 'A more detailed exploration of how you best understand and retain new information.'}
          </Text>
        </View>

        {/* AI Prompt Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>Use This Prompt</Text>
          </View>
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>{prompt}</Text>
          </View>
          <Button 
            title="Copy Prompt" 
            onPress={() => handleCopyPrompt(prompt)}
            variant="primary"
            accessibilityLabel="Copy prompt to clipboard"
          />
        </View>

        {/* How to Use Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color={theme.success} />
            <Text style={styles.sectionTitle}>How to Use</Text>
          </View>
          {[
            'Copy the prompt above',
            'Open ChatGPT, Claude, or another AI tool',
            'Paste the prompt and respond honestly',
            'Apply the insights to your study routine',
          ].map((step, index) => (
            <View key={index} style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={20} color={theme.warning} />
            <Text style={styles.sectionTitle}>💡 Tips</Text>
          </View>
          <Text style={styles.tipText}>
            • Be honest — this isn't a test.{'\n'}
            • Answer based on *you*, not what sounds ideal.{'\n'}
            • Use the results to customize your study plan.{'\n'}
            • You can always revisit this later.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
} 