// FILE: src/features/courses/screens/CoursesScreen.tsx
import React, { useLayoutEffect, useCallback, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCourses } from '@/hooks/useDataQueries';
import { useDebounce } from '@/hooks/useDebounce';
import { RootStackParamList, Course } from '@/types';
import { LockedItemsBanner } from '@/shared/components/LockedItemsBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { QueryStateWrapper } from '@/shared/components';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { CourseSortOption } from '@/features/courses/services/queries';
import { useTheme } from '@/contexts/ThemeContext';
import { useJSThreadMonitor } from '@/hooks/useJSThreadMonitor';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';
import { BlurView } from 'expo-blur';

// Define the navigation prop type for this screen
type CoursesScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

// Memoized course item component - simplified design
const CourseItem = memo<{ item: Course; onPress: (id: string) => void }>(
  ({ item, onPress }) => {
    const { theme } = useTheme();
    return (
      <TouchableOpacity
        style={[
          styles.courseItem,
          { backgroundColor: theme.surface || '#FFFFFF' },
        ]}
        onPress={() => onPress(item.id)}
        activeOpacity={0.7}
        accessibilityLabel={item.courseName}
        accessibilityHint="Opens course details"
        accessibilityRole="button">
        <Text style={[styles.courseName, { color: theme.text }]}>
          {item.courseName}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.textSecondary || '#9ca3af'}
        />
      </TouchableOpacity>
    );
  },
);

