import React, { useState, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { PrimaryButton, SecondaryButton } from '@/shared/components';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');
const EDGE_SWIPE_THRESHOLD = 50;

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

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

  const resendEmail = async () => {
    setSent(false);
    await handleResetPassword();
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
              {!sent ? (
                <>
                  {/* Icon */}
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          COLORS.primary + (isDark ? '30' : '20'),
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
                    Forgot Your Password?
                  </Text>
                  <Text
                    style={[styles.subtitle, { color: textSecondaryColor }]}>
                    Enter your email address and we'll send you instructions to
                    reset your password.
                  </Text>

                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: textColor }]}>
                      Email Address
                    </Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: surfaceColor,
                          borderColor: borderColor,
                        },
                      ]}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={textSecondaryColor}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: textColor }]}
                        placeholder="your.email@example.com"
                        placeholderTextColor={textSecondaryColor}
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
                  <PrimaryButton
                    title="Send Reset Link"
                    onPress={handleResetPassword}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                  />

                  {/* Back to Sign In */}
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.goBack()}
                    disabled={loading}>
                    <Text style={[styles.linkText, { color: COLORS.primary }]}>
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
                      {
                        backgroundColor: '#10B981' + (isDark ? '30' : '20'),
                      },
                    ]}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={48}
                      color="#10B981"
                    />
                  </View>

                  {/* Success Message */}
                  <Text style={[styles.title, { color: textColor }]}>
                    Email Sent!
                  </Text>
                  <Text
                    style={[styles.subtitle, { color: textSecondaryColor }]}>
                    We've sent a password reset link to:
                  </Text>
                  <Text style={[styles.emailText, { color: COLORS.primary }]}>
                    {email}
                  </Text>
                  <Text
                    style={[
                      styles.subtitle,
                      { color: textSecondaryColor, marginTop: 16 },
                    ]}>
                    Please check your email and follow the instructions to reset
                    your password.
                  </Text>

                  {/* Resend Button */}
                  <PrimaryButton
                    title="Resend Email"
                    onPress={resendEmail}
                    style={styles.button}
                  />

                  {/* Back to Sign In */}
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.goBack()}>
                    <Text style={[styles.linkText, { color: COLORS.primary }]}>
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>

                  {/* Troubleshooting */}
                  <View
                    style={[
                      styles.infoBox,
                      {
                        backgroundColor: surfaceColor,
                        borderColor: borderColor,
                      },
                    ]}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                    <Text
                      style={[styles.infoText, { color: textSecondaryColor }]}>
                      Didn't receive the email? Check your spam folder or try
                      resending.
                    </Text>
                  </View>
                </>
              )}
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
  inputIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
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
  emailText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    gap: SPACING.sm,
    ...SHADOWS.xs,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
