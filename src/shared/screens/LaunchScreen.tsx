import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '@/contexts/AuthContext';
import { RootStackParamList } from '@/types';
import { COLORS } from '@/constants/theme';

type LaunchScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Launch'
>;

const LaunchScreen = () => {
  const { loading, session } = useAuth();
  const navigation = useNavigation<LaunchScreenNavigationProp>();

  useEffect(() => {
    // Wait for auth initialization to complete
    if (!loading) {
      // Let AppNavigator handle routing based on auth state
      // For unauthenticated users, navigate to Auth
      // For authenticated users, AppNavigator will handle onboarding check
      if (!session) {
        // Unauthenticated user - navigate to Auth
        navigation.replace('Auth', {});
      }
      // Authenticated users: AppNavigator will automatically show
      // OnboardingNavigator or Main based on onboarding_completed status
      // No need to navigate here - the navigator handles it
    }
  }, [loading, session, navigation]);

  return (
    <View style={styles.container} testID="launch-screen">
      <ActivityIndicator
        size="large"
        color={COLORS.primary}
        testID="launch-activity-indicator"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default LaunchScreen;
