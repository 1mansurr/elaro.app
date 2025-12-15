import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  PanGestureHandler,
  State,
  GestureHandlerGestureEvent,
  GestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/types';
import {
  DraftData,
  getAllDrafts,
  clearDraft,
  clearAllDrafts,
} from '@/utils/draftStorage';
import { PrimaryButton, SecondaryButton } from '@/shared/components';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';
import { showToast } from '@/utils/showToast';

const { width: screenWidth } = Dimensions.get('window');
const EDGE_SWIPE_THRESHOLD = 50;

type DraftsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const DraftsScreen = () => {
  const navigation = useNavigation<DraftsScreenNavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

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
    }, []),
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
        navigation.navigate('AddAssignmentFlow', { initialData });
        break;
      case 'lecture':
        navigation.navigate('AddLectureFlow', { initialData });
        break;
      case 'study_session':
        navigation.navigate('AddStudySessionFlow', { initialData });
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
      ],
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
      ],
    );
  };

  const getTaskTypeInfo = (taskType: string) => {
    switch (taskType) {
      case 'assignment':
        return {
          icon: 'document-text' as const,
          color: '#FF9500',
          label: 'Assignment',
        };
      case 'lecture':
        return {
          icon: 'school' as const,
          color: COLORS.primary,
          label: 'Lecture',
        };
      case 'study_session':
        return {
          icon: 'book' as const,
          color: '#34C759',
          label: 'Study Session',
        };
      default:
        return { icon: 'document' as const, color: COLORS.gray, label: 'Task' };
    }
  };


  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    if (translationX < -EDGE_SWIPE_THRESHOLD) {
      const progress = Math.min(1, Math.abs(translationX) / screenWidth);
      edgeSwipeTranslateX.setValue(translationX);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    const { translationX } = event.nativeEvent;
    if (Math.abs(translationX) > EDGE_SWIPE_THRESHOLD) {
      // Animate out and go back
      Animated.parallel([
        Animated.timing(edgeSwipeTranslateX, {
          toValue: -screenWidth,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(edgeSwipeOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.goBack();
        // Reset
        edgeSwipeTranslateX.setValue(0);
        edgeSwipeOpacity.setValue(1);
      });
    } else {
      // Snap back
      Animated.parallel([
        Animated.spring(edgeSwipeTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
        }),
        Animated.spring(edgeSwipeOpacity, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
        }),
      ]).start();
    }
  };

  // Light mode default colors
  const bgColor = theme.isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = theme.isDark ? '#1C252E' : '#FFFFFF';
  const textColor = theme.isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = theme.isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = theme.isDark ? '#374151' : '#E5E7EB';

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="document-outline"
        size={64}
        color={textSecondaryColor}
      />
      <Text style={[styles.emptyTitle, { color: textColor }]}>No Drafts</Text>
      <Text style={[styles.emptyMessage, { color: textSecondaryColor }]}>
        Drafts are automatically saved when you start creating a task. They'll
        appear here so you can continue later.
      </Text>
    </View>
  );

  return (
    <PanGestureHandler
      onGestureEvent={handleEdgeSwipe}
      onHandlerStateChange={handleEdgeSwipeEnd}
      activeOffsetX={-10}
      failOffsetY={[-10, 10]}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
            transform: [{ translateX: edgeSwipeTranslateX }],
            opacity: edgeSwipeOpacity,
          },
        ]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: bgColor,
              borderBottomColor: borderColor,
              paddingTop: SPACING.md,
            },
          ]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back-ios" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Drafts {drafts.length > 0 && `(${drafts.length})`}
          </Text>
          {drafts.length > 0 ? (
            <TouchableOpacity onPress={handleClearAllDrafts}>
              <Text style={[styles.clearAllText, { color: '#EF4444' }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* Info Banner */}
        {drafts.length > 0 && (
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(59, 130, 246, 0.1)'
                  : '#F0F5FF',
              },
            ]}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text
              style={[
                styles.infoBannerText,
                { color: theme.isDark ? '#93C5FD' : COLORS.primary },
              ]}>
              Tap a draft to continue editing. Drafts are auto-saved as you
              type.
            </Text>
          </View>
        )}

        {/* Drafts List */}
        <FlatList
          data={drafts}
          renderItem={({ item }) => {
            const typeInfo = getTaskTypeInfo(item.taskType);
            const savedAgo = formatDistanceToNow(new Date(item.savedAt), {
              addSuffix: true,
            });

            return (
              <TouchableOpacity
                style={[
                  styles.draftCard,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: borderColor,
                  },
                ]}
                onPress={() => handleOpenDraft(item)}
                activeOpacity={0.7}>
                <View style={styles.draftContent}>
                  <View
                    style={[
                      styles.typeIcon,
                      {
                        backgroundColor:
                          typeInfo.color + (theme.isDark ? '30' : '20'),
                      },
                    ]}>
                    <Ionicons
                      name={typeInfo.icon}
                      size={24}
                      color={typeInfo.color}
                    />
                  </View>

                  <View style={styles.draftInfo}>
                    <Text
                      style={[styles.draftTitle, { color: textColor }]}
                      numberOfLines={2}>
                      {item.title || 'Untitled'}
                    </Text>
                    <Text
                      style={[
                        styles.draftType,
                        { color: textSecondaryColor },
                      ]}>
                      {typeInfo.label}
                    </Text>
                    {item.course && (
                      <Text
                        style={[
                          styles.draftCourse,
                          { color: textSecondaryColor },
                        ]}
                        numberOfLines={1}>
                        {item.course.courseName}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.draftSavedAt,
                        { color: textSecondaryColor },
                      ]}>
                      Saved {savedAgo}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={e => {
                      e.stopPropagation();
                      handleDeleteDraft(item);
                    }}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={item => item.taskType}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
        />
      </Animated.View>
    </PanGestureHandler>
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
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  clearAllText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: SPACING.md,
  },
  draftCard: {
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.xs,
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
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: 4,
  },
  draftType: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 2,
  },
  draftCourse: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 2,
  },
  draftSavedAt: {
    fontSize: FONT_SIZES.xs,
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
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
  },
});

export default DraftsScreen;
