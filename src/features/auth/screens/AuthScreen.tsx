import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Input, PrimaryButton } from '@/shared/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
  COLORS,
} from '@/constants/theme';
import { RootStackParamList } from '@/types';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { LEGAL_URLS } from '@/constants/legal';

type AuthScreenNavProp = StackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  onClose?: () => void;
  onAuthSuccess?: () => void;
  mode?: 'signup' | 'signin';
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
  const insets = useSafeAreaInsets();

  // Import Zod schemas (will work after npm install zod)
  // import { emailSchema, passwordSchema, signUpSchema, signInSchema } from '../../../shared/validation/schemas';

  // Simple handler that just updates the email value while typing
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      // Clear error while typing to prevent shake animation
      if (emailError) {
        setEmailError('');
      }
    },
    [emailError],
  );

  // Validate email only when user leaves the field (on blur)
  const validateEmailOnBlur = useCallback(() => {
    // Validate only when user leaves the field
    try {
      const { emailSchema } = require('../../../shared/validation/schemas');
      const result = emailSchema.safeParse(email);
      if (!result.success && email) {
        setEmailError(result.error.errors[0]?.message || 'Invalid email');
      } else {
        setEmailError('');
      }
    } catch {
      // Fallback to regex if Zod not installed yet
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        setEmailError('Please enter a valid email address.');
      } else {
        setEmailError('');
      }
    }
  }, [email]);

  const checkPasswordStrength = (text: string) => {
    // Still calculate visual strength indicator
    let strength = 0;
    if (text.length >= 8) strength++;
    if (text.match(/[a-z]/)) strength++;
    if (text.match(/[A-Z]/)) strength++;
    if (text.match(/[0-9]/)) strength++;
    if (text.match(/[^a-zA-Z0-9]/)) strength++; // Special character
    setPasswordStrength(strength);
    setPassword(text);
  };

  // Password validation checks (for UI display)
  const passwordChecks = {
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
  };

  // Check if password meets all requirements (using Zod if available)
  const isPasswordValid = () => {
    try {
      const { passwordSchema } = require('../../../shared/validation/schemas');
      return passwordSchema.safeParse(password).success;
    } catch {
      // Fallback if Zod not installed
      return (
        password.length >= 8 &&
        passwordChecks.hasLowercase &&
        passwordChecks.hasUppercase &&
        passwordChecks.hasNumber &&
        passwordChecks.hasSpecialChar
      );
    }
  };

  const handleAuth = async () => {
    // Dismiss keyboard when button is pressed
    Keyboard.dismiss();

    console.log('🔵 [AuthScreen] handleAuth called', {
      mode,
      email: email ? 'provided' : 'missing',
      password: password ? 'provided' : 'missing',
      emailError,
      loading,
    });

    setLoading(true);

    try {
      // Use Zod validation if available
      let useZod = false;
      try {
        console.log('🔍 [AuthScreen] Attempting to load Zod schemas...');
        const {
          signUpSchema,
          signInSchema,
        } = require('../../../shared/validation/schemas');
        useZod = true;
        console.log('✅ [AuthScreen] Zod schemas loaded successfully');

        if (mode === 'signup') {
          const validationResult = signUpSchema.safeParse({
            email,
            password,
            firstName,
            lastName,
            agreedToTerms,
          });

          if (!validationResult.success) {
            const errors = validationResult.error.flatten().fieldErrors;
            const firstError = Object.values(errors)[0]?.[0];
            console.log('❌ [AuthScreen] Signup validation failed:', errors);
            Alert.alert(
              'Validation Error',
              firstError || 'Please check your input',
            );
            setLoading(false);
            return;
          }
          console.log('✅ [AuthScreen] Signup validation passed');
        } else {
          // Sign in
          console.log('🔍 [AuthScreen] Running signin validation...');
          const validationResult = signInSchema.safeParse({ email, password });
          console.log('🔍 [AuthScreen] Signin validation result:', {
            success: validationResult.success,
            hasEmail: !!email,
            hasPassword: !!password,
          });

          if (!validationResult.success) {
            const errors = validationResult.error.flatten().fieldErrors;
            const firstError = Object.values(errors)[0]?.[0];
            console.log('❌ [AuthScreen] Signin validation failed:', errors);
            Alert.alert(
              'Validation Error',
              firstError || 'Please check your input',
            );
            setLoading(false);
            return;
          }
          console.log('✅ [AuthScreen] Signin validation passed');
        }
      } catch (error) {
        // Zod not available, use fallback validation
        console.log(
          '⚠️ [AuthScreen] Zod not available, using fallback validation:',
          error,
        );
        useZod = false;
        if (emailError) {
          console.log('❌ [AuthScreen] Email error detected:', emailError);
          Alert.alert(
            'Invalid Email',
            'Please correct the email address before proceeding.',
          );
          setLoading(false);
          return;
        }
        if (!email || !password) {
          console.log('❌ [AuthScreen] Missing fields:', {
            email: !!email,
            password: !!password,
          });
          Alert.alert('Missing Fields', 'Please fill in all required fields.');
          setLoading(false);
          return;
        }
        if (mode === 'signup') {
          if (!firstName.trim()) {
            Alert.alert('First Name is required for sign up.');
            setLoading(false);
            return;
          }
          if (!agreedToTerms) {
            Alert.alert(
              'Agreement Required',
              'You must agree to the Terms of Service and Privacy Policy to sign up.',
            );
            setLoading(false);
            return;
          }
          if (!isPasswordValid()) {
            Alert.alert(
              'Password Requirements Not Met',
              'Your password must meet all requirements:\n• At least 8 characters\n• At least one lowercase letter (a-z)\n• At least one uppercase letter (A-Z)\n• At least one number (0-9)\n• At least one special character (!@#$%...)',
            );
            setLoading(false);
            return;
          }
        }
        console.log('✅ [AuthScreen] Fallback validation passed');
      }

      // Proceed with authentication
      console.log('🚀 [AuthScreen] Proceeding with authentication...', {
        mode,
      });
      const { error } =
        mode === 'signup'
          ? await signUp({
              email,
              password,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            })
          : await signIn({ email, password });

      console.log(
        '📋 [AuthScreen] Auth result:',
        error ? `Error: ${error.message}` : 'Success',
      );

      if (error) {
        // Enhanced error handling for password-related errors
        let errorMessage = error.message;
        let errorTitle = 'Authentication Failed';

        // Check for various password-related error messages
        if (
          errorMessage.includes('Password should contain') ||
          (errorMessage.includes('password') &&
            errorMessage.includes('weak')) ||
          errorMessage.includes('Password is too weak') ||
          errorMessage.includes('password strength')
        ) {
          errorTitle = 'Password Requirements Not Met';
          errorMessage =
            'Your password must meet all requirements:\n• At least 8 characters\n• At least one lowercase letter (a-z)\n• At least one uppercase letter (A-Z)\n• At least one number (0-9)\n• At least one special character (!@#$%...)';
        } else if (errorMessage.includes('User already registered')) {
          errorTitle = 'Account Already Exists';
          errorMessage =
            'An account with this email already exists. Please sign in instead.';
        } else if (errorMessage.includes('Invalid login credentials')) {
          errorTitle = 'Invalid Credentials';
          errorMessage =
            'The email or password you entered is incorrect. Please try again.';
        }

        Alert.alert(errorTitle, errorMessage);
        setLoading(false); // Stop loading on error so button returns to normal
        return; // Return early to prevent navigation
      } else {
        if (mode === 'signup') {
          Alert.alert(
            'Check your email',
            'We sent a confirmation link to your email. Verifying your email helps keep your account secure, but you can continue using the app right away.',
          );
        }

        // Wait for session to be set in AuthContext and propagate to AppNavigator
        // Increased wait time to ensure AppNavigator has time to detect session change
        await new Promise(resolve => setTimeout(resolve, 800));

        // Call onAuthSuccess callback if provided
        onAuthSuccess?.();

        // Don't try to navigate back - let AppNavigator handle the switch automatically
        // The AppNavigator will detect the session change and switch to AuthenticatedNavigator
        // This is more reliable than trying to navigate back, especially when Auth is the initial route
        console.log('✅ [AuthScreen] Auth successful, waiting for AppNavigator to switch...');
      }
    } catch (err) {
      console.error('❌ [AuthScreen] handleAuth error caught:', err);
      const errorTitle = getErrorTitle(err);
      const errorMessage = mapErrorCodeToMessage(err);
      console.log('📢 [AuthScreen] Showing error alert:', {
        errorTitle,
        errorMessage,
      });
      Alert.alert(errorTitle, errorMessage);
    } finally {
      console.log(
        '🏁 [AuthScreen] handleAuth finally block - setting loading to false',
      );
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      testID="auth-screen">
      <View style={styles.gradient} testID="auth-container">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          bounces={false}>
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
              onChangeText={handleEmailChange}
              onBlur={validateEmailOnBlur}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              animated={false}
              returnKeyType="next"
              blurOnSubmit={false}
              textContentType="username"
              autoComplete="email"
              testID="email-input"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={checkPasswordStrength}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                // Explicitly prevent auto-submit - user must tap button
                // Just dismiss keyboard, don't submit
                Keyboard.dismiss();
              }}
              textContentType="password"
              autoComplete="password"
              testID="password-input"
            />

            {/* Password Requirements Checklist */}
            {mode === 'signup' && password.length > 0 && (
              <View style={styles.passwordRequirements}>
                <Text style={styles.passwordRequirementsTitle}>
                  Password Requirements:
                </Text>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={
                      passwordChecks.hasLowercase
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={16}
                    color={passwordChecks.hasLowercase ? '#34C759' : '#FF3B30'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: passwordChecks.hasLowercase
                          ? '#34C759'
                          : '#FF3B30',
                      },
                    ]}>
                    At least one lowercase letter (a-z)
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={
                      passwordChecks.hasUppercase
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={16}
                    color={passwordChecks.hasUppercase ? '#34C759' : '#FF3B30'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: passwordChecks.hasUppercase
                          ? '#34C759'
                          : '#FF3B30',
                      },
                    ]}>
                    At least one uppercase letter (A-Z)
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={
                      passwordChecks.hasNumber
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={16}
                    color={passwordChecks.hasNumber ? '#34C759' : '#FF3B30'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: passwordChecks.hasNumber ? '#34C759' : '#FF3B30',
                      },
                    ]}>
                    At least one number (0-9)
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={
                      passwordChecks.hasSpecialChar
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={16}
                    color={
                      passwordChecks.hasSpecialChar ? '#34C759' : '#FF3B30'
                    }
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      {
                        color: passwordChecks.hasSpecialChar
                          ? '#34C759'
                          : '#FF3B30',
                      },
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
                      backgroundColor:
                        ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#34C759'][
                          passwordStrength - 1
                        ] || '#E0E0E0',
                    },
                  ]}
                />
              </View>
            )}

            {/* Terms of Service and Privacy Policy Checkbox */}
            {mode === 'signup' && (
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAgreedToTerms(v => !v)}
                activeOpacity={0.8}
                accessibilityLabel="Agree to terms and privacy policy"
                accessibilityHint={
                  agreedToTerms
                    ? 'Uncheck to disagree'
                    : 'Check to agree to terms and privacy policy'
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedToTerms }}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: agreedToTerms
                        ? theme.primary
                        : theme.gray300,
                      backgroundColor: agreedToTerms
                        ? theme.primary
                        : theme.white,
                    },
                  ]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() =>
                      Linking.openURL(LEGAL_URLS.TERMS_OF_SERVICE)
                    }>
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() => Linking.openURL(LEGAL_URLS.PRIVACY_POLICY)}>
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            )}

            <PrimaryButton
              title={mode === 'signup' ? 'Create Account' : 'Sign In'}
              onPress={handleAuth}
              loading={loading}
              disabled={mode === 'signup' && !isPasswordValid()}
              style={styles.authButton}
              testID="submit-button"
            />

            {/* Forgot Password Link - Only show for signin mode */}
            {mode === 'signin' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotPasswordContainer}
                testID="forgot-password-button"
                accessibilityLabel="Forgot password"
                accessibilityHint="Navigate to password reset screen"
                accessibilityRole="button">
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {mode === 'signup'
                  ? 'Already have an account?'
                  : "Don't have an account?"}{' '}
              </Text>
              <TouchableOpacity
                onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                testID="toggle-auth-mode-button"
                accessibilityLabel={
                  mode === 'signup' ? 'Switch to sign in' : 'Switch to sign up'
                }
                accessibilityHint="Toggles between sign in and sign up modes"
                accessibilityRole="button">
                <Text style={styles.footerLink}>
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
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
  scrollContent: {
    flexGrow: 1,
    minHeight: SCREEN_HEIGHT,
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl + 100, // Extra bottom padding for keyboard
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
    ...SHADOWS.xl,
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
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  forgotPasswordText: {
    fontSize: FONT_SIZES.sm,
    color: '#2C5EFF',
    fontWeight: FONT_WEIGHTS.medium as any,
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
    ...SHADOWS.xs,
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
