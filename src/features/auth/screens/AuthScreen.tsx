import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Input, Button } from '@/shared/components';
import {
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '@/constants/theme';
import { RootStackParamList } from '@/types';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

type AuthScreenNavProp = StackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  onClose?: () => void;
  onAuthSuccess?: () => void;
  mode?: 'signup' | 'signin';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onClose,
  onAuthSuccess,
  mode: initialMode = 'signup',
}) => {
  const navigation = useNavigation<AuthScreenNavProp>();
  const [mode, setMode] = useState(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();

  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text && !emailRegex.test(text)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError('');
    }
    setEmail(text);
  };

  const checkPasswordStrength = (text: string) => {
    let strength = 0;
    if (text.length >= 8) strength++;
    if (text.match(/[a-z]/)) strength++;
    if (text.match(/[A-Z]/)) strength++;
    if (text.match(/[0-9]/)) strength++;
    if (text.match(/[^a-zA-Z0-9]/)) strength++; // Special character
    setPasswordStrength(strength);
    setPassword(text);
  };

  // Password validation checks
  const passwordChecks = {
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
  };

  // Check if password meets all requirements
  const isPasswordValid = () => {
    return password.length >= 8 &&
           passwordChecks.hasLowercase &&
           passwordChecks.hasUppercase &&
           passwordChecks.hasNumber &&
           passwordChecks.hasSpecialChar;
  };

  const handleAuth = async () => {
    if (emailError) {
      Alert.alert('Invalid Email', 'Please correct the email address before proceeding.');
      return;
    }
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (mode === 'signup') {
      if (!firstName.trim()) {
        Alert.alert('First Name is required for sign up.');
        return;
      }
      if (!agreedToTerms) {
        Alert.alert(
          'Agreement Required',
          'You must agree to the Terms of Service and Privacy Policy to sign up.',
        );
        return;
      }
      
      // Check if password meets all requirements
      if (!isPasswordValid()) {
        Alert.alert(
          'Password Requirements Not Met',
          'Your password must meet all requirements:\n• At least 8 characters\n• At least one lowercase letter (a-z)\n• At least one uppercase letter (A-Z)\n• At least one number (0-9)\n• At least one special character (!@#$%...)'
        );
        return;
      }
    }
    setLoading(true);
    try {
      const { error } = mode === 'signup'
        ? await signUp({ 
            email, 
            password, 
            firstName: firstName.trim(), 
            lastName: lastName.trim() 
          })
        : await signIn({ email, password });

      if (error) {
        // Enhanced error handling for password-related errors
        let errorMessage = error.message;
        let errorTitle = 'Authentication Failed';
        
        // Check for various password-related error messages
        if (errorMessage.includes('Password should contain') || 
            errorMessage.includes('password') && errorMessage.includes('weak') ||
            errorMessage.includes('Password is too weak') ||
            errorMessage.includes('password strength')) {
          errorTitle = 'Password Requirements Not Met';
          errorMessage = 'Your password must meet all requirements:\n• At least 8 characters\n• At least one lowercase letter (a-z)\n• At least one uppercase letter (A-Z)\n• At least one number (0-9)\n• At least one special character (!@#$%...)';
        } else if (errorMessage.includes('User already registered')) {
          errorTitle = 'Account Already Exists';
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (errorMessage.includes('Invalid login credentials')) {
          errorTitle = 'Invalid Credentials';
          errorMessage = 'The email or password you entered is incorrect. Please try again.';
        }
        
        Alert.alert(errorTitle, errorMessage);
      } else {
        onAuthSuccess?.();
        navigation.goBack();
      }
    } catch (err) {
      const errorTitle = getErrorTitle(err);
      const errorMessage = mapErrorCodeToMessage(err);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="auth-screen">
      <View style={styles.gradient} testID="auth-container">
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'signup' ? 'Create Account' : 'Sign In with Email'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signup' 
                ? 'Start your journey to academic excellence.' 
                : 'Welcome back! Sign in to continue your progress.'}
            </Text>
          </View>

          <View style={styles.form}>
            {mode === 'signup' && (
              <>
                <Input
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  textContentType="givenName"
                  testID="first-name-input"
                />
                <Input
                  label="Last Name (Optional)"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  textContentType="familyName"
                  testID="last-name-input"
                />
              </>
            )}

            <Input
              label="Email"
              value={email}
              onChangeText={validateEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              testID="email-input"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={checkPasswordStrength}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPassword(!showPassword)}
              testID="password-input"
            />

            {/* Password Requirements Checklist */}
            {mode === 'signup' && password.length > 0 && (
              <View style={styles.passwordRequirements}>
                <Text style={styles.passwordRequirementsTitle}>Password Requirements:</Text>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={passwordChecks.hasLowercase ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordChecks.hasLowercase ? "#34C759" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: passwordChecks.hasLowercase ? "#34C759" : "#FF3B30" }
                  ]}>
                    At least one lowercase letter (a-z)
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={passwordChecks.hasUppercase ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordChecks.hasUppercase ? "#34C759" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: passwordChecks.hasUppercase ? "#34C759" : "#FF3B30" }
                  ]}>
                    At least one uppercase letter (A-Z)
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={passwordChecks.hasNumber ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordChecks.hasNumber ? "#34C759" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: passwordChecks.hasNumber ? "#34C759" : "#FF3B30" }
                  ]}>
                    At least one number (0-9)
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons 
                    name={passwordChecks.hasSpecialChar ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordChecks.hasSpecialChar ? "#34C759" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.requirementText,
                    { color: passwordChecks.hasSpecialChar ? "#34C759" : "#FF3B30" }
                  ]}>
                    At least one special character (!@#$%...)
                  </Text>
                </View>
              </View>
            )}

            {/* Password Strength Indicator */}
            {mode === 'signup' && password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View 
                  style={[
                    styles.strengthBar, 
                    { 
                      width: `${passwordStrength * 20}%`, 
                      backgroundColor: ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#34C759'][passwordStrength - 1] || '#E0E0E0' 
                    }
                  ]} 
                />
              </View>
            )}

            {/* Terms of Service and Privacy Policy Checkbox */}
            {mode === 'signup' && (
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAgreedToTerms(v => !v)}
                activeOpacity={0.8}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: agreedToTerms ? theme.primary : theme.gray300,
                      backgroundColor: agreedToTerms
                        ? theme.primary
                        : theme.white,
                    },
                  ]}>
                  {agreedToTerms && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() =>
                      Linking.openURL('https://elarolearning.com/terms')
                    }>
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() =>
                      Linking.openURL('https://elarolearning.com/privacy')
                    }>
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            )}

            <Button
              title={mode === 'signup' ? 'Create Account' : 'Sign In'}
              onPress={handleAuth}
              loading={loading}
              disabled={mode === 'signup' && !isPasswordValid()}
              style={styles.authButton}
              testID="submit-button"
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              </Text>
              <TouchableOpacity 
                onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                testID="toggle-auth-mode-button">
                <Text style={styles.footerLink}>
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C5EFF',
  },
  gradient: {
    flex: 1,
    backgroundColor: '#2C5EFF',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + 8, // Add extra padding to account for close button
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: '#E3F2FD',
    textAlign: 'center',
    maxWidth: '90%',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  termsText: {
    flex: 1,
    color: '#666666',
    fontSize: FONT_SIZES.sm,
  },
  linkText: {
    color: '#2C5EFF',
    textDecorationLine: 'underline',
  },
  authButton: {
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.md,
    color: '#666666',
  },
  footerLink: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#2C5EFF',
  },
  strengthContainer: {
    height: 5,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginTop: 4,
    marginBottom: 10,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 5,
  },
  passwordRequirements: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: '#F8F9FA',
    borderRadius: BORDER_RADIUS.md,
  },
  passwordRequirementsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: '#333333',
    marginBottom: SPACING.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  requirementText: {
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.xs,
    flex: 1,
  },
});

export default AuthScreen;