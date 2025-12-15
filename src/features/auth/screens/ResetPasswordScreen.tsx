import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  GestureHandlerGestureEvent,
  GestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { PrimaryButton } from '@/shared/components';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';
import { RootStackParamList } from '@/types';

const { width: screenWidth } = Dimensions.get('window');
const EDGE_SWIPE_THRESHOLD = 50;

type ResetPasswordScreenNavProp = StackNavigationProp<
  RootStackParamList,
  'ResetPassword'
>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<ResetPasswordScreenNavProp>();
  const route = useRoute();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

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

  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    const tx = typeof translationX === 'number' ? translationX : 0;
    if (tx < -EDGE_SWIPE_THRESHOLD) {
      const progress = Math.min(1, Math.abs(tx) / screenWidth);
      edgeSwipeTranslateX.setValue(tx);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    const { translationX } = event.nativeEvent;
    const tx = typeof translationX === 'number' ? translationX : 0;
    if (Math.abs(tx) > EDGE_SWIPE_THRESHOLD) {
      // Animate out and go back
      Animated.parallel([
        Animated.timing(edgeSwipeTranslateX, {
          toValue: -screenWidth,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(edgeSwipeOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.goBack();
        // Reset
        edgeSwipeTranslateX.setValue(0);
        edgeSwipeOpacity.setValue(1);
      });
    } else {
      // Snap back
      Animated.parallel([
        Animated.spring(edgeSwipeTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
        }),
        Animated.spring(edgeSwipeOpacity, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
        }),
      ]).start();
    }
  };

  // Light mode default colors
  const isDark =
    theme.background === '#101922' || theme.background === '#0A0F14';
  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

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
    <PanGestureHandler
      onGestureEvent={handleEdgeSwipe}
      onHandlerStateChange={handleEdgeSwipeEnd}
      activeOffsetX={-10}
      failOffsetY={[-10, 10]}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
            transform: [{ translateX: edgeSwipeTranslateX }],
            opacity: edgeSwipeOpacity,
          },
        ]}>
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: bgColor }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  backgroundColor: bgColor,
                  borderBottomColor: borderColor,
                  paddingTop: SPACING.md,
                },
              ]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="arrow-back" size={20} color={textColor} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                Reset Password
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: COLORS.primary + (isDark ? '30' : '20'),
                  },
                ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={48}
                  color={COLORS.primary}
                />
              </View>

              {/* Instructions */}
              <Text style={[styles.title, { color: textColor }]}>
                Create New Password
              </Text>
              <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
                Enter your new password below. Make sure it's at least 8
                characters long.
              </Text>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: textColor }]}>
                  New Password
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: borderColor,
                    },
                  ]}>
                  <TextInput
                    style={[styles.input, { color: textColor }]}
                    placeholder="Enter new password"
                    placeholderTextColor={textSecondaryColor}
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
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: textColor }]}>
                  Confirm Password
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: surfaceColor,
                      borderColor: borderColor,
                    },
                  ]}>
                  <TextInput
                    style={[styles.input, { color: textColor }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={textSecondaryColor}
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
                      name={
                        showConfirmPassword ? 'eye-off-outline' : 'eye-outline'
                      }
                      size={20}
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reset Button */}
              <PrimaryButton
                title="Update Password"
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
                style={styles.button}
              />

              {/* Back to Sign In */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Auth', { mode: 'signin' })}
                disabled={loading}>
                <Text style={[styles.linkText, { color: COLORS.primary }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 56,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    marginBottom: SPACING.md,
  },
  linkButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  linkText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
