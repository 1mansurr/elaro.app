import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import ConfettiCannon from 'react-native-confetti-cannon';

import { RootStackParamList } from '../../types';
import { Button } from '../../components/Button';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../../constants/theme';

type WelcomeScreenNavProp = StackNavigationProp<RootStackParamList, 'Welcome'>;
type WelcomeScreenRouteProp = RouteProp<RootStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavProp>();
  const route = useRoute<WelcomeScreenRouteProp>();

  const handleContinue = () => {
    // Pass the name params along to the onboarding form
    navigation.replace('OnboardingForm', {
      firstName: route.params?.firstName,
      lastName: route.params?.lastName,
    });
  };

  return (
    <View style={styles.container}>
      <ConfettiCannon
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={true}
        fadeOut={true}
        explosionSpeed={400}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to ELARO!</Text>
        <Text style={styles.subtitle}>Let's set up your academic co-pilot.</Text>
      </View>
      <Button title="Let's Go..." onPress={handleContinue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  title: {
    fontWeight: FONT_WEIGHTS.bold as any,
    fontSize: FONT_SIZES.xxl,
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: FONT_WEIGHTS.normal as any,
    fontSize: FONT_SIZES.lg,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});

export default WelcomeScreen;
