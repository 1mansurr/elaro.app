/**
 * @deprecated This navigator is not actively used in the navigation structure.
 * The app currently uses AddAssignmentScreen (single-screen modal) instead of this 6-screen flow.
 * However, this file is kept for type definitions (AddAssignmentStackParamList) which are used
 * by the individual flow screens for their navigation types.
 * 
 * TODO: Either integrate this navigator into the navigation structure or extract the types
 * to a separate file and remove this navigator.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import assignment flow screens
import SelectCourseScreen from '@/features/assignments/screens/add-flow/SelectCourseScreen';
import AssignmentTitleScreen from '@/features/assignments/screens/add-flow/AssignmentTitleScreen';
import AssignmentDescriptionScreen from '@/features/assignments/screens/add-flow/AssignmentDescriptionScreen';
import DueDateScreen from '@/features/assignments/screens/add-flow/DueDateScreen';
import SubmissionMethodScreen from '@/features/assignments/screens/add-flow/SubmissionMethodScreen';
import AssignmentRemindersScreen from '@/features/assignments/screens/add-flow/AssignmentRemindersScreen';

export type AddAssignmentStackParamList = {
  SelectCourse: undefined;
  AssignmentTitle: undefined;
  AssignmentDescription: undefined;
  DueDate: undefined;
  SubmissionMethod: undefined;
  Reminders: undefined;
};

const Stack = createStackNavigator<AddAssignmentStackParamList>();

export const AddAssignmentNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="SelectCourse" 
        component={SelectCourseScreen}
        options={{ title: 'Select Course' }}
      />
      <Stack.Screen 
        name="AssignmentTitle" 
        component={AssignmentTitleScreen}
        options={{ title: 'Assignment Title' }}
      />
      <Stack.Screen 
        name="AssignmentDescription" 
        component={AssignmentDescriptionScreen}
        options={{ title: 'Assignment Description' }}
      />
      <Stack.Screen 
        name="DueDate" 
        component={DueDateScreen}
        options={{ title: 'Due Date' }}
      />
      <Stack.Screen 
        name="SubmissionMethod" 
        component={SubmissionMethodScreen}
        options={{ title: 'Submission Method' }}
      />
      <Stack.Screen 
        name="Reminders" 
        component={AssignmentRemindersScreen}
        options={{ title: 'Reminders' }}
      />
    </Stack.Navigator>
  );
};
