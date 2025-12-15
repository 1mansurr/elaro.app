import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/shared/components';
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

interface RouteParams {
  factorId: string;
}

interface MFAVerificationScreenProps {
  route?: {
    params: RouteParams;
  };
  factors?: any[];
  onVerificationSuccess?: (session: any) => void;
  onVerificationError?: (error: string) => void;
  onCancel?: () => void;
}

const MFAVerificationScreen: React.FC<MFAVerificationScreenProps> = ({
  route,
  factors,
  onVerificationSuccess,
  onVerificationError,
  onCancel,
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const factorId = route?.params?.factorId;
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  const handleVerify = async () => {
    if (!code) {
      Alert.alert(
        'Error',
        'Please enter the code from your authenticator app.',
      );
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      if (!factorId) {
        throw new Error('Factor ID is required for MFA verification');
      }
      const { challengeId } = await authService.mfa.challenge(factorId);
      await authService.mfa.verify({ factorId, challengeId, code });

      // On success, refresh user state and let the AuthContext handle navigation
      await refreshUser();

      // The onAuthStateChange listener in AuthContext should handle
      // the rest of the login flow, navigating the user into the main app.
    } catch (error: any) {
      console.error('MFA verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message ||
          'Invalid code. Please check your authenticator app and try again.',
      );
      setCode(''); // Clear the code input for retry
    } finally {
      setIsLoading(false);
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
        edgeSwipeTranslateX.setValue(0);
        edgeSwipeOpacity.setValue(1);
      });
    } else {
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
  const isDark = theme.background === '#101922' || theme.background === '#0A0F14';
  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: textColor }]}>
              Two-Factor Authentication
            </Text>

            <Text style={[styles.description, { color: textSecondaryColor }]}>
              Enter the 6-digit code from your authenticator app to complete
              sign-in.
            </Text>

            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                  color: textColor,
                },
              ]}
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="center"
              placeholderTextColor={textSecondaryColor}
              autoFocus
            />

            <PrimaryButton
              title="Verify Code"
              onPress={handleVerify}
              loading={isLoading}
              disabled={!code || code.length !== 6 || isLoading}
              style={styles.verifyButton}
            />

            <Text style={[styles.helpText, { color: textSecondaryColor }]}>
              Check your authenticator app for the current 6-digit code
            </Text>

            <TouchableOpacity
              style={styles.troubleshootButton}
              onPress={() => {
                Alert.alert(
                  'Troubleshooting',
                  "Make sure your device time is correct and that you're using the right authenticator app for this account.",
                  [{ text: 'OK' }],
                );
              }}>
              <Text
                style={[styles.troubleshootButtonText, { color: COLORS.primary }]}>
                Having trouble?
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.xl,
    letterSpacing: 6,
    minHeight: 60,
    ...SHADOWS.xs,
  },
  verifyButton: {
    marginBottom: SPACING.lg,
  },
  helpText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  troubleshootButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  troubleshootButtonText: {
    fontSize: FONT_SIZES.md,
    textDecorationLine: 'underline',
  },
});

export default MFAVerificationScreen;
