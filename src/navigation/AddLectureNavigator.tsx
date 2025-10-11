import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import the screens we'll create
import SelectCourseScreen from '@/features/lectures/screens/add-flow/LectureSelectCourseScreen';
import DateTimeScreen from '@/features/lectures/screens/add-flow/LectureDateTimeScreen';
import RecurrenceScreen from '@/features/lectures/screens/add-flow/LectureRecurrenceScreen';
import RemindersScreen from '@/features/lectures/screens/add-flow/LectureRemindersScreen';

export type AddLectureStackParamList = {
  SelectCourse: undefined;
  DateTime: undefined;
  Recurrence: undefined;
  Reminders: undefined;
};

const Stack = createStackNavigator<AddLectureStackParamList>();

const AddLectureNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We will have custom headers/progress bars in each screen
      }}
    >
      <Stack.Screen name="SelectCourse" component={SelectCourseScreen} />
      <Stack.Screen name="DateTime" component={DateTimeScreen} />
      <Stack.Screen name="Recurrence" component={RecurrenceScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
    </Stack.Navigator>
  );
};

export default AddLectureNavigator;
