import React, { Suspense, lazy } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import WelcomeScreen from '@/features/onboarding/screens/WelcomeScreen';
import ProfileSetupScreen from '@/features/onboarding/screens/ProfileSetupScreen';
import OnboardingCoursesScreen from '@/features/onboarding/screens/OnboardingCoursesScreen';
import { ProgressHeader } from '@/shared/components';
import { AddCourseProvider } from '@/features/courses/contexts/AddCourseContext';
import AddCourseNavigator from './AddCourseNavigator';

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
  CourseSetup: undefined;
  AddCourseFlow: undefined;
};

const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

// AddCourse Flow Wrapper with Provider
const AddCourseFlow = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AddCourseProvider>
      <AddCourseNavigator />
    </AddCourseProvider>
  </Suspense>
);

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
      <Stack.Screen
        name="CourseSetup"
        component={OnboardingCoursesScreen}
        options={{
          header: () => (
            <ProgressHeader currentStep={3} totalSteps={TOTAL_STEPS} />
          ),
        }}
      />
      <Stack.Screen
        name="AddCourseFlow"
        component={AddCourseFlow}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
