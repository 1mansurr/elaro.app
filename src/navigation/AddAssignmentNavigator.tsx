import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import the screens we'll create
import SelectCourseScreen from '../screens/add-assignment-flow/SelectCourseScreen';
import AssignmentTitleScreen from '../screens/add-assignment-flow/AssignmentTitleScreen';
import AssignmentDescriptionScreen from '../screens/add-assignment-flow/AssignmentDescriptionScreen';
import DueDateScreen from '../screens/add-assignment-flow/DueDateScreen';
import SubmissionMethodScreen from '../screens/add-assignment-flow/SubmissionMethodScreen';
import RemindersScreen from '../screens/add-assignment-flow/RemindersScreen';

export type AddAssignmentStackParamList = {
  SelectCourse: undefined;
  AssignmentTitle: undefined;
  AssignmentDescription: undefined;
  DueDate: undefined;
  SubmissionMethod: undefined;
  Reminders: undefined;
};

const Stack = createStackNavigator<AddAssignmentStackParamList>();

const AddAssignmentNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We will have custom headers/progress bars in each screen
      }}
    >
      <Stack.Screen name="SelectCourse" component={SelectCourseScreen} />
      <Stack.Screen name="AssignmentTitle" component={AssignmentTitleScreen} />
      <Stack.Screen name="AssignmentDescription" component={AssignmentDescriptionScreen} />
      <Stack.Screen name="DueDate" component={DueDateScreen} />
      <Stack.Screen name="SubmissionMethod" component={SubmissionMethodScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
    </Stack.Navigator>
  );
};

export default AddAssignmentNavigator;
