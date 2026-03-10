import { useNavigationState } from '@react-navigation/native';

export const useScreenTracking = () => {
  // Call hook unconditionally at the top level (React Hooks rule)
  useNavigationState(state => state);
  // analytics removed
};
