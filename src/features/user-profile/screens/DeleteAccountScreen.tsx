import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
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
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, SecondaryButton } from '@/shared/components';
import { supabase } from '@/services/supabase';
import { AppError } from '@/utils/AppError';
import { showToast } from '@/utils/showToast';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { RootStackParamList } from '@/types/navigation';
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

const DeleteAccountScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Edge swipe gesture handlers
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    if (translationX < -EDGE_SWIPE_THRESHOLD) {
      const progress = Math.min(1, Math.abs(translationX) / screenWidth);
      edgeSwipeTranslateX.setValue(translationX);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    const { translationX } = event.nativeEvent;
    if (Math.abs(translationX) > EDGE_SWIPE_THRESHOLD) {
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
  const bgColor = theme.isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = theme.isDark ? '#1C252E' : '#FFFFFF';
  const textColor = theme.isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = theme.isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = theme.isDark ? '#374151' : '#E5E7EB';

  const isConfirmationValid =
    confirmationText.trim().toUpperCase() === 'DELETE';
  const canDelete = isConfirmationValid && hasAcknowledged;

  const handleDeleteAccount = async () => {
    if (!canDelete) return;

    Alert.alert(
      '⚠️ Final Confirmation',
      'This is your last chance. Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted after 7 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Call the deletion function
              // The backend will sign out the user (see soft-delete-account function),
              // which will trigger onAuthStateChange and AppNavigator will
              // automatically switch from AuthenticatedNavigator to AuthNavigator
              const { data, error } = await supabase.functions.invoke(
                'soft-delete-account',
                {
                  body: {
                    reason: reason.trim() || 'User requested account deletion',
                  },
                },
              );

              if (error) {
                // Log the full error details for debugging
                console.error('Account deletion error details:', {
                  error,
                  message: error.message,
                  context: error.context,
                  code: error.code,
                });

                // Use error mapping utilities to show user-friendly error message
                const errorTitle = getErrorTitle(error);
                const errorMessage = mapErrorCodeToMessage(error);

                setIsDeleting(false);
                Alert.alert(errorTitle, errorMessage);
                return;
              }

              // Show success message - backend will sign out automatically
              // The alert will be shown before the component unmounts
              Alert.alert(
                'Account Scheduled for Deletion',
                'Your account has been scheduled for deletion. You have 7 days to change your mind. Simply log in again within 7 days to cancel the deletion.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Backend sign-out will handle navigation automatically
                      // AppNavigator will switch to AuthNavigator when session becomes null
                    },
                  },
                ],
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              setIsDeleting(false);

              // Use error mapping utilities for better error messages
              const errorTitle = getErrorTitle(error);
              const errorMessage = mapErrorCodeToMessage(error);

              Alert.alert(errorTitle, errorMessage);
            }
          },
        },
      ],
    );
  };

  return (
    <PanGestureHandler
      onGestureEvent={handleEdgeSwipe}
      onHandlerStateChange={handleEdgeSwipeEnd}
      activeOffsetX={-10}
      failOffsetY={[-10, 10]}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
            transform: [{ translateX: edgeSwipeTranslateX }],
            opacity: edgeSwipeOpacity,
          },
        ]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {/* Warning Header */}
          <View
            style={[
              styles.warningHeader,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(239, 68, 68, 0.1)'
                  : '#FFF5F5',
              },
            ]}>
            <Ionicons name="warning" size={64} color="#EF4444" />
            <Text style={[styles.warningTitle, { color: '#EF4444' }]}>
              Delete Account
            </Text>
            <Text
              style={[styles.warningSubtitle, { color: textSecondaryColor }]}>
              This action will permanently delete your account and all
              associated data
            </Text>
          </View>

          {/* What will be deleted */}
          <View
            style={[
              styles.infoSection,
              {
                backgroundColor: surfaceColor,
                borderColor: borderColor,
              },
            ]}>
            <Text style={[styles.infoTitle, { color: textColor }]}>
              What will be deleted:
            </Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={[styles.infoItemText, { color: textColor }]}>
                  All your courses and academic data
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={[styles.infoItemText, { color: textColor }]}>
                  All assignments, lectures, and study sessions
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={[styles.infoItemText, { color: textColor }]}>
                  Your profile and account settings
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={[styles.infoItemText, { color: textColor }]}>
                  All reminders and notifications
                </Text>
              </View>
            </View>
          </View>

          {/* Grace period info */}
          <View
            style={[
              styles.gracePeriodInfo,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(59, 130, 246, 0.1)'
                  : '#F0F5FF',
              },
            ]}>
            <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            <View style={styles.gracePeriodText}>
              <Text
                style={[
                  styles.gracePeriodTitle,
                  { color: theme.isDark ? '#93C5FD' : COLORS.primary },
                ]}>
                7-Day Grace Period
              </Text>
              <Text
                style={[
                  styles.gracePeriodDescription,
                  { color: textSecondaryColor },
                ]}>
                Your account will be scheduled for deletion but not immediately
                removed. You have 7 days to log back in and cancel the deletion
                if you change your mind.
              </Text>
            </View>
          </View>

          {/* Reason (Optional) */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: textColor }]}>
              Why are you leaving? (Optional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                  color: textColor,
                },
              ]}
              value={reason}
              onChangeText={setReason}
              placeholder="Help us improve by sharing your feedback..."
              placeholderTextColor={textSecondaryColor}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text
              style={[styles.characterCount, { color: textSecondaryColor }]}>
              {reason.length}/500
            </Text>
          </View>

          {/* Acknowledgment Checkbox */}
          <TouchableOpacity
            style={[
              styles.checkboxContainer,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(239, 68, 68, 0.1)'
                  : '#FFF5F5',
                borderColor: borderColor,
              },
            ]}
            onPress={() => setHasAcknowledged(!hasAcknowledged)}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: '#EF4444',
                  backgroundColor: hasAcknowledged ? '#EF4444' : surfaceColor,
                },
              ]}>
              {hasAcknowledged && (
                <Ionicons name="checkmark" size={18} color="white" />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: textColor }]}>
              I understand that this action will delete all my data and cannot
              be undone after 7 days
            </Text>
          </TouchableOpacity>

          {/* Confirmation Input */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: textColor }]}>
              Type <Text style={styles.deleteKeyword}>DELETE</Text> to confirm
            </Text>
            <TextInput
              style={[
                styles.confirmationInput,
                {
                  backgroundColor: surfaceColor,
                  borderColor: confirmationText
                    ? isConfirmationValid
                      ? '#10B981'
                      : '#EF4444'
                    : borderColor,
                  color: textColor,
                },
                isConfirmationValid && {
                  backgroundColor: theme.isDark
                    ? 'rgba(16, 185, 129, 0.1)'
                    : '#F0FFF4',
                },
              ]}
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder="DELETE"
              placeholderTextColor={textSecondaryColor}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {confirmationText && !isConfirmationValid && (
              <Text style={styles.validationError}>
                Please type DELETE exactly as shown
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <SecondaryButton
              title="Cancel"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            />
            <PrimaryButton
              title={isDeleting ? 'Deleting...' : 'Delete Account'}
              onPress={handleDeleteAccount}
              disabled={!canDelete || isDeleting}
              loading={isDeleting}
              style={[
                styles.deleteButton,
                {
                  backgroundColor: canDelete ? '#EF4444' : textSecondaryColor,
                },
              ]}
            />
          </View>

          {/* Additional warning */}
          <View
            style={[
              styles.finalWarning,
              {
                backgroundColor: surfaceColor,
                borderColor: borderColor,
              },
            ]}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={textSecondaryColor}
            />
            <Text
              style={[styles.finalWarningText, { color: textSecondaryColor }]}>
              Need help? Contact our support team before deleting your account.
              We're here to help resolve any issues.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 200, // Extra padding so delete button sits above nav bar
  },
  warningHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  warningTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.md,
  },
  warningSubtitle: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  infoSection: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.sm,
  },
  infoList: {
    gap: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoItemText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  gracePeriodInfo: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.xs,
  },
  gracePeriodText: {
    flex: 1,
  },
  gracePeriodTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    marginBottom: SPACING.xs,
  },
  gracePeriodDescription: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  deleteKeyword: {
    fontWeight: FONT_WEIGHTS.bold,
    color: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 2,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  confirmationInput: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  validationError: {
    fontSize: FONT_SIZES.sm,
    color: '#EF4444',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
  finalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  finalWarningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    lineHeight: 18,
  },
});

export default DeleteAccountScreen;
