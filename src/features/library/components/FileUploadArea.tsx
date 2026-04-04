import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@/constants/theme';

export interface SelectedFile {
  uri: string;
  name: string;
}

interface FileUploadAreaProps {
  selectedFile: SelectedFile | null;
  onFileSelected: (file: SelectedFile) => void;
  onClear: () => void;
  disabled?: boolean;
}

const SUPPORTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  selectedFile,
  onFileSelected,
  onClear,
  disabled,
}) => {
  const handlePress = async () => {
    if (disabled) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: SUPPORTED_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    onFileSelected({ uri: asset.uri, name: asset.name });
  };

  if (selectedFile) {
    return (
      <View style={styles.selectedContainer}>
        <View style={styles.fileIconWrap}>
          <Ionicons name="document-text" size={22} color={COLORS.primary} />
        </View>
        <Text style={styles.fileName} numberOfLines={1}>
          {selectedFile.name}
        </Text>
        {!disabled && (
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearButton}
            activeOpacity={0.7}>
            <Ionicons
              name="close-circle"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.uploadZone, disabled && styles.uploadZoneDisabled]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}>
      <Ionicons
        name="cloud-upload-outline"
        size={32}
        color={disabled ? COLORS.textSecondary : COLORS.primary}
      />
      <Text
        style={[styles.uploadLabel, disabled && styles.uploadLabelDisabled]}>
        Choose your past question file
      </Text>
      <Text style={styles.uploadSub}>PDF, Word document, or image</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  uploadZone: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: `${COLORS.primary}06`,
  },
  uploadZoneDisabled: {
    borderColor: COLORS.lightGray,
    backgroundColor: 'transparent',
  },
  uploadLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  uploadLabelDisabled: {
    color: COLORS.textSecondary,
  },
  uploadSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  fileIconWrap: {
    flexShrink: 0,
  },
  fileName: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  clearButton: {
    flexShrink: 0,
    padding: 2,
  },
});

export default FileUploadArea;
