import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { RootStackParamList } from '@/types';
import { getPendingTask } from '@/utils/taskPersistence';

type NavigationProp = StackNavigationProp<RootStackParamList>;

/**
 * Handles navigation based on authentication state changes
 * This component must be rendered inside the NavigationContainer
 */
export const AuthNavigationHandler: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { session, user, loading } = useAuth();

  useEffect(() => {
    // Don't navigate while loading
    if (loading) return;

    // If user is authenticated and has a profile
    if (session?.user && user) {
      const handleNavigation = async () => {
        if (user.onboarding_completed) {
          // User has completed onboarding, go to main app
          navigation.navigate('Main');
        } else {
          // User hasn't completed onboarding
          // Check for pending course
          const pendingTask = await getPendingTask();
          
          // Pre-fill logic for social login users
          let params = {};
          const fullName = session.user?.user_metadata?.full_name;

          if (fullName) {
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            params = { firstName, lastName };
          }
          
          // If there's a pending course, skip to onboarding flow
          if (pendingTask && pendingTask.taskType === 'course') {
            navigation.navigate('OnboardingFlow');
          } else {
            // Navigate to onboarding flow instead of Welcome for authenticated users
            navigation.navigate('OnboardingFlow');
          }
        }
      };

      handleNavigation();
    } else if (!session && !loading) {
      // User is logged out, stay on current screen (Main handles guest state)
      // Don't navigate away, just let the app show guest content
    }
  }, [session, user, loading, navigation]);

  // This component doesn't render anything
  return null;
};

