import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const LaunchScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const logoScale = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1.15,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    }, 3000);

    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <LinearGradient
      colors={[theme.primary, theme.accent || '#3a3a3a']}
      style={styles.container}
    >
      <StatusBar hidden />
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: logoScale }] }}>
        <Text style={[styles.logoText, { color: theme.white }]}>ELARO</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 64,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginVertical: 32,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg || 20, // fallback if lg is undefined
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.95,
  },
});

export default LaunchScreen;

