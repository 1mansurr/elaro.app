import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../constants/theme';

interface AuthScreenProps {
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onClose, onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.primary,
    },
    gradient: {
      flex: 1,
      backgroundColor: theme.primary,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    title: {
      fontSize: FONT_SIZES.xxxl,
      fontWeight: FONT_WEIGHTS.bold as any,
      textAlign: 'center',
      marginBottom: SPACING.xs,
      color: theme.white,
    },
    form: {
      backgroundColor: theme.white,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      elevation: 8,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    inputContainer: {
      marginBottom: SPACING.md,
    },
    label: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.medium as any,
      color: theme.textPrimary,
      marginBottom: SPACING.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      fontSize: FONT_SIZES.md,
      backgroundColor: theme.white,
      color: theme.textPrimary,
    },
    authButton: {
      marginTop: SPACING.lg,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    authButtonDisabled: {
      opacity: 0.6,
    },
    authButtonText: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.bold as any,
    },
    switchButton: {
      marginTop: SPACING.md,
      alignItems: 'center',
    },
    switchButtonText: {
      fontSize: FONT_SIZES.sm,
      fontWeight: FONT_WEIGHTS.medium as any,
    },
    cancelText: {
      fontSize: FONT_SIZES.sm,
      textAlign: 'center',
      marginTop: SPACING.md,
    },
  });

  // Move AuthInput here so it can access styles
  const AuthInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    secure = false,
    keyboardType = 'default',
    autoCapitalize = 'none',
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    secure?: boolean;
    keyboardType?: 'default' | 'email-address';
    autoCapitalize?: 'none' | 'words';
  }) => {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.gray400}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
    );
  };

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !name)) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (isSignUp && !agreedToTerms) {
      Alert.alert('Agreement Required', 'You must agree to the Terms of Service and Privacy Policy to sign up.');
      return;
    }
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password, name)
        : await signIn(email, password);

      if (error) {
        Alert.alert('Authentication Failed', error.message);
      } else {
        onAuthSuccess?.();
        onClose();
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Let's Save Your Journey</Text>
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <AuthInput
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            )}

            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
            />

            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secure
            />

            {/* Terms of Service and Privacy Policy Checkbox */}
            {isSignUp && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                onPress={() => setAgreedToTerms(v => !v)}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: agreedToTerms ? theme.primary : theme.gray300,
                    backgroundColor: agreedToTerms ? theme.primary : theme.white,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  {agreedToTerms && (
                    <Text style={{ color: theme.white, fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                  )}
                </View>
                <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 14 }}>
                  I agree to the{' '}
                  <Text
                    style={{ color: theme.primary, textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL('https://elarolearning.com/terms')}
                  >
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text
                    style={{ color: theme.primary, textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL('https://elarolearning.com/privacy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled, { backgroundColor: theme.primary }]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.white} />
              ) : (
                <Text style={[styles.authButtonText, { color: theme.white }]}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={[styles.switchButtonText, { color: theme.primary }]}>
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

