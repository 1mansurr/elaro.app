import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Course } from '../types'; // Assuming Course type is available

// Define the shape of our onboarding data
interface OnboardingData {
  username: string;
  university: string;
  program: string;
  courses: Course[];
}

// Define the shape of the context value
interface OnboardingContextType {
  onboardingData: OnboardingData;
  updateOnboardingData: (updates: Partial<OnboardingData>) => void;
  resetOnboardingData: () => void;
}

// Create the context
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Define the initial state
const initialState: OnboardingData = {
  username: '',
  university: '',
  program: '',
  courses: [],
};

// Create the provider component
export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialState);

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prevData => ({ ...prevData, ...updates }));
  };

  const resetOnboardingData = () => {
    setOnboardingData(initialState);
  };

  const value = {
    onboardingData,
    updateOnboardingData,
    resetOnboardingData,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Create the custom hook to use the context
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
