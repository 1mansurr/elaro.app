import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Button } from '@/shared/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '@/constants/theme';

interface TaskFormFooterProps {
  isValid: boolean;
  onSave: () => void;
  isSaving: boolean;
  saveButtonText?: string;
}

export const TaskFormFooter: React.FC<TaskFormFooterProps> = ({
  isValid,
  onSave,
  isSaving,
  saveButtonText = 'Save',
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: theme.isDark ? '#101922' : '#F6F7F8',
          borderTopColor: theme.isDark ? '#374151' : '#E5E7EB',
          paddingBottom: insets.bottom + SPACING.md,
        },
      ]}>
      <Button
        title={isSaving ? 'Saving...' : saveButtonText}
        onPress={onSave}
        disabled={!isValid || isSaving}
        loading={isSaving}
        variant="primary"
        style={[
          styles.saveButton,
          (!isValid || isSaving) && styles.saveButtonDisabled,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  saveButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
