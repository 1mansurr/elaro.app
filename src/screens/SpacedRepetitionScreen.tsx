import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '../components/Card';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function SpacedRepetitionScreen() {
  const { theme } = useTheme();
  // Placeholder list - replace with real data later
  const spacedItems: any[] = []; // e.g. [{ id, title, dueDate, difficulty }, ...]

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerContent: {
      marginBottom: SPACING.sm,
    },
    screenTitle: {
      fontSize: FONT_SIZES.xxl,
      fontWeight: '700',
      color: theme.text,
      marginBottom: SPACING.xs,
    },
    screenSubtitle: {
      fontSize: FONT_SIZES.md,
      color: theme.textSecondary,
    },
    headerStats: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    statBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primaryLight,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.lg,
      gap: SPACING.xs,
    },
    statBadgeText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: '500',
      color: theme.primary,
    },
    listContainer: {
      padding: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    separator: {
      height: SPACING.md,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      ...SHADOWS.medium,
    },
    cardPressed: {
      transform: [{ scale: 0.98 }],
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    cardTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      marginRight: SPACING.sm,
    },
    difficultyBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
    },
    difficultyEasy: {
      backgroundColor: theme.green100,
    },
    difficultyMedium: {
      backgroundColor: theme.orange100,
    },
    difficultyHard: {
      backgroundColor: theme.red100,
    },
    difficultyText: {
      fontSize: FONT_SIZES.xs,
      fontWeight: '600',
      color: theme.text,
    },
    cardMeta: {
      marginBottom: SPACING.md,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
      gap: SPACING.xs,
    },
    metaText: {
      fontSize: FONT_SIZES.sm,
      color: theme.textSecondary,
    },
    cardFooter: {
      marginTop: SPACING.sm,
    },
    progressText: {
      fontSize: FONT_SIZES.sm,
      color: theme.textSecondary,
      marginBottom: SPACING.xs,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.gray200,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 2,
    },
    emptyList: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    emptyState: {
      alignItems: 'center',
      maxWidth: 300,
    },
    emptyIconWrapper: {
      marginBottom: SPACING.lg,
      ...SHADOWS.medium,
    },
    emptyIconGradient: {
      width: 96,
      height: 96,
      borderRadius: BORDER_RADIUS.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: theme.text,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: FONT_SIZES.md,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.xl,
    },
    emptyStats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: SPACING.lg,
      borderRadius: BORDER_RADIUS.lg,
      ...SHADOWS.small,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontSize: FONT_SIZES.xl,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: SPACING.xs,
    },
    statLabel: {
      fontSize: FONT_SIZES.sm,
      color: theme.textSecondary,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.border,
      marginHorizontal: SPACING.lg,
    },
  });

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrapper}>
        <LinearGradient
          colors={[theme.success, theme.green600]}
          style={styles.emptyIconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="checkmark-done-circle" size={48} color={theme.white} />
        </LinearGradient>
      </View>
      
      <Text style={styles.emptyTitle}>You're all caught up!</Text>
      <Text style={styles.emptySubtitle}>
        No spaced repetition items to review right now. Great job staying on top of your studies!
      </Text>
      
      <View style={styles.emptyStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Due Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Review ${item.title}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[
          styles.difficultyBadge, 
          item.difficulty === 'Easy' && styles.difficultyEasy,
          item.difficulty === 'Medium' && styles.difficultyMedium,
          item.difficulty === 'Hard' && styles.difficultyHard,
        ]}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </View>
      </View>
      
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.metaText}>Due: {item.dueDate}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="repeat-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.metaText}>Interval: {item.interval}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.progressText}>Review {item.reviewCount} of {item.totalReviews}</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(item.reviewCount / item.totalReviews) * 100}%` }
            ]} 
          />
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.screenTitle}>Spaced Repetition</Text>
          <Text style={styles.screenSubtitle}>Your upcoming review sessions</Text>
        </View>
        
        <View style={styles.headerStats}>
          <View style={styles.statBadge}>
            <Ionicons name="calendar-outline" size={16} color={theme.primary} />
            <Text style={styles.statBadgeText}>{spacedItems.length} items</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={spacedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          spacedItems.length === 0 ? styles.emptyList : styles.listContainer
        }
        ListEmptyComponent={renderEmpty}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
} 