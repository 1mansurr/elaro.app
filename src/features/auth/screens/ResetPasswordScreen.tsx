import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { RootStackParamList } from '@/types';

type ResetPasswordScreenNavProp = StackNavigationProp<
  RootStackParamList,
  'ResetPassword'
>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordScreenNavProp>();
  const route = useRoute();
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if we have a valid session for password reset
  useEffect(() => {
    // Supabase automatically handles the token from the deep link
    // Listen for auth state changes to detect when session is set up
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User has clicked the password reset link
        // Session should now be available
        console.log('Password recovery event detected');
      } else if (event === 'SIGNED_IN' && session) {
        // User session is now available
        console.log('Session available for password reset');
      }
    });

    // Also check current session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Don't show error immediately - Supabase might still be processing the token
      // Give it a moment to set up the session
      setTimeout(async () => {
        const {
          data: { session: delayedSession },
        } = await supabase.auth.getSession();
        if (!delayedSession) {
          // If still no session after delay, the link might be invalid or expired
          Alert.alert(
            'Invalid Link',
            'This password reset link is invalid or has expired. Please request a new one.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Auth', { mode: 'signin' }),
              },
            ],
          );
        }
      }, 2000); // Wait 2 seconds for Supabase to process the token
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigation]);

  const validatePassword = (): boolean => {
    if (!password || password.length < 8) {
      Alert.alert(
        'Invalid Password',
        'Password must be at least 8 characters long.',
      );
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert(
        'Password Updated',
        'Your password has been successfully updated. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Auth', { mode: 'signin' }),
          },
        ],
      );
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert(
        'Error',
        error.message ||
          'Failed to reset password. The link may have expired. Please request a new one.',
      );
    } finally {
      setLoading(false);
    }
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
            Create New Password
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your new password below. Make sure it's at least 8 characters
            long.
          </Text>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>
              New Password
            </Text>
            <View
              style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter new password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>
              Confirm Password
            </Text>
            <View
              style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Reset Button */}
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
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </TouchableOpacity>

          {/* Back to Sign In */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Auth', { mode: 'signin' })}
            disabled={loading}>
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
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
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
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
});
