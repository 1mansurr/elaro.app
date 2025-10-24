import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { RootStackParamList } from '@/types';
import { DraftData, getAllDrafts, clearDraft, clearAllDrafts } from '@/utils/draftStorage';
import { Button } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { showToast } from '@/utils/showToast';

type DraftsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const DraftsScreen = () => {
  const navigation = useNavigation<DraftsScreenNavigationProp>();
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDrafts = async () => {
    try {
      const allDrafts = await getAllDrafts();
      setDrafts(allDrafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  // Reload drafts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDrafts();
  };

  const handleOpenDraft = (draft: DraftData) => {
    // Navigate to appropriate modal based on task type
    const initialData = {
      course: draft.course,
      title: draft.title,
      dateTime: draft.dateTime,
    };

    switch (draft.taskType) {
      case 'assignment':
        navigation.navigate('AddAssignmentFlow', { initialData } as any);
        break;
      case 'lecture':
        navigation.navigate('AddLectureFlow', { initialData } as any);
        break;
      case 'study_session':
        navigation.navigate('AddStudySessionFlow', { initialData } as any);
        break;
    }
  };

  const handleDeleteDraft = (draft: DraftData) => {
    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await clearDraft(draft.taskType);
            showToast({ type: 'success', message: 'Draft deleted' });
            loadDrafts();
          },
        },
      ]
    );
  };

  const handleClearAllDrafts = () => {
    if (drafts.length === 0) return;

    Alert.alert(
      'Clear All Drafts',
      `Are you sure you want to delete all ${drafts.length} drafts? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllDrafts();
            showToast({ type: 'success', message: 'All drafts cleared' });
            loadDrafts();
          },
        },
      ]
    );
  };

  const getTaskTypeInfo = (taskType: string) => {
    switch (taskType) {
      case 'assignment':
        return { icon: 'document-text' as const, color: '#FF9500', label: 'Assignment' };
      case 'lecture':
        return { icon: 'school' as const, color: COLORS.primary, label: 'Lecture' };
      case 'study_session':
        return { icon: 'book' as const, color: '#34C759', label: 'Study Session' };
      default:
        return { icon: 'document' as const, color: COLORS.gray, label: 'Task' };
    }
  };

  const renderDraft = ({ item }: { item: DraftData }) => {
    const typeInfo = getTaskTypeInfo(item.taskType);
    const savedAgo = formatDistanceToNow(new Date(item.savedAt), { addSuffix: true });

    return (
      <TouchableOpacity
        style={styles.draftCard}
        onPress={() => handleOpenDraft(item)}
        activeOpacity={0.7}
      >
        <View style={styles.draftContent}>
          <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
            <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
          </View>
          
          <View style={styles.draftInfo}>
            <Text style={styles.draftTitle} numberOfLines={2}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={styles.draftType}>{typeInfo.label}</Text>
            {item.course && (
              <Text style={styles.draftCourse} numberOfLines={1}>
                {item.course.courseName}
              </Text>
            )}
            <Text style={styles.draftSavedAt}>Saved {savedAgo}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteDraft(item);
            }}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={64} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No Drafts</Text>
      <Text style={styles.emptyMessage}>
        Drafts are automatically saved when you start creating a task. They'll appear here so you can continue later.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Drafts {drafts.length > 0 && `(${drafts.length})`}
        </Text>
        {drafts.length > 0 && (
          <TouchableOpacity onPress={handleClearAllDrafts}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Banner */}
      {drafts.length > 0 && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoBannerText}>
            Tap a draft to continue editing. Drafts are auto-saved as you type.
          </Text>
        </View>
      )}

      {/* Drafts List */}
      <FlatList
        data={drafts}
        renderItem={renderDraft}
        keyExtractor={(item) => item.taskType}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
  },
  clearAllText: {
    fontSize: FONT_SIZES.md,
    color: '#FF3B30',
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FF',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  draftCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  draftContent: {
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  draftInfo: {
    flex: 1,
  },
  draftTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: 4,
  },
  draftType: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginBottom: 2,
  },
  draftCourse: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginBottom: 2,
  },
  draftSavedAt: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    paddingTop: SPACING.xxl * 3,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
  },
});

export default DraftsScreen;

