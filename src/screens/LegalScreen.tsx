import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface LegalScreenProps {
  type: 'privacy' | 'terms';
  onBack: () => void;
}

export const LegalScreen: React.FC<LegalScreenProps> = ({ type, onBack }) => {
  const isPrivacy = type === 'privacy';
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray100,
      backgroundColor: theme.card,
      ...SHADOWS.sm,
    },
    backButton: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: COLORS.text,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingVertical: SPACING.xl,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
    },
    placeholderContainer: {
      width: '100%',
      maxWidth: 500,
      alignItems: 'center',
    },
    icon: {
      marginBottom: SPACING.lg,
    },
    title: {
      fontSize: FONT_SIZES.xl,
      fontWeight: FONT_WEIGHTS.bold as any,
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
    subtitle: {
      fontSize: FONT_SIZES.md,
      color: COLORS.textSecondary,
      marginBottom: SPACING.xl,
    },
    infoBox: {
      backgroundColor: COLORS.gray50,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      marginBottom: SPACING.xl,
      width: '100%',
    },
    infoText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.text,
      lineHeight: 24,
      textAlign: 'center',
    },
    contact: {
      alignItems: 'center',
    },
    contactHeading: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    contactText: {
      fontSize: FONT_SIZES.md,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: SPACING.xs,
      lineHeight: 22,
    },
    contactEmail: {
      fontSize: FONT_SIZES.md,
      color: COLORS.primary,
      fontWeight: FONT_WEIGHTS.medium as any,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </Text>
        <View style={styles.backButton} /> {/* Spacer for centering */}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.placeholderContainer}>
          <Ionicons
            name={
              isPrivacy ? 'shield-checkmark-outline' : 'document-text-outline'
            }
            size={72}
            color={theme.gray300}
            style={styles.icon}
          />

          <Text style={[styles.title, { color: theme.text }]}>
            {isPrivacy
              ? 'Privacy Policy Placeholder'
              : 'Terms of Service Placeholder'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Coming Soon
          </Text>

          <View style={[styles.infoBox, { backgroundColor: theme.gray50 }]}>
            <Text style={[styles.infoText, { color: theme.text }]}>
              {isPrivacy
                ? 'Our full privacy policy is on the way. It will outline how we protect your personal data and how we use it to help you learn better — transparently and ethically.'
                : 'Our terms of service are almost ready. These will explain the rules for using ELARO in a clear, respectful, and simple way that puts you first.'}
            </Text>
          </View>

          {/* TODO: Render legal sections here, in correct order, with correct numbering */}
        </View>
        {/* Move Contact Us card to the very bottom of the ScrollView */}
        <View style={styles.contact}>
          <Text style={[styles.contactHeading, { color: theme.text }]}>
            Have Questions?
          </Text>
          <Text style={[styles.contactText, { color: theme.textSecondary }]}>
            Reach out to our team anytime at:
          </Text>
          <Text style={[styles.contactEmail, { color: theme.primary }]}>
            legal@elaro.app
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
