import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { COLORS } from '@/constants/theme';

type LaunchScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Launch'
>;

const LaunchScreen = () => {
  const navigation = useNavigation<LaunchScreenNavigationProp>();

  useEffect(() => {
    // Always navigate to Main in offline MVP
    navigation.replace('Main');
  }, [navigation]);

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
