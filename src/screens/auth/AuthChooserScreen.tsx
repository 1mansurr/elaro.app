import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as AppleAuthentication from 'expo-apple-authentication'; // <-- CORRECT IMPORT
import Ionicons from '@expo/vector-icons/Ionicons';

import { RootStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type AuthChooserNavProp = StackNavigationProp<RootStackParamList, 'AuthChooser'>;

const AuthChooserScreen = () => {
  const navigation = useNavigation<AuthChooserNavProp>();
  const { signInWithGoogle, signInWithApple, loading } = useAuth();
  
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    const checkAppleAvailability = async () => {
      try {
        // Use the correct async function from expo-apple-authentication
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleAvailable(isAvailable);
      } catch (error) {
        console.error("Error checking Apple availability:", error);
        setIsAppleAvailable(false);
      }
    };
    
    checkAppleAvailability();
  }, []);

  const handleEmailContinue = () => {
    navigation.navigate('Auth');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={28} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Join ELARO</Text>
        <Text style={styles.subtitle}>Create an account to save your progress and unlock all features.</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.oauthButton, styles.googleButton]}
            onPress={signInWithGoogle}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={22} color="white" style={styles.buttonIcon} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Use the correct availability check and render the correct button component */}
          {isAppleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={BORDER_RADIUS.md}
              style={styles.oauthButton}
              onPress={signInWithApple}
            />
          )}

          <View style={styles.separator}>
            <View style={styles.line} />
            <Text style={styles.separatorText}>or</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={[styles.oauthButton, styles.emailButton]}
            onPress={handleEmailContinue}
            disabled={loading}
          >
            <Ionicons name="mail-outline" size={22} color={COLORS.text} style={styles.buttonIcon} />
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.termsText}>
        By continuing, you agree to our{' '}
        <Text style={styles.linkText} onPress={() => Linking.openURL('#')}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.linkText} onPress={() => Linking.openURL('#')}>Privacy Policy</Text>.
      </Text>
    </View>
  );
};

// NOTE: The styles remain largely the same.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.xxl,
    left: SPACING.lg,
    zIndex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.md,
    maxWidth: '85%',
    marginBottom: SPACING.xxl,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  oauthButton: {
    width: '100%',
    height: 50,
    marginBottom: SPACING.md,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  emailButton: {
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  buttonIcon: {
    marginRight: SPACING.md,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: SPACING.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray200,
  },
  separatorText: {
    marginHorizontal: SPACING.md,
    color: COLORS.gray500,
    fontSize: FONT_SIZES.sm,
  },
  termsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray500,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

export default AuthChooserScreen;