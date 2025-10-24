import { useAuth } from '@/features/auth/contexts/AuthContext';

/**
 * Hook to check onboarding status and provide related utilities
 * 
 * @returns Object containing onboarding status information
 */
export const useOnboardingStatus = () => {
  const { user, loading } = useAuth();
  
  const needsOnboarding = user && !user.onboarding_completed;
  const isOnboardingComplete = user && user.onboarding_completed;
  const isAuthenticated = !!user;
  
  return {
    needsOnboarding,
    isOnboardingComplete,
    isAuthenticated,
    isLoading: loading,
    user,
  };
};
