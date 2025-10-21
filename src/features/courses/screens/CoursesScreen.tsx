// FILE: src/features/courses/screens/CoursesScreen.tsx
import React, { useLayoutEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCourses } from '@/hooks/useDataQueries';
import { useDebounce } from '@/hooks/useDebounce';
import { RootStackParamList, Course } from '@/types';
import { LockedItemsBanner } from '@/features/user-profile/components/LockedItemsBanner';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { QueryStateWrapper } from '@/shared/components';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';

// Define the navigation prop type for this screen
type CoursesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CoursesScreen = () => {
  const navigation = useNavigation<CoursesScreenNavigationProp>();
  const { offerings, purchasePackage } = useRevenueCat();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounce the search query (500ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Use the debounced search query in the API call
  const { data: courses, isLoading, isError, error, refetch, isRefetching } = useCourses(
    debouncedSearchQuery.trim() || undefined
  );

  // Handle upgrade to unlock locked courses
  const handleUpgrade = useCallback(async () => {
    if (!offerings?.current?.availablePackages || offerings.current.availablePackages.length === 0) {
      // Navigate to account screen where subscription management is available
      navigation.navigate('Account');
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
        <TouchableOpacity
          onPress={() => navigation.navigate('AddCourseFlow')}
          style={{ marginRight: 16 }}
        >
          <Text style={styles.headerButton}>Add</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Render item for the FlatList
  const renderCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
    >
      <Text style={styles.courseName}>{item.courseName}</Text>
      {item.courseCode && (
        <Text style={styles.courseCode}>{item.courseCode}</Text>
      )}
    </TouchableOpacity>
  );

  return (
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
        />
      </View>
    </QueryStateWrapper>
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
});

export default CoursesScreen;