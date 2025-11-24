import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/shared/components/Button';
import { supabase } from '@/services/supabase';
import { AppError } from '@/utils/AppError';
import { showToast } from '@/utils/showToast';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

const DeleteAccountScreen = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();

  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

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
              const { data, error } = await supabase.functions.invoke(
                'soft-delete-account',
                {
                  body: {
                    reason: reason.trim() || 'User requested account deletion',
                  },
                },
              );

              if (error) throw new AppError('Failed to delete account.');

              Alert.alert(
                'Account Scheduled for Deletion',
                'Your account has been scheduled for deletion. You have 7 days to change your mind. Simply log in again within 7 days to cancel the deletion.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await signOut();
                    },
                  },
                ],
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              showToast({
                type: 'error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Failed to delete account',
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Warning Header */}
      <View style={styles.warningHeader}>
        <Ionicons name="warning" size={64} color="#FF3B30" />
        <Text style={styles.warningTitle}>Delete Account</Text>
        <Text style={styles.warningSubtitle}>
          This action will permanently delete your account and all associated
          data
        </Text>
      </View>

      {/* What will be deleted */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>What will be deleted:</Text>
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.infoItemText}>
              All your courses and academic data
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.infoItemText}>
              All assignments, lectures, and study sessions
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.infoItemText}>
              Your profile and account settings
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.infoItemText}>
              All reminders and notifications
            </Text>
          </View>
        </View>
      </View>

      {/* Grace period info */}
      <View style={styles.gracePeriodInfo}>
        <Ionicons name="time-outline" size={24} color={COLORS.primary} />
        <View style={styles.gracePeriodText}>
          <Text style={styles.gracePeriodTitle}>7-Day Grace Period</Text>
          <Text style={styles.gracePeriodDescription}>
            Your account will be scheduled for deletion but not immediately
            removed. You have 7 days to log back in and cancel the deletion if
            you change your mind.
          </Text>
        </View>
      </View>

      {/* Reason (Optional) */}
      <View style={styles.formSection}>
        <Text style={styles.label}>Why are you leaving? (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={reason}
          onChangeText={setReason}
          placeholder="Help us improve by sharing your feedback..."
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.characterCount}>{reason.length}/500</Text>
      </View>

      {/* Acknowledgment Checkbox */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setHasAcknowledged(!hasAcknowledged)}>
        <View
          style={[styles.checkbox, hasAcknowledged && styles.checkboxChecked]}>
          {hasAcknowledged && (
            <Ionicons name="checkmark" size={18} color={COLORS.background} />
          )}
        </View>
        <Text style={styles.checkboxLabel}>
          I understand that this action will delete all my data and cannot be
          undone after 7 days
        </Text>
      </TouchableOpacity>

      {/* Confirmation Input */}
      <View style={styles.formSection}>
        <Text style={styles.label}>
          Type <Text style={styles.deleteKeyword}>DELETE</Text> to confirm
        </Text>
        <TextInput
          style={[
            styles.confirmationInput,
            confirmationText && !isConfirmationValid
              ? styles.confirmationInputInvalid
              : undefined,
            isConfirmationValid ? styles.confirmationInputValid : undefined,
          ]}
          value={confirmationText}
          onChangeText={setConfirmationText}
          placeholder="DELETE"
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
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
        />
        <Button
          title={isDeleting ? 'Deleting...' : 'Delete Account'}
          onPress={handleDeleteAccount}
          disabled={!canDelete || isDeleting}
          loading={isDeleting}
          style={{
            ...styles.deleteButton,
            backgroundColor: canDelete ? '#FF3B30' : COLORS.gray,
          }}
        />
      </View>

      {/* Additional warning */}
      <View style={styles.finalWarning}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={COLORS.gray}
        />
        <Text style={styles.finalWarningText}>
          Need help? Contact our support team before deleting your account.
          We're here to help resolve any issues.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  warningHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    marginBottom: SPACING.xl,
  },
  warningTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#FF3B30',
    marginTop: SPACING.md,
  },
  warningSubtitle: {
    fontSize: FONT_SIZES.md,
    color: '#8B0000',
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  infoSection: {
    backgroundColor: '#FFFAF0',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
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
    color: COLORS.text,
    flex: 1,
  },
  gracePeriodInfo: {
    flexDirection: 'row',
    backgroundColor: '#F0F5FF',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  gracePeriodText: {
    flex: 1,
  },
  gracePeriodTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  gracePeriodDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  deleteKeyword: {
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#FF3B30',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4E1',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FF3B30',
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#FF3B30',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  confirmationInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  confirmationInputInvalid: {
    borderColor: '#FF3B30',
  },
  confirmationInputValid: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  validationError: {
    fontSize: FONT_SIZES.sm,
    color: '#FF3B30',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  deleteButton: {
    flex: 1,
  },
  finalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: SPACING.sm,
  },
  finalWarningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    lineHeight: 18,
  },
});

export default DeleteAccountScreen;
