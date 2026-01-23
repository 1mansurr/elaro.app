import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/shared/components';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';

type StudyResultScreenRouteProp = RouteProp<RootStackParamList, 'StudyResult'>;
type StudyResultScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'StudyResult'
>;

/**
 * StudyResultScreen - Placeholder for study session results
 *
 * This screen will display results and completion information after a study session.
 * Currently a placeholder implementation - to be enhanced with actual results data.
 */
const StudyResultScreen: React.FC = () => {
  const route = useRoute<StudyResultScreenRouteProp>();
  const navigation = useNavigation<StudyResultScreenNavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { sessionId } = route.params;

  // Light mode default colors
  const isDark =
    theme.background === '#101922' || theme.background === '#0A0F14';
  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const handleDone = () => {
    navigation.goBack();
    // Optionally navigate to main screen
    navigation.navigate('Main');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top,
        },
      ]}
      testID="study-result-screen">
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
        <Text style={[styles.title, { color: textColor }]}>
          Study Session Complete!
        </Text>
        <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
          Great work on completing your study session.
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: surfaceColor,
              borderColor: borderColor,
            },
          ]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Session Summary
          </Text>
          <Text style={[styles.cardText, { color: textSecondaryColor }]}>
            Session ID: {sessionId}
          </Text>
          <Text style={[styles.cardText, { color: textSecondaryColor }]}>
            This is a placeholder screen. Future enhancements will include:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: textSecondaryColor }]}>
              • Detailed performance metrics
            </Text>
            <Text style={[styles.bullet, { color: textSecondaryColor }]}>
              • Study statistics and progress
            </Text>
            <Text style={[styles.bullet, { color: textSecondaryColor }]}>
              • Recommendations for next session
            </Text>
            <Text style={[styles.bullet, { color: textSecondaryColor }]}>
              • Achievement badges and milestones
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        <PrimaryButton
          title="Done"
          onPress={handleDone}
          style={styles.doneButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.md,
  },
  cardText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  bulletList: {
    marginTop: SPACING.md,
  },
  bullet: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 24,
    marginBottom: 4,
  },
  footer: {
    padding: SPACING.lg,
  },
  doneButton: {
    marginTop: SPACING.sm,
  },
});

export default StudyResultScreen;
