import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// We will create these screen components in the next steps.
// For now, we can use placeholder components.
import AddCourseNameScreen from '../screens/add-course-flow/AddCourseNameScreen';
import AddCourseDescriptionScreen from '../screens/add-course-flow/AddCourseDescriptionScreen';
import AddLectureDateTimeScreen from '../screens/add-course-flow/AddLectureDateTimeScreen';
import AddLectureRecurrenceScreen from '../screens/add-course-flow/AddLectureRecurrenceScreen';
import AddLectureRemindersScreen from '../screens/add-course-flow/AddLectureRemindersScreen';

export type AddCourseStackParamList = {
  AddCourseName: undefined;
  AddCourseDescription: undefined;
  AddLectureDateTime: undefined;
  AddLectureRecurrence: undefined;
  AddLectureReminders: undefined;
};

const Stack = createStackNavigator<AddCourseStackParamList>();

const AddCourseNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We will have custom headers/progress bars in each screen
      }}
    >
      <Stack.Screen name="AddCourseName" component={AddCourseNameScreen} />
      <Stack.Screen name="AddCourseDescription" component={AddCourseDescriptionScreen} />
      <Stack.Screen name="AddLectureDateTime" component={AddLectureDateTimeScreen} />
      <Stack.Screen name="AddLectureRecurrence" component={AddLectureRecurrenceScreen} />
      <Stack.Screen name="AddLectureReminders" component={AddLectureRemindersScreen} />
    </Stack.Navigator>
  );
};

export default AddCourseNavigator;
