import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
        onPress={onSave}
        disabled={!isValid || isSaving}
        style={[
          styles.saveButton,
          (!isValid || isSaving) && styles.saveButtonDisabled,
        ]}
        variant="primary">
        {isSaving ? (
          <View style={styles.saveButtonContent}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Saving...</Text>
          </View>
        ) : (
          <Text style={styles.saveButtonText}>{saveButtonText}</Text>
        )}
      </Button>
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
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
