export const useOnboardingStatus = () => {
  return {
    needsOnboarding: false,
    isOnboardingComplete: true,
    isAuthenticated: true,
    isLoading: false,
    user: null,
  };
};
