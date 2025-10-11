import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingUsernameScreen from '@/features/onboarding/screens/OnboardingUsernameScreen';
import OnboardingUniversityScreen from '@/features/onboarding/screens/OnboardingUniversityScreen';
import OnboardingCoursesScreen from '@/features/onboarding/screens/OnboardingCoursesScreen';

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
