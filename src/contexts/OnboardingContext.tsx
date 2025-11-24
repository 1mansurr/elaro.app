import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { Course } from '@/types';

// Define the shape of our onboarding data
interface OnboardingData {
  username: string;
  country: string;
  university: string;
  program: string;
  courses: Course[];
  dateOfBirth: string;
  hasParentalConsent: boolean;
  marketingOptIn: boolean;
}

// Define the shape of the context value
interface OnboardingContextType {
  onboardingData: OnboardingData;
  updateOnboardingData: (updates: Partial<OnboardingData>) => void;
  resetOnboardingData: () => void;
}

// Create the context
const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

// Define the initial state
const initialState: OnboardingData = {
  username: '',
  country: '',
  university: '',
  program: '',
  courses: [],
  dateOfBirth: '',
  hasParentalConsent: false,
  marketingOptIn: false,
};

// Create the provider component
export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [onboardingData, setOnboardingData] =
    useState<OnboardingData>(initialState);

  const updateOnboardingData = useCallback(
    (updates: Partial<OnboardingData>) => {
      setOnboardingData(prevData => ({ ...prevData, ...updates }));
    },
    [],
  );

  const resetOnboardingData = useCallback(() => {
    setOnboardingData(initialState);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      onboardingData,
      updateOnboardingData,
      resetOnboardingData,
    }),
    [onboardingData, updateOnboardingData, resetOnboardingData],
  );

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
