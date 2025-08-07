import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';
import { GuideSection } from '../../data/guideSections';

interface GuideCardProps {
  section: GuideSection;
}

export const GuideCard: React.FC<GuideCardProps> = ({ section }) => {
  const formatContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => {
      // Check if paragraph starts with bullet points or emojis
      const isBulletPoint =
        paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-');
      const hasEmoji = /^[^\w\s]/.test(paragraph.trim());

      if (isBulletPoint || hasEmoji) {
        return (
          <Text key={index} style={styles.bulletPoint}>
            {paragraph}
          </Text>
        );
      }

      return (
        <Text key={index} style={styles.paragraph}>
          {paragraph}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{section.icon}</Text>
      <Text style={styles.title}>{section.title}</Text>
      <Text style={styles.subtitle}>{section.subtitle}</Text>

      <View style={styles.contentContainer}>
        {formatContent(section.content)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  icon: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  contentContainer: {
    width: '100%',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  paragraph: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  bulletPoint: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
});

export default GuideCard;
