import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateEmail = (text: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'elaro://reset-password',
      });

      if (error) throw error;

      setSent(true);
      Alert.alert(
        'Check Your Email',
        "We've sent you a password reset link. Please check your email and follow the instructions.",
        [{ text: 'OK' }],
      );
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      Alert.alert(
        'Error',
        error.message ||
          'Failed to send password reset email. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const resendEmail = async () => {
    setSent(false);
    await handleResetPassword();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Reset Password
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {!sent ? (
            <>
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary + '20' },
                ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={48}
                  color={theme.primary}
                />
              </View>

              {/* Instructions */}
              <Text style={[styles.title, { color: theme.text }]}>
                Forgot Your Password?
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Enter your email address and we'll send you instructions to
                reset your password.
              </Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Email Address
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.card },
                  ]}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={theme.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="your.email@example.com"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Send Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.primary },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              {/* Back to Sign In */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.goBack()}
                disabled={loading}>
                <Text style={[styles.linkText, { color: theme.primary }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Success Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: '#10B981' + '20' },
                ]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={48}
                  color="#10B981"
                />
              </View>

              {/* Success Message */}
              <Text style={[styles.title, { color: theme.text }]}>
                Email Sent!
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                We've sent a password reset link to:
              </Text>
              <Text style={[styles.emailText, { color: theme.primary }]}>
                {email}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.textSecondary, marginTop: 16 },
                ]}>
                Please check your email and follow the instructions to reset
                your password.
              </Text>

              {/* Resend Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }]}
                onPress={resendEmail}>
                <Text style={styles.buttonText}>Resend Email</Text>
              </TouchableOpacity>

              {/* Back to Sign In */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.goBack()}>
                <Text style={[styles.linkText, { color: theme.primary }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>

              {/* Troubleshooting */}
              <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.primary}
                />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Didn't receive the email? Check your spam folder or try
                  resending.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
});
