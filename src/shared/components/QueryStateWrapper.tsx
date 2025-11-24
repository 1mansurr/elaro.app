import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import {
  mapErrorCodeToMessage,
  getErrorTitle,
  isRecoverableError,
} from '@/utils/errorMapping';

interface QueryStateWrapperProps {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: unknown;
  children: React.ReactNode;
  refetch?: () => void;
  isRefetching?: boolean;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyStateComponent?: React.ReactElement; // NEW: Optional custom empty state component
  skeletonComponent?: React.ReactElement; // Optional skeleton component
  skeletonCount?: number; // Number of skeleton items to show (default: 5)
}

/**
 * A reusable wrapper component that handles loading, error, and empty states for React Query queries.
 * Supports pull-to-refresh functionality.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, error, refetch, isRefetching } = useAssignments();
 *
 * return (
 *   <QueryStateWrapper
 *     isLoading={isLoading}
 *     isError={isError}
 *     error={error}
 *     data={data}
 *     refetch={refetch}
 *     isRefetching={isRefetching}
 *     onRefresh={refetch}
 *   >
 *     <FlatList data={data} renderItem={...} />
 *   </QueryStateWrapper>
 * );
 * ```
 */
export const QueryStateWrapper: React.FC<QueryStateWrapperProps> = ({
  isLoading,
  isError,
  error,
  data,
  children,
  refetch,
  isRefetching = false,
  onRefresh,
  emptyTitle = 'No data found',
  emptyMessage = "There's nothing to show here yet.",
  emptyIcon = 'document-outline',
  emptyStateComponent,
  skeletonComponent,
  skeletonCount = 5,
}) => {
  const { theme } = useTheme();

  // Loading State with Skeleton Support
  if (isLoading) {
    // If skeleton component is provided, render multiple skeletons
    if (skeletonComponent) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <View key={index}>{skeletonComponent}</View>
          ))}
        </View>
      );
    }

    // Fallback to original loading state
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  // Error State
  if (isError) {
    const errorTitle = getErrorTitle(error);
    const errorMessage = mapErrorCodeToMessage(error);
    const canRetry = isRecoverableError(error);

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={theme.destructive}
        />
        <Text style={[styles.errorTitle, { color: theme.text }]}>
          {errorTitle}
        </Text>
        <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
          {errorMessage}
        </Text>
        {refetch && canRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.accent }]}
            onPress={() => refetch()}>
            <Ionicons name="refresh" size={20} color={theme.white} />
            <Text style={[styles.retryButtonText, { color: theme.white }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Empty State
  const isEmpty =
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.length === 0);

  if (isEmpty) {
    // If custom empty state component is provided, use it
    if (emptyStateComponent) {
      if (onRefresh) {
        return (
          <ScrollView
            style={{ flex: 1, backgroundColor: theme.background }}
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={onRefresh}
                tintColor={theme.accent}
                colors={[theme.accent]}
              />
            }>
            {emptyStateComponent}
          </ScrollView>
        );
      }
      return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {emptyStateComponent}
        </View>
      );
    }

    // Wrap empty state in ScrollView if pull-to-refresh is enabled
    if (onRefresh) {
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.background }}
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }>
          <Ionicons name={emptyIcon} size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {emptyTitle}
          </Text>
          <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
            {emptyMessage}
          </Text>
        </ScrollView>
      );
    }

    // Original empty state (no pull-to-refresh)
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Ionicons name={emptyIcon} size={64} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {emptyTitle}
        </Text>
        <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  // Success State - Render children with optional pull-to-refresh
  if (onRefresh) {
    // Wrap children in ScrollView with RefreshControl
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }>
          {children}
        </ScrollView>
      </View>
    );
  }

  // Original success state (no pull-to-refresh)
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  errorTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  retryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  emptyTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    maxWidth: 300,
  },
});
