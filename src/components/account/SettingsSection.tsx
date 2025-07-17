import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface SettingsSectionProps {
  navigation: any;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ navigation }) => {
  const settingsItems = [
    {
      icon: 'help-circle-outline',
      title: 'Help & Feedback',
      subtitle: 'Get support and share feedback',
      onPress: () => navigation.navigate('HelpAndFeedback' as never),
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Privacy Policy',
      subtitle: 'How we protect your data',
      onPress: () => navigation.navigate('PrivacyPolicy' as never),
    },
    {
      icon: 'document-text-outline',
      title: 'Terms of Use',
      subtitle: 'Our terms and conditions',
      onPress: () => navigation.navigate('TermsOfUse' as never),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Settings</Text>
      {settingsItems.map((item, index) => (
        <Pressable
          key={index}
          style={styles.settingItem}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          accessibilityHint={item.subtitle}
        >
          <View style={styles.settingIcon}>
            <Ionicons name={item.icon as any} size={20} color={COLORS.textSecondary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  settingSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
}); 