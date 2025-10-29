// FILE: src/features/courses/screens/CoursesScreen.tsx
import React, { useLayoutEffect, useCallback, useState, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Switch, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCourses } from '@/hooks/useDataQueries';
import { useDebounce } from '@/hooks/useDebounce';
import { RootStackParamList, Course } from '@/types';
import { LockedItemsBanner } from '@/features/user-profile/components/LockedItemsBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { QueryStateWrapper } from '@/shared/components';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { CourseSortOption } from '@/features/courses/services/queries';
import { useTheme } from '@/contexts/ThemeContext';

// Define the navigation prop type for this screen
type CoursesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Memoized course item component
const CourseItem = memo<{ item: Course; onPress: (id: string) => void }>(
  ({ item, onPress }) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => onPress(item.id)}
    >
      <Text style={styles.courseName}>{item.courseName}</Text>
      {item.courseCode && (
        <Text style={styles.courseCode}>{item.courseCode}</Text>
      )}
    </TouchableOpacity>
  )
);

const CoursesScreen = () => {
  const navigation = useNavigation<CoursesScreenNavigationProp>();
  // const { offerings, purchasePackage } = useSubscription();
  const { purchasePackage } = useSubscription();
  
  // Mock offerings for now
  const offerings = { current: null as any };
  const { theme } = useTheme();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
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
    if (!offerings?.current?.availablePackages || offerings.current.availablePackages.length === 0) {
      // Navigate to account screen where subscription management is available
      // Account is a tab route, so navigate to Main tab first, then to Account screen
      navigation.navigate('Main', { screen: 'Account' } as any);
      return;
    }

    try {
      // Get the first available package (or you could implement logic to choose a specific package)
      const packageToPurchase = offerings.current.availablePackages[0];
      await purchasePackage(packageToPurchase);
    } catch (error) {
      console.error('Purchase error:', error);
    }
  }, [offerings, purchasePackage, navigation]);

  // Set up the header buttons
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'My Courses',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
          <TouchableOpacity onPress={() => setSortModalVisible(true)}>
            <Ionicons name="swap-vertical" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
            <Ionicons 
              name={showArchived ? "funnel" : "funnel-outline"} 
              size={22} 
              color={showArchived ? COLORS.primary : COLORS.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddCourseFlow')}>
            <Text style={styles.headerButton}>Add</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, showArchived]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Memoized navigation handler
  const handleNavigateToCourse = useCallback((courseId: string) => {
    navigation.navigate('CourseDetail', { courseId });
  }, [navigation]);

  // Render item for the FlatList
  const renderCourse = useCallback(
    ({ item }: { item: Course }) => (
      <CourseItem item={item} onPress={handleNavigateToCourse} />
    ),
    [handleNavigateToCourse]
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

  return (
    <>
      <QueryStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={courses}
        refetch={refetch}
        isRefetching={isRefetching}
        onRefresh={refetch}
        emptyTitle={searchQuery.trim() ? "No courses found" : "No courses yet"}
        emptyMessage={
          searchQuery.trim()
            ? `No courses match "${searchQuery}". Try a different search term.`
            : "Start by adding your first course to organize your academic schedule!"
        }
        emptyIcon="book-outline"
      >
        <View style={styles.container}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search courses..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Active filters indicator */}
          {(sortOption !== 'name-asc' || showArchived) && (
            <View style={styles.activeFiltersContainer}>
              <Text style={[styles.activeFiltersText, { color: theme.textSecondary }]}>
                {getSortLabel()}
                {showArchived && ' • Showing Archived'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSortOption('name-asc');
                  setShowArchived(false);
                }}
                style={styles.clearFiltersButton}
              >
                <Text style={[styles.clearFiltersText, { color: theme.accent }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={courses}
            renderItem={renderCourse}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={
              <LockedItemsBanner
                itemType="courses"
                onUpgrade={handleUpgrade}
              />
            }
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
          />
        </View>
      </QueryStateWrapper>

      {/* Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Sort Courses</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: theme.border },
                  sortOption === option.value && { backgroundColor: theme.accent + '15' }
                ]}
                onPress={() => handleSortSelect(option.value)}
              >
                <Text style={[
                  styles.modalOptionText,
                  { color: theme.text },
                  sortOption === option.value && { color: theme.accent, fontWeight: '600' }
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
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Courses</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOption}>
              <View style={styles.filterOptionText}>
                <Text style={[styles.filterLabel, { color: theme.text }]}>Show Archived Courses</Text>
                <Text style={[styles.filterDescription, { color: theme.textSecondary }]}>
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
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: '#f8f9fa',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
  },
  clearButton: {
    marginLeft: SPACING.sm,
    padding: SPACING.xs,
  },
  listContainer: {
    padding: 16,
  },
  headerButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  courseItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  courseCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activeFiltersText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
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
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    marginTop: SPACING.sm,
    fontSize: 14,
  },
});

export default CoursesScreen;