import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Button } from '@/shared/components';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useCourses } from '@/hooks/useDataQueries';
import { supabase } from '@/services/supabase';
import { Alert } from 'react-native';
import { RootStackParamList } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { getPendingTask, clearPendingTask } from '@/utils/taskPersistence';

type OnboardingCoursesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const OnboardingCoursesScreen = () => {
  const navigation = useNavigation<OnboardingCoursesScreenNavigationProp>();
  const { onboardingData } = useOnboarding();
  const queryClient = useQueryClient();
  
  // Get courses directly from React Query
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const [isLoading, setIsLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Check for pending course on component mount
  useEffect(() => {
    const checkPendingCourse = async () => {
      const pendingTask = await getPendingTask();
      if (pendingTask && pendingTask.taskType === 'course') {
        // Auto-create the course
        try {
          const { error } = await supabase.functions.invoke('create-course-and-lecture', {
            body: pendingTask.taskData,
          });

          if (error) throw new Error(error.message);

          // Clear pending data
          await clearPendingTask();

          // Invalidate queries to refresh the courses list
          await queryClient.invalidateQueries({ queryKey: ['courses'] });
          await queryClient.invalidateQueries({ queryKey: ['lectures'] });

          Alert.alert('Welcome!', `Your course "${pendingTask.taskData.courseName}" has been automatically created!`);
        } catch (error) {
          console.error('Failed to auto-create course:', error);
          Alert.alert('Error', 'Failed to create your saved course. You can add it manually.');
        }
      }
    };

    checkPendingCourse();
  }, []);

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // The username, university, and program come from the onboarding context
      const { username, country, university, program, dateOfBirth, hasParentalConsent } = onboardingData;
      // The courses now come from our React Query hook
      const finalCourses = courses || [];

      const { error } = await supabase.functions.invoke('complete-onboarding', {
        body: { username, country, university, program, courses: finalCourses, dateOfBirth, hasParentalConsent, marketingOptIn },
      });

      if (error) {
        throw error;
      }

      Alert.alert('Setup Complete!', 'Your profile has been saved successfully.');
      navigation.replace('Main');

    } catch (error: any) {
      console.error('Onboarding completion error:', error);
      Alert.alert('Error', `There was a problem saving your profile: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const renderCourseItem = ({ item }: { item: any }) => (
    <View style={styles.courseItem}>
      <Text style={styles.courseName}>{item.course_name}</Text>
      {item.course_code && <Text style={styles.courseCode}>{item.course_code}</Text>}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add your first courses</Text>
      <Text style={styles.subtitle}>
        Get a head start by adding up to 3 courses now. You can always add more later.
      </Text>
      
      {coursesLoading ? (
        <ActivityIndicator size="large" style={styles.loading} />
      ) : (
        <FlatList
          style={styles.list}
          data={courses || []}
          renderItem={renderCourseItem}
          keyExtractor={(item, index) => index.toString()}
          ListEmptyComponent={
            <Text style={styles.noCoursesText}>No courses added yet.</Text>
          }
          scrollEnabled={false}
        />
      )}

      {/* Marketing Opt-In Section */}
      <View style={styles.marketingSection}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setMarketingOptIn(!marketingOptIn)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, marketingOptIn && styles.checkboxChecked]}>
            {marketingOptIn && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.checkboxTextContainer}>
            <Text style={styles.checkboxLabel}>
              Yes, send me helpful tips, new feature announcements, and special offers from ELARO.
            </Text>
            <Text style={styles.checkboxSubtext}>
              You can change this anytime in your Settings.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} variant="outline" />
        <Button 
          title="Add a Course" 
          onPress={() => navigation.getParent()?.navigate('AddCourseFlow')}
          disabled={(courses?.length || 0) >= 3 || coursesLoading}
        />
        <Button 
          title="Finish Setup" 
          onPress={handleFinish}
          loading={isLoading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: 'gray', marginBottom: 30 },
  loading: { marginVertical: 40 },
  list: { marginBottom: 20 },
  courseItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  courseCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noCoursesText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 40,
  },
  marketingSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  checkboxSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20,
    gap: 10,
  },
});

export default OnboardingCoursesScreen;
