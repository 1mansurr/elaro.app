import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import {
  useDeletedItemsQuery,
  DeletedItem,
} from '@/hooks/useDeletedItemsQuery';
import { useRestoreTask } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

const ITEM_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    bg: string;
    color: string;
  }
> = {
  assignment: {
    label: 'Assignment',
    icon: 'document-text-outline',
    bg: '#EEF0FF',
    color: '#2B56B7',
  },
  lecture: {
    label: 'Lecture',
    icon: 'school-outline',
    bg: '#F3E8FF',
    color: '#7C3AED',
  },
  study_session: {
    label: 'Study Session',
    icon: 'library-outline',
    bg: '#CCFBF1',
    color: '#0D9488',
  },
  course: {
    label: 'Course',
    icon: 'book-outline',
    bg: '#FEF3C7',
    color: '#D97706',
  },
};

const ITEM_TYPE_CONFIG_DARK: Record<string, { bg: string; color: string }> = {
  assignment: { bg: 'rgba(43,86,183,0.2)', color: '#93ACFF' },
  lecture: { bg: 'rgba(124,58,237,0.2)', color: '#C4B5FD' },
  study_session: { bg: 'rgba(13,148,136,0.2)', color: '#5EEAD4' },
  course: { bg: 'rgba(217,119,6,0.2)', color: '#FCD34D' },
};

const getItemLabel = (item: DeletedItem): string => item.title ?? 'Untitled';

const getDeletedLabel = (item: DeletedItem): string => {
  if (!item.deleted_at) return 'Deleted recently';
  try {
    return `Deleted ${formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}`;
  } catch {
    return 'Deleted recently';
  }
};

export const RecycleBinScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { data: items = [], isLoading, refetch } = useDeletedItemsQuery();
  const restoreMutation = useRestoreTask();

  // Load custom task types for dynamic color/label fallback
  const { data: taskTypes = [] } = useQuery({
    queryKey: ['taskTypes'],
    queryFn: () => api.taskTypes.getAll(),
  });

  const handleRestore = useCallback(
    (item: DeletedItem) => {
      restoreMutation.mutate({
        taskId: item.id,
        taskType: item.type as any,
        taskTitle: getItemLabel(item),
      });
    },
    [restoreMutation],
  );

  const renderItem = ({ item }: { item: DeletedItem }) => {
    const staticConfig = ITEM_TYPE_CONFIG[item.type];
    const staticDarkConfig = ITEM_TYPE_CONFIG_DARK[item.type];

    // For custom types, derive color from task_types lookup
    const customType = item.task_type_id
      ? taskTypes.find(t => t.id === item.task_type_id)
      : undefined;

    const config = staticConfig ?? {
      label: customType?.name ?? item.type,
      icon: 'ellipse-outline' as keyof typeof Ionicons.glyphMap,
      bg: (customType?.color ?? '#9CA3AF') + '22',
      color: customType?.color ?? '#9CA3AF',
    };
    const darkConfig = staticDarkConfig ?? {
      bg: (customType?.color ?? '#9CA3AF') + '33',
      color: customType?.color ?? '#9CA3AF',
    };
    const iconBg = isDark ? darkConfig.bg : config.bg;
    const iconColor = isDark ? darkConfig.color : config.color;
    const cardBg = isDark ? '#1A2235' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

    return (
      <View
        style={[
          styles.row,
          { backgroundColor: cardBg, borderColor: cardBorder },
        ]}>
        <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={config.icon} size={24} color={iconColor} />
        </View>
        <View style={styles.rowContent}>
          <Text
            style={[styles.itemName, { color: isDark ? '#FFFFFF' : '#202D51' }]}
            numberOfLines={1}>
            {getItemLabel(item)}
          </Text>
          <View style={styles.deletedRow}>
            <View style={styles.redDot} />
            <Text
              style={[
                styles.deletedLabel,
                { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              {getDeletedLabel(item)}
            </Text>
          </View>
        </View>
        {item.type !== 'course' && (
          <TouchableOpacity
            style={[
              styles.restoreButton,
              {
                backgroundColor: isDark
                  ? 'rgba(99,160,255,0.2)'
                  : 'rgba(0,91,174,0.1)',
              },
            ]}
            onPress={() => handleRestore(item)}
            disabled={restoreMutation.isPending}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.restoreLabel,
                { color: isDark ? '#93ACFF' : COLORS.primary },
              ]}>
              Restore
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const bg = isDark ? '#101622' : '#F6F6F8';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingTop: insets.top },
      ]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? '#FFFFFF' : '#202D51'}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? '#FFFFFF' : '#202D51' },
          ]}>
          Recycle Bin
        </Text>
        <View style={styles.headerButton} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            /* Orange info banner */
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED',
                  borderColor: isDark ? 'rgba(249,115,22,0.2)' : '#FED7AA',
                },
              ]}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#F97316"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <Text
                style={[
                  styles.infoBannerText,
                  { color: isDark ? '#FED7AA' : '#9A3412' },
                ]}>
                Items are permanently removed after 30 days. Restore tasks to
                add them back to your schedule.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="trash-outline"
                size={56}
                color={isDark ? '#374151' : '#D1D5DB'}
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                Recycle bin is empty
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: isDark ? '#6B7280' : '#9CA3AF' },
                ]}>
                Deleted tasks will appear here
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom fade gradient */}
      <LinearGradient
        colors={[
          'transparent',
          isDark ? 'rgba(16,22,34,0.95)' : 'rgba(246,246,248,0.95)',
        ]}
        style={[styles.bottomFade, { paddingBottom: insets.bottom }]}
        pointerEvents="none"
      />
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
    paddingHorizontal: SPACING.md,
    height: 56,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    gap: 12,
    paddingBottom: 80,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  deletedLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  restoreButton: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.medium,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
});
