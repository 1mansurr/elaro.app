import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import {
  AddCourseInfoScreen,
  AddLectureDateTimeScreen,
  AddLectureRemindersScreen,
} from '@/features/courses/screens';

export type AddCourseStackParamList = {
  AddCourseInfo: undefined;
  AddLectureDateTime: undefined;
  AddLectureReminders: undefined;
};

const Stack = createStackNavigator<AddCourseStackParamList>();

const AddCourseNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We will have custom headers/progress bars in each screen
      }}>
      <Stack.Screen name="AddCourseInfo" component={AddCourseInfoScreen} />
      <Stack.Screen
        name="AddLectureDateTime"
        component={AddLectureDateTimeScreen}
      />
      <Stack.Screen
        name="AddLectureReminders"
        component={AddLectureRemindersScreen}
      />
    </Stack.Navigator>
  );
};

export default AddCourseNavigator;
