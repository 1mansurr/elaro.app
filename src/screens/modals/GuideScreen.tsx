import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface GuideScreenProps {
  navigation: any;
  route: any;
}

export default function GuideScreen({ navigation, route }: GuideScreenProps) {
  const { theme } = useTheme();
  const handleClose = () => {
    navigation.goBack();
  };

  const guideSections = [
    {
      title: 'Getting Started',
      icon: 'rocket-outline',
      description: 'Learn the basics of using ELARO to manage your academic tasks.',
    },
    {
      title: 'Task Management',
      icon: 'checkmark-circle-outline',
      description: 'How to create, edit, and organize your tasks effectively.',
    },
    {
      title: 'Calendar View',
      icon: 'calendar-outline',
      description: 'Navigate your schedule and view upcoming deadlines.',
    },
    {
      title: 'Reminders',
      icon: 'notifications-outline',
      description: 'Set up notifications to never miss important deadlines.',
    },
    {
      title: 'Study Sessions',
      icon: 'time-outline',
      description: 'Plan and track your study sessions for better productivity.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Guide</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.introSection, { backgroundColor: theme.card, shadowColor: '#000' }]}>
          <Text style={[styles.introTitle, { color: theme.text }]}>Welcome to ELARO</Text>
          <Text style={[styles.introDescription, { color: theme.textSecondary }]}>
            Your personal academic assistant designed to help you stay organized and achieve your goals.
          </Text>
        </View>

        {guideSections.map((section, index) => (
          <View key={index} style={[styles.guideCard, { backgroundColor: theme.card, shadowColor: '#000' }]}>
            <View style={styles.guideHeader}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name={section.icon as any} size={24} color={theme.primary} />
              </View>
              <View style={styles.guideInfo}>
                <Text style={[styles.guideTitle, { color: theme.text }]}>{section.title}</Text>
                <Text style={[styles.guideDescription, { color: theme.textSecondary }]}>{section.description}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={[styles.tipSection, { backgroundColor: theme.primaryLight }]}>
          <Text style={[styles.tipTitle, { color: theme.card }]}>💡 Pro Tips</Text>
          <Text style={[styles.tipText, { color: theme.card }]}>
            • Use different colors to categorize your tasks{'\n'}
            • Set reminders for important deadlines{'\n'}
            • Review your calendar regularly{'\n'}
            • Break large tasks into smaller ones
          </Text>
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
  guideCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  guideInfo: {
    flex: 1,
  },
  guideTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  guideDescription: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
  },
  tipSection: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  tipTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
}); 