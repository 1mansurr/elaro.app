import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import the screens we'll create
import SelectCourseScreen from '../screens/add-lecture-flow/SelectCourseScreen';
import DateTimeScreen from '../screens/add-lecture-flow/DateTimeScreen';
import RecurrenceScreen from '../screens/add-lecture-flow/RecurrenceScreen';
import RemindersScreen from '../screens/add-lecture-flow/RemindersScreen';

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
