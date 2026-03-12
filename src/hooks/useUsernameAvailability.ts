export interface UseUsernameAvailabilityReturn {
  username: string;
  setUsername: (username: string) => void;
  isAvailable: boolean | null;
  isChecking: boolean;
  usernameError: string | null;
  checkUsername: (username: string) => void;
  clearAvailabilityState: () => void;
  reset: () => void;
}

export const useUsernameAvailability = (
  _initialUsername?: string,
): UseUsernameAvailabilityReturn => {
  return {
    username: '',
    setUsername: () => {},
    isAvailable: null,
    isChecking: false,
    usernameError: null,
    checkUsername: () => {},
    clearAvailabilityState: () => {},
    reset: () => {},
  };
};
