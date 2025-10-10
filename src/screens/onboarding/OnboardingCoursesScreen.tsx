import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useCourses } from '../../hooks/useDataQueries';
import { supabase } from '../../services/supabase';
import { Alert } from 'react-native';
import { RootStackParamList } from '../../types';

type OnboardingCoursesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const OnboardingCoursesScreen = () => {
  const navigation = useNavigation<OnboardingCoursesScreenNavigationProp>();
  const { onboardingData } = useOnboarding();
  
  // Get courses directly from React Query
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const [isLoading, setIsLoading] = useState(false);

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // The username, university, and program come from the onboarding context
      const { username, country, university, program } = onboardingData;
      // The courses now come from our React Query hook
      const finalCourses = courses || [];

      const { error } = await supabase.functions.invoke('complete-onboarding', {
        body: { username, country, university, program, courses: finalCourses },
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
    <View style={styles.container}>
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
        />
      )}

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} color="#888" />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: 'gray', marginBottom: 30 },
  loading: { marginVertical: 40 },
  list: { flex: 1, marginBottom: 20 },
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
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20,
    gap: 10,
  },
});

export default OnboardingCoursesScreen;
