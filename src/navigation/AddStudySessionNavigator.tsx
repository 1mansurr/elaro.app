import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import the screens we'll create
import SelectCourseScreen from '../screens/add-study-session-flow/SelectCourseScreen';
import StudyTopicScreen from '../screens/add-study-session-flow/StudyTopicScreen';
import SessionDateScreen from '../screens/add-study-session-flow/SessionDateScreen';
import SpacedRepetitionScreen from '../screens/add-study-session-flow/SpacedRepetitionScreen';
import RemindersScreen from '../screens/add-study-session-flow/RemindersScreen';

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
