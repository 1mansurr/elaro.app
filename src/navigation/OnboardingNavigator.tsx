import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '@/features/onboarding/screens/WelcomeScreen';
import ProfileSetupScreen from '@/features/onboarding/screens/ProfileSetupScreen';
import { ProgressHeader } from '@/shared/components';

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

const TOTAL_STEPS = 2;

const OnboardingNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
      }}
      initialRouteName="Welcome">
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          header: () => (
            <ProgressHeader currentStep={1} totalSteps={TOTAL_STEPS} />
          ),
        }}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{
          header: () => (
            <ProgressHeader currentStep={2} totalSteps={TOTAL_STEPS} />
          ),
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
