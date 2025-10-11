import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import the screens we'll create
import SelectCourseScreen from '@/features/studySessions/screens/add-flow/StudySessionSelectCourseScreen';
import StudyTopicScreen from '@/features/studySessions/screens/add-flow/StudyTopicScreen';
import SessionDateScreen from '@/features/studySessions/screens/add-flow/SessionDateScreen';
import SpacedRepetitionScreen from '@/features/studySessions/screens/add-flow/SpacedRepetitionScreen';
import RemindersScreen from '@/features/studySessions/screens/add-flow/StudySessionRemindersScreen';

export type AddStudySessionStackParamList = {
  SelectCourse: undefined;
  StudyTopic: undefined;
  SessionDate: undefined;
  SpacedRepetition: undefined;
  Reminders: undefined;
};

const Stack = createStackNavigator<AddStudySessionStackParamList>();

const AddStudySessionNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We will have custom headers/progress bars in each screen
      }}
    >
      <Stack.Screen name="SelectCourse" component={SelectCourseScreen} />
      <Stack.Screen name="StudyTopic" component={StudyTopicScreen} />
      <Stack.Screen name="SessionDate" component={SessionDateScreen} />
      <Stack.Screen name="SpacedRepetition" component={SpacedRepetitionScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
    </Stack.Navigator>
  );
};

export default AddStudySessionNavigator;
