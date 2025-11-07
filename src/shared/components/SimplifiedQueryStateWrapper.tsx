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

// ===========================================
// 🏗️ SIMPLIFIED QUERY STATE INTERFACES
// ===========================================

// Query state configuration
interface QueryStateConfig {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: any;
  refetch?: () => void;
  isRefetching?: boolean;
}

// Empty state configuration
interface EmptyStateConfig {
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  customComponent?: React.ReactElement;
}

// Loading state configuration
interface LoadingStateConfig {
  skeletonComponent?: React.ReactElement;
  skeletonCount?: number;
}

// Simplified main interface
interface SimplifiedQueryStateWrapperProps {
  queryState: QueryStateConfig;
  emptyState?: EmptyStateConfig;
  loadingState?: LoadingStateConfig;
  onRefresh?: () => void;
  children: React.ReactNode;
}

// ===========================================
// 🧩 FOCUSED SUB-COMPONENTS
// ===========================================

// Loading State Component
const LoadingState: React.FC<{
  skeletonComponent?: React.ReactElement;
  skeletonCount?: number;
}> = ({ skeletonComponent, skeletonCount = 5 }) => {
  if (skeletonComponent) {
    return (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <View key={index}>{skeletonComponent}</View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

// Error State Component
const ErrorState: React.FC<{
  error: Error;
  onRetry?: () => void;
}> = ({ error, onRetry }) => {
  const { theme } = useTheme();
  const errorTitle = getErrorTitle(error);
  const errorMessage = mapErrorCodeToMessage(error);
  const canRetry = isRecoverableError(error);

  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={64} color={COLORS.error} />
      <Text style={[styles.errorTitle, { color: theme.text }]}>
        {errorTitle}
      </Text>
      <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
        {errorMessage}
      </Text>
      {canRetry && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Empty State Component
const EmptyState: React.FC<{
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  customComponent?: React.ReactElement;
}> = ({ title, message, icon, customComponent }) => {
  const { theme } = useTheme();

  if (customComponent) {
    return customComponent;
  }

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon} size={64} color={COLORS.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
};

// ===========================================
// 🎯 SIMPLIFIED MAIN COMPONENT
// ===========================================

export const SimplifiedQueryStateWrapper: React.FC<
  SimplifiedQueryStateWrapperProps
> = ({ queryState, emptyState, loadingState, onRefresh, children }) => {
  const { isLoading, isError, error, data, refetch, isRefetching } = queryState;

  // Show loading state
  if (isLoading) {
    return (
      <LoadingState
        skeletonComponent={loadingState?.skeletonComponent}
        skeletonCount={loadingState?.skeletonCount}
      />
    );
  }

  // Show error state
  if (isError && error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Show empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (emptyState) {
      return (
        <EmptyState
          title={emptyState.title || 'No data'}
          message={emptyState.message || 'No items found'}
          icon={emptyState.icon || 'document-outline'}
          customComponent={emptyState.customComponent}
        />
      );
    }
  }

  // Show content with optional refresh
  if (onRefresh) {
    return (
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || false}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }>
        {children}
      </ScrollView>
    );
  }

  return <>{children}</>;
};

// ===========================================
// 🎨 STYLES
// ===========================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  skeletonContainer: {
    padding: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// ===========================================
// 🔄 BACKWARD COMPATIBILITY
// ===========================================

// Legacy QueryStateWrapper for backward compatibility
export const QueryStateWrapper: React.FC<{
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: any;
  children: React.ReactNode;
  refetch?: () => void;
  isRefetching?: boolean;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyStateComponent?: React.ReactElement;
  skeletonComponent?: React.ReactElement;
  skeletonCount?: number;
}> = props => {
  const {
    isLoading,
    isError,
    error,
    data,
    refetch,
    isRefetching,
    onRefresh,
    emptyTitle,
    emptyMessage,
    emptyIcon,
    emptyStateComponent,
    skeletonComponent,
    skeletonCount,
    children,
  } = props;

  return (
    <SimplifiedQueryStateWrapper
      queryState={{
        isLoading,
        isError,
        error,
        data,
        refetch,
        isRefetching,
      }}
      emptyState={{
        title: emptyTitle,
        message: emptyMessage,
        icon: emptyIcon,
        customComponent: emptyStateComponent,
      }}
      loadingState={{
        skeletonComponent,
        skeletonCount,
      }}
      onRefresh={onRefresh}>
      {children}
    </SimplifiedQueryStateWrapper>
  );
};

export default SimplifiedQueryStateWrapper;
