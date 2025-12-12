import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDeletedItemsQuery } from '@/hooks/useDeletedItemsQuery';
import { QueryStateWrapper } from '@/shared/components';
import { useTheme } from '@/hooks/useTheme';
import { invokeEdgeFunctionWithAuth } from '@/utils/invokeEdgeFunction';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { Alert } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

const RecycleBinScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useDeletedItemsQuery();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Configure header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleRestore = useCallback(
    async (itemId: string, itemType: string) => {
      setActionLoading(itemId);
      const functionName = `restore-${itemType.replace('_', '-')}`;

      const getParameterName = (type: string) => {
        switch (type) {
          case 'course':
            return 'courseId';
          case 'assignment':
            return 'assignmentId';
          case 'lecture':
            return 'lectureId';
          case 'study_session':
            return 'studySessionId';
          default:
            return 'id';
        }
      };

      const parameterName = getParameterName(itemType);
      const { error } = await invokeEdgeFunctionWithAuth(functionName, {
        body: { [parameterName]: itemId },
      });

      if (error) {
        const errorTitle = getErrorTitle(error);
        const errorMessage = mapErrorCodeToMessage(error);
        Alert.alert(errorTitle, errorMessage);
      } else {
        await refetch();
      }
      setActionLoading(null);
    },
    [refetch],
  );

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'course':
        return 'book-outline';
      case 'assignment':
        return 'document-text-outline';
      case 'lecture':
        return 'calendar-outline';
      case 'study_session':
        return 'time-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getItemIconColor = (type: string) => {
    switch (type) {
      case 'course':
        return { light: '#a855f7', dark: '#c084fc' };
      case 'assignment':
        return { light: '#14b8a6', dark: '#5eead4' };
      case 'lecture':
        return { light: '#f59e0b', dark: '#fbbf24' };
      case 'study_session':
        return { light: '#3b82f6', dark: '#60a5fa' };
      default:
        return { light: '#6b7280', dark: '#9ca3af' };
    }
  };

  const getItemName = (item: any) => {
    if (item.type === 'course') {
      return item.course_name || 'Unnamed Course';
    } else if (item.type === 'assignment') {
      return item.title || 'Unnamed Assignment';
    } else if (item.type === 'lecture') {
      return item.lecture_name || 'Unnamed Lecture';
    } else if (item.type === 'study_session') {
      return 'Study Session';
    }
    return 'Unknown Item';
  };

  const formatDeletedDate = (deletedAt: string) => {
    try {
      const date = new Date(deletedAt);
      const distance = formatDistanceToNow(date, { addSuffix: true });
      return `Deleted ${distance}`;
    } catch {
      return 'Deleted recently';
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconColor = getItemIconColor(item.type);
    const isRestoring = actionLoading === item.id;

    return (
      <View
        style={[
          styles.itemCard,
          {
            backgroundColor: theme.surface || '#FFFFFF',
            borderColor: theme.border,
          },
        ]}>
        <View style={styles.itemLeft}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  theme.mode === 'dark'
                    ? `${iconColor.dark}20`
                    : `${iconColor.light}15`,
              },
            ]}>
            <Ionicons
              name={getItemIcon(item.type) as any}
              size={24}
              color={theme.mode === 'dark' ? iconColor.dark : iconColor.light}
            />
          </View>
          <View style={styles.itemInfo}>
            <Text
              style={[styles.itemName, { color: theme.text }]}
              numberOfLines={1}>
              {getItemName(item)}
            </Text>
            <View style={styles.itemMeta}>
              <View style={styles.redDot} />
              <Text
                style={[styles.itemDate, { color: theme.textSecondary }]}
                numberOfLines={1}>
                {formatDeletedDate(item.deleted_at)}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.restoreButton,
            {
              backgroundColor:
                theme.mode === 'dark' ? '#135bec30' : '#135bec15',
            },
            isRestoring && styles.restoreButtonDisabled,
          ]}
          onPress={() => handleRestore(item.id, item.type)}
          disabled={isRestoring}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.restoreButtonText,
              {
                color: theme.mode === 'dark' ? '#60a5fa' : '#135bec',
              },
            ]}>
            {isRestoring ? 'Restoring...' : 'Restore'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Recycle Bin
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <QueryStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={items}
        refetch={refetch}
        isRefetching={isRefetching}
        onRefresh={refetch}
        emptyTitle="Trash can is empty"
        emptyMessage="Deleted items will appear here. Items are automatically deleted after 30 days."
        emptyIcon="trash-outline">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor:
                  theme.mode === 'dark' ? '#f59e0b20' : '#fef3c7',
                borderColor: theme.mode === 'dark' ? '#f59e0b30' : '#fde68a',
              },
            ]}>
            <Ionicons
              name="information-circle"
              size={20}
              color={theme.mode === 'dark' ? '#fbbf24' : '#d97706'}
            />
            <Text
              style={[
                styles.infoText,
                {
                  color: theme.mode === 'dark' ? '#fbbf24' : '#92400e',
                },
              ]}>
              Items are permanently removed after 30 days. Restore courses to
              add them back to your schedule.
            </Text>
          </View>

          {/* Items List */}
          <View style={styles.itemsContainer}>
            {items?.map((item, index) => (
              <View key={`${item.type}-${item.id}-${index}`}>
                {renderItem({ item })}
              </View>
            ))}
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </QueryStateWrapper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.015,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
  },
  itemDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  restoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  restoreButtonDisabled: {
    opacity: 0.5,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default RecycleBinScreen;
