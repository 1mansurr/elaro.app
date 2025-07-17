import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function ScheduleSR() {
  const { theme } = useTheme();
  const handleGetStarted = () => {
    // Future: navigate to session planner
    console.log('Get Started pressed');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl,
    },
    iconSection: {
      alignItems: 'center',
      marginBottom: SPACING.xxl,
      position: 'relative',
    },
    iconWrapper: {
      ...SHADOWS.medium,
    },
    iconGradient: {
      width: 96,
      height: 96,
      borderRadius: BORDER_RADIUS.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    decorativeDots: {
      position: 'absolute',
      top: -20,
      right: -40,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginBottom: SPACING.xs,
    },
    dot1: { opacity: 0.6 },
    dot2: { opacity: 0.4 },
    dot3: { opacity: 0.2 },
    textSection: {
      alignItems: 'center',
      marginBottom: SPACING.xxl,
    },
    title: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '700',
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: FONT_SIZES.lg,
      lineHeight: 24,
      textAlign: 'center',
      marginBottom: SPACING.md,
      maxWidth: 320,
    },
    description: {
      fontSize: FONT_SIZES.md,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 300,
    },
    ctaSection: {
      alignItems: 'center',
      width: '100%',
    },
    button: {
      width: '100%',
      maxWidth: 280,
      borderRadius: BORDER_RADIUS.lg,
      overflow: 'hidden',
      ...SHADOWS.medium,
    },
    buttonPressed: {
      transform: [{ scale: 0.98 }],
    },
    buttonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.xl,
    },
    buttonIcon: {
      marginRight: SPACING.sm,
    },
    buttonText: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '600',
    },
    ctaNote: {
      fontSize: FONT_SIZES.sm,
      marginTop: SPACING.md,
      textAlign: 'center',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon Section */}
        <View style={styles.iconSection}>
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="repeat-outline" size={48} color={theme.white} />
            </LinearGradient>
          </View>
          
          {/* Decorative dots */}
          <View style={styles.decorativeDots}>
            <View style={[styles.dot, { backgroundColor: theme.primaryLight, opacity: 0.6 }]} />
            <View style={[styles.dot, { backgroundColor: theme.primaryLight, opacity: 0.4 }]} />
            <View style={[styles.dot, { backgroundColor: theme.primaryLight, opacity: 0.2 }]} />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textSection}>
          <Text style={[styles.title, { color: theme.text }]}>Spaced Repetition</Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Schedule review sessions that help you remember more, for longer.
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Our smart algorithm adapts to your learning pace, ensuring optimal retention.
          </Text>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed
            ]}
            onPress={handleGetStarted}
            accessibilityRole="button"
            accessibilityLabel="Get started with spaced repetition"
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play" size={20} color={theme.white} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: theme.white }]}>Get Started</Text>
            </LinearGradient>
          </Pressable>

          <Text style={[styles.ctaNote, { color: theme.textLight }]}>
            Become an Oddity to unlock
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
} 