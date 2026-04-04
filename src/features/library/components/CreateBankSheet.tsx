import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import RNModal from 'react-native-modal';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';
import { useCreateBank } from '../hooks/useCreateQuiz';

interface CreateBankSheetProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string;
}

const CreateBankSheet: React.FC<CreateBankSheetProps> = ({
  isVisible,
  onClose,
  userId,
}) => {
  const [name, setName] = useState('');
  const { mutate, isPending } = useCreateBank();

  const isValid = name.trim().length > 0;

  const handleSave = () => {
    if (!isValid || isPending) return;
    mutate(
      { name, userId },
      {
        onSuccess: () => {
          setName('');
          onClose();
        },
      },
    );
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <RNModal
      isVisible={isVisible}
      onSwipeComplete={handleClose}
      onBackdropPress={handleClose}
      swipeDirection="down"
      style={styles.modal}
      propagateSwipe>
      <View style={styles.sheet}>
        <View style={styles.dragHandle} />
        <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={false}>
          <Text style={styles.title}>New Bank</Text>
          <TextInput
            style={styles.input}
            placeholder="Bank name"
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isValid || isPending) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!isValid || isPending}
            activeOpacity={0.8}>
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    paddingTop: SPACING.sm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default CreateBankSheet;
