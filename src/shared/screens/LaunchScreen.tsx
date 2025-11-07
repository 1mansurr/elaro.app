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
  const { loading } = useAuth();
  const navigation = useNavigation<LaunchScreenNavigationProp>();

  useEffect(() => {
    // This effect runs when the `loading` state from AuthContext changes.
    // `loading` is true while Supabase checks for a session, and false once it's done.
    if (!loading) {
      // Once the check is complete, navigate to the main app interface.
      // This works for both logged-in users (who will have a session)
      // and guest users (who won't). The rest of the app already handles
      // the guest state UI.
      navigation.replace('Main');
    }
  }, [loading, navigation]);

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
