import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '@/types';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type GuestHomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GuestHome'>;

const GuestHomeScreen: React.FC = () => {
  const navigation = useNavigation<GuestHomeScreenNavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate('Auth');
  };

  const handleLearnMore = () => {
    // Navigate to a learn more screen or open external link
    console.log('Learn more pressed');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to ELARO</Text>
        <Text style={styles.subtitle}>
          Your personal academic companion for managing courses, assignments, and study sessions.
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureCard}>
          <Ionicons name="book-outline" size={32} color={COLORS.primary} />
          <Text style={styles.featureTitle}>Course Management</Text>
          <Text style={styles.featureDescription}>
            Organize your courses and track your academic progress
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="calendar-outline" size={32} color={COLORS.primary} />
          <Text style={styles.featureTitle}>Assignment Tracking</Text>
          <Text style={styles.featureDescription}>
            Never miss a deadline with smart reminders and scheduling
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="time-outline" size={32} color={COLORS.primary} />
          <Text style={styles.featureTitle}>Study Sessions</Text>
          <Text style={styles.featureDescription}>
            Plan and track your study time effectively
          </Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleLearnMore}>
          <Text style={styles.secondaryButtonText}>Learn More</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Join thousands of students who are already using ELARO to stay organized and succeed academically.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featureCard: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    marginBottom: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  secondaryButton: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default GuestHomeScreen;