const CoursesScreen = () => {
  const navigation = useNavigation<CoursesScreenNavigationProp>();
  const { purchasePackage } = useSubscription();
  const offerings = { current: null as any };
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // JS Thread monitoring (dev only)
  const jsThreadMetrics = useJSThreadMonitor({
    enabled: __DEV__,
    logSlowFrames: true,
    slowFrameThreshold: 20,
  });

  // Memory monitoring (dev only)
  useMemoryMonitor(__DEV__, 50, 30000);

  // Log warnings in dev if too many slow frames
  React.useEffect(() => {
    if (__DEV__ && jsThreadMetrics.slowFrameCount > 10) {
      console.warn(
        `⚠️ CoursesScreen: ${jsThreadMetrics.slowFrameCount} slow frames detected. Avg frame time: ${jsThreadMetrics.averageFrameTime.toFixed(2)}ms`,
      );
    }
  }, [jsThreadMetrics.slowFrameCount, jsThreadMetrics.averageFrameTime]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Sort and filter state
  const [sortOption, setSortOption] = useState<CourseSortOption>('name-asc');
  const [showArchived, setShowArchived] = useState(false);
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);

  // Debounce the search query (500ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Use infinite query for pagination
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCourses({
    searchQuery: debouncedSearchQuery.trim() || undefined,
    sortOption,
    showArchived,
  });

  // Flatten all pages into a single array
  const courses = data?.pages.flatMap(page => page.courses) ?? [];

  // Handle upgrade to unlock locked courses
  const handleUpgrade = useCallback(async () => {
    if (
      !offerings?.current?.availablePackages ||
      offerings.current.availablePackages.length === 0
    ) {
      navigation.navigate('Main', { screen: 'Account' } as any);
      return;
    }

    try {
      const packageToPurchase = offerings.current.availablePackages[0];
      await purchasePackage(packageToPurchase);
    } catch (error) {
      console.error('Purchase error:', error);
    }
  }, [offerings, purchasePackage, navigation]);

  // Remove header buttons - we'll use custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Memoized navigation handler
  const handleNavigateToCourse = useCallback(
    (courseId: string) => {
      navigation.navigate('CourseDetail', { courseId });
    },
    [navigation],
  );

  // Render item for the FlatList
  const renderCourse = useCallback(
    ({ item }: { item: Course }) => (
      <CourseItem item={item} onPress={handleNavigateToCourse} />
    ),
    [handleNavigateToCourse],
  );

  // Sort options
  const sortOptions: { label: string; value: CourseSortOption }[] = [
    { label: 'Course Name (A-Z)', value: 'name-asc' },
    { label: 'Course Name (Z-A)', value: 'name-desc' },
    { label: 'Date Created (Newest First)', value: 'date-newest' },
    { label: 'Date Created (Oldest First)', value: 'date-oldest' },
  ];

  const handleSortSelect = (value: CourseSortOption) => {
    setSortOption(value);
    setSortModalVisible(false);
  };

  const getSortLabel = () => {
    const option = sortOptions.find(opt => opt.value === sortOption);
    return option?.label || 'Sort';
  };

  // Handle infinite scroll
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render footer with loading indicator
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.footerLoaderText, { color: theme.textSecondary }]}>
          Loading more courses...
        </Text>
      </View>
    );
  }, [isFetchingNextPage, theme]);

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
        {searchQuery.trim() ? 'No courses found' : 'You have no courses.'}
      </Text>
    </View>
  );

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        {/* Sticky Header */}
        <View
          style={[
            styles.headerContainer,
            {
              paddingTop: 40,
              backgroundColor: theme.background,
            },
          ]}>
          <BlurView intensity={95} style={StyleSheet.absoluteFill} />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              My Courses
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchInputContainer,
                {
                  backgroundColor: theme.surface || '#FFFFFF',
                  borderColor: isSearchFocused ? '#135bec' : theme.border,
                },
              ]}>
              <Ionicons
                name="search"
                size={24}
                color={theme.textSecondary || '#9ca3af'}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search for a course..."
                placeholderTextColor={theme.textSecondary || '#9ca3af'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearSearch}
                  style={styles.clearButton}
                  accessibilityLabel="Clear search"
                  accessibilityRole="button">
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Course List */}
        <QueryStateWrapper
          isLoading={isLoading}
          isError={isError}
          error={error}
          data={courses}
          refetch={refetch}
          isRefetching={isRefetching}
          onRefresh={refetch}
          emptyTitle=""
          emptyMessage=""
          emptyIcon="">
          <FlatList
            data={courses}
            renderItem={renderCourse}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.listContainer,
              courses.length === 0 && styles.listContainerEmpty,
            ]}
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={
              <LockedItemsBanner itemType="courses" onUpgrade={handleUpgrade} />
            }
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            showsVerticalScrollIndicator={false}
          />
        </QueryStateWrapper>

        {/* Bottom Section with Add Button */}
        <View
          style={[
            styles.bottomSection,
            {
              backgroundColor: theme.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}>
          {/* Gradient fade */}
          <View
            style={[
              styles.gradientFade,
              {
                backgroundColor: theme.background,
              },
            ]}
          />

          {/* Add New Course Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddCourseFlow')}
            activeOpacity={0.8}
            accessibilityLabel="Add new course"
            accessibilityRole="button">
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New Course</Text>
            <View style={styles.addButtonRing} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
          accessibilityLabel="Close sort modal"
          accessibilityRole="button">
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Sort Courses
              </Text>
              <TouchableOpacity
                onPress={() => setSortModalVisible(false)}
                accessibilityLabel="Close sort modal"
                accessibilityRole="button">
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: theme.border },
                  sortOption === option.value && {
                    backgroundColor: theme.accent + '15',
                  },
                ]}
                onPress={() => handleSortSelect(option.value)}
                accessibilityLabel={option.label}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: theme.text },
                    sortOption === option.value && {
                      color: theme.accent,
                      fontWeight: '600',
                    },
                  ]}>
                  {option.label}
                </Text>
                {sortOption === option.value && (
                  <Ionicons name="checkmark" size={24} color={theme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
          accessibilityLabel="Close filter modal"
          accessibilityRole="button">
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Filter Courses
              </Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                accessibilityLabel="Close filter modal"
                accessibilityRole="button">
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOption}>
              <View style={styles.filterOptionText}>
                <Text style={[styles.filterLabel, { color: theme.text }]}>
                  Show Archived Courses
                </Text>
                <Text
                  style={[
                    styles.filterDescription,
                    { color: theme.textSecondary },
                  ]}>
                  Include courses that have been archived or deleted
                </Text>
              </View>
              <Switch
                value={showArchived}
                onValueChange={setShowArchived}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={showArchived ? theme.white : theme.border}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerContent: {
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 200, // Space for bottom section
  },
  listContainerEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  gradientFade: {
    position: 'absolute',
    top: -48,
    left: 0,
    right: 0,
    height: 48,
  },
  addButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#135bec',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#135bec',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  addButtonRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    marginTop: SPACING.sm,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    flex: 1,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  filterOptionText: {
    flex: 1,
    marginRight: SPACING.md,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  filterDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default CoursesScreen;
