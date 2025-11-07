import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Factor } from '@supabase/supabase-js';
import MFAVerificationScreen from './MFAVerificationScreen';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';

interface EnhancedAuthScreenProps {
  onClose?: () => void;
  onAuthSuccess?: () => void;
  mode?: 'signup' | 'signin';
}

export default function EnhancedAuthScreen({
  onClose,
  onAuthSuccess,
  mode: initialMode = 'signup',
}: EnhancedAuthScreenProps) {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // MFA state
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([]);
  const [loginCredentials, setLoginCredentials] = useState({
    email: '',
    password: '',
  });

  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();

  // Password validation functions
  const checkPasswordStrength = (text: string) => {
    let strength = 0;
    if (text.length >= 8) strength++;
    if (text.match(/[a-z]/)) strength++;
    if (text.match(/[A-Z]/)) strength++;
    if (text.match(/[0-9]/)) strength++;
    if (text.match(/[^a-zA-Z0-9]/)) strength++;
    setPasswordStrength(strength);
    setPassword(text);
  };

  const passwordChecks = {
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
  };

  const isPasswordValid = () => {
    return (
      password.length >= 8 &&
      passwordChecks.hasLowercase &&
      passwordChecks.hasUppercase &&
      passwordChecks.hasNumber &&
      passwordChecks.hasSpecialChar
    );
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (currentMode === 'signup') {
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
          'Your password must meet all requirements:\n• At least 8 characters\n• At least one lowercase letter (a-z)\n• At least one uppercase letter (A-Z)\n• At least one number (0-9)\n• At least one special character (!@#$%...)',
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (currentMode === 'signup') {
        const { error } = await signUp({
          email,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });

        if (error) {
          // Enhanced error handling
          let errorMessage = error.message;
          let errorTitle = 'Authentication Failed';

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
          }

          Alert.alert(errorTitle, errorMessage);
        } else {
          Alert.alert(
            'Verify your email',
            'We sent a confirmation link to your email. You can continue using the app once verified.',
          );
          onAuthSuccess?.();
        }
      } else {
        // Handle sign in with potential MFA
        const result = await signIn({ email, password });

        if (result.error) {
          let errorMessage = result.error.message;
          let errorTitle = 'Authentication Failed';

          if (errorMessage.includes('Invalid login credentials')) {
            errorTitle = 'Invalid Credentials';
            errorMessage =
              'The email or password you entered is incorrect. Please try again.';
          }

          Alert.alert(errorTitle, errorMessage);
        } else if (result.requiresMFA && result.factors) {
          // Store credentials and show MFA verification
          setLoginCredentials({ email, password });
          setMfaFactors(result.factors);
          setShowMFAVerification(true);
        } else {
          // Regular login successful
          onAuthSuccess?.();
        }
      }
    } catch (error: any) {
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = (session: any) => {
    setShowMFAVerification(false);
    onAuthSuccess?.();
  };

  const handleMFAError = (error: string) => {
    setShowMFAVerification(false);
    Alert.alert('MFA Verification Failed', error);
  };

  const handleMFACancel = () => {
    setShowMFAVerification(false);
    setLoginCredentials({ email: '', password: '' });
    setMfaFactors([]);
  };

  if (showMFAVerification) {
    return (
      <MFAVerificationScreen
        factors={mfaFactors}
        onVerificationSuccess={handleMFASuccess}
        onVerificationError={handleMFAError}
        onCancel={handleMFACancel}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {currentMode === 'signup' ? 'Create Account' : 'Sign In'}
          </Text>
          <Text style={styles.subtitle}>
            {currentMode === 'signup'
              ? 'Join ELARO to organize your studies'
              : 'Welcome back to ELARO'}
          </Text>
        </View>

        <View style={styles.form}>
          {currentMode === 'signup' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={checkPasswordStrength}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements Checklist */}
          {currentMode === 'signup' && password.length > 0 && (
            <>
              <View style={styles.passwordRequirements}>
                <Text style={styles.passwordRequirementsTitle}>
                  Password Requirements:
                </Text>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={
                      password.length >= 8 ? 'checkmark-circle' : 'close-circle'
                    }
                    size={16}
                    color={password.length >= 8 ? '#34C759' : '#FF3B30'}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      { color: password.length >= 8 ? '#34C759' : '#FF3B30' },
                    ]}>
                    At least 8 characters
                  </Text>
                </View>
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

              {/* Password Strength Bar */}
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
            </>
          )}

          {currentMode === 'signup' && (
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}>
                <View
                  style={[
                    styles.checkbox,
                    agreedToTerms && styles.checkboxChecked,
                  ]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.link}>Terms of Service</Text> and{' '}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.authButton,
              (loading || (currentMode === 'signup' && !isPasswordValid())) &&
                styles.disabledButton,
            ]}
            onPress={handleAuth}
            disabled={
              loading || (currentMode === 'signup' && !isPasswordValid())
            }>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>
                {currentMode === 'signup' ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() =>
              setCurrentMode(currentMode === 'signup' ? 'signin' : 'signup')
            }
            disabled={loading}>
            <Text style={styles.switchModeText}>
              {currentMode === 'signup'
                ? 'Already have an account? Sign In'
                : 'Need an account? Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>

        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },
  strengthContainer: {
    height: 5,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginTop: 8,
    marginBottom: 12,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 5,
  },
  passwordRequirements: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  passwordRequirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  link: {
    color: '#007AFF',
    fontWeight: '500',
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
