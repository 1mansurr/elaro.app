import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import NewWelcomeScreen from '@/features/onboarding/screens/NewWelcomeScreen';
import ProfileSetupScreen from '@/features/onboarding/screens/ProfileSetupScreen';
import OnboardingCoursesScreen from '@/features/onboarding/screens/OnboardingCoursesScreen';
import { ProgressHeader } from '@/shared/components';

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
  CourseSetup: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

const TOTAL_STEPS = 3;

const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={NewWelcomeScreen}
        options={{
          header: () => <ProgressHeader currentStep={1} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen 
        name="ProfileSetup" 
        component={ProfileSetupScreen}
        options={{
          header: () => <ProgressHeader currentStep={2} totalSteps={TOTAL_STEPS} />,
        }}
      />
      <Stack.Screen 
        name="CourseSetup" 
        component={OnboardingCoursesScreen}
        options={{
          header: () => <ProgressHeader currentStep={3} totalSteps={TOTAL_STEPS} />,
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
