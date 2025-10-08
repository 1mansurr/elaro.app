import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingUsernameScreen from '../screens/onboarding/OnboardingUsernameScreen';
import OnboardingUniversityScreen from '../screens/onboarding/OnboardingUniversityScreen';
import OnboardingCoursesScreen from '../screens/onboarding/OnboardingCoursesScreen';

export type OnboardingStackParamList = {
  OnboardingUsername: undefined;
  OnboardingUniversity: undefined;
  OnboardingCourses: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We will have custom headers in each screen
      }}
    >
      <Stack.Screen name="OnboardingUsername" component={OnboardingUsernameScreen} />
      <Stack.Screen name="OnboardingUniversity" component={OnboardingUniversityScreen} />
      <Stack.Screen name="OnboardingCourses" component={OnboardingCoursesScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
