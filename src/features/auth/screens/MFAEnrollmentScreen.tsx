import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import QRCode from 'react-native-qrcode-svg';
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

const MFAEnrollmentScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const { refreshUser } = useAuth();

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const startEnrollment = async () => {
      try {
        setIsLoading(true);
        const enrollmentData = await authService.mfa.enroll();
        setQrCode(enrollmentData.qrCode);
        setSecret(enrollmentData.secret);
        setFactorId(enrollmentData.factorId);
      } catch (error: any) {
        console.error('MFA enrollment error:', error);
        Alert.alert(
          'Enrollment Failed',
          error.message || 'Could not start MFA enrollment. Please try again.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    startEnrollment();
  }, []);

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

  const handleVerify = async () => {
    if (!factorId || !code) {
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

    setIsVerifying(true);
    try {
      const { challengeId } = await authService.mfa.challenge(factorId);
      await authService.mfa.verify({ factorId, challengeId, code });

      Alert.alert(
        'Success!',
        'MFA has been enabled successfully! Your account is now more secure.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await refreshUser();
              // Navigate back to settings or profile screen
              // This would typically be handled by navigation
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('MFA verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message ||
          'Invalid code. Please check your authenticator app and try again.',
      );
      setCode(''); // Clear the code input
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
          },
        ]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Setting up MFA...
        </Text>
      </View>
    );
  }

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
          <ScrollView contentContainerStyle={styles.scrollContainer}>
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
                Enable MFA
              </Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={[styles.title, { color: textColor }]}>
              Enable Two-Factor Authentication
            </Text>

            <Text style={[styles.description, { color: textSecondaryColor }]}>
              Scan the QR code below with your authenticator app to set up
              two-factor authentication.
            </Text>

            {qrCode && (
              <View
                style={[
                  styles.qrContainer,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: borderColor,
                  },
                ]}>
                <QRCode
                  value={qrCode}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            )}

            {secret && (
              <View
                style={[
                  styles.secretContainer,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: borderColor,
                  },
                ]}>
                <Text style={[styles.secretLabel, { color: textColor }]}>
                  Or enter this secret key manually:
                </Text>
                <Text
                  style={[styles.secretText, { color: COLORS.primary }]}
                  selectable>
                  {secret}
                </Text>
              </View>
            )}

            <Text style={[styles.instructionText, { color: textColor }]}>
              After scanning the QR code or entering the secret key, enter the
              6-digit code from your authenticator app below:
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
            />

            <PrimaryButton
              title="Verify and Enable MFA"
              onPress={handleVerify}
              loading={isVerifying}
              disabled={!code || code.length !== 6 || isVerifying}
              style={styles.verifyButton}
            />

            <Text style={[styles.helpText, { color: textSecondaryColor }]}>
              Popular authenticator apps: Google Authenticator, Authy, Microsoft
              Authenticator, or 1Password
            </Text>
          </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
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
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  secretContainer: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  secretLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
  },
  secretText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.lg,
    letterSpacing: 4,
    ...SHADOWS.xs,
  },
  verifyButton: {
    marginBottom: SPACING.lg,
  },
  helpText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MFAEnrollmentScreen;
