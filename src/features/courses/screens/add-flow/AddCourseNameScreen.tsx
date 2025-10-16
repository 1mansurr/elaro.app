import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAddCourse } from '@/features/courses/contexts/AddCourseContext';
import { AddCourseStackParamList } from '@/navigation/AddCourseNavigator';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

const COURSE_LIMITS: { [key: string]: number } = {
  free: 2,
  oddity: 7,
};

// Define the navigation prop type for this screen
type AddCourseNameScreenNavigationProp = StackNavigationProp<
  AddCourseStackParamList,
  'AddCourseName'
>;

const AddCourseNameScreen = () => {
  const navigation = useNavigation<AddCourseNameScreenNavigationProp>();
  const { courseData, updateCourseData } = useAddCourse();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [courseName, setCourseName] = useState(courseData.courseName || '');
  const [courseCode, setCourseCode] = useState(courseData.courseCode || '');
  const [courseCount, setCourseCount] = useState(0);

  // Check course count on component mount
  useEffect(() => {
    const checkCourseCount = async () => {
      if (!user?.id) return;
      
      const { count, error } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!error && count !== null) {
        setCourseCount(count);
      }
    };

    checkCourseCount();
  }, [user?.id]);

  const handleNext = () => {
    if (!courseName.trim()) {
      Alert.alert('Course name is required.');
      return;
    }

    // Check course limits before proceeding
    const userTier = user?.subscription_tier || 'free';
    const courseLimit = COURSE_LIMITS[userTier] || COURSE_LIMITS.free;

    if (courseCount >= courseLimit) {
      Alert.alert(
        'Course Limit Reached',
        `You have reached the limit of ${courseLimit} courses for the 'free' plan. Upgrade to Oddity for just $1.99/month to add more courses.`,
        [
          { text: 'OK', style: 'cancel' },
          // The "Become an Oddity" button for the free upgrade flow can remain if desired,
          // but it will only be relevant for 'free' users.
          ...(userTier === 'free' ? [{
            text: 'Become an Oddity',
            onPress: async () => {
              // This should trigger the free upgrade flow
              try {
                const { error } = await supabase.functions.invoke('grant-premium-access');
                if (error) throw error;
                await queryClient.invalidateQueries({ queryKey: ['user'] });
                await queryClient.invalidateQueries({ queryKey: ['courses'] });
                Alert.alert('Success!', 'You now have access to all premium features.');
              } catch (e) {
                Alert.alert('Error', 'Could not complete the upgrade.');
              }
            },
          }] : [])
        ]
      );
      return;
    }

    updateCourseData({ 
      courseName: courseName.trim(),
      courseCode: courseCode.trim()
    });
    navigation.navigate('AddCourseDescription');
  };

  const handleCancel = () => {
    // This will close the modal navigator
    navigation.getParent()?.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What&apos;s the course name?</Text>
      
      <TextInput
        style={styles.input}
        placeholder="e.g., Introduction to Psychology"
        value={courseName}
        onChangeText={setCourseName}
        autoFocus={true} // Automatically focus the input
        autoCapitalize="words"
      />

      <Text style={styles.label}>Course Code (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., PSY 101"
        value={courseCode}
        onChangeText={setCourseCode}
        autoCapitalize="characters"
      />

      <View style={styles.buttonContainer}>
        <Button title="Cancel" onPress={handleCancel} color="#888" />
        <Button title="Next" onPress={handleNext} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, fontSize: 18 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
});

export default AddCourseNameScreen;
