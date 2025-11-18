import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BaseModal } from './BaseModal';
import { useTheme } from '@/contexts/ThemeContext';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  MODAL_TOKENS,
  SHADOWS,
  ANIMATIONS,
} from '@/constants/theme';

interface ModalVariantProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeOnBackdropPress?: boolean;
  modalStyle?: ViewStyle;
}

// Sheet Modal - Slides up from bottom (like QuickAddModal)
export const SheetModal: React.FC<ModalVariantProps> = ({
  isVisible,
  onClose,
  children,
  closeOnBackdropPress = true,
  modalStyle,
}) => {
  const { theme } = useTheme();
  const modalConfig = ANIMATIONS.modal.sheet;

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      animationType="slide"
      animationDuration={modalConfig.duration}
      closeOnBackdropPress={closeOnBackdropPress}
      modalStyle={
        [
          styles.sheetContainer,
          {
            backgroundColor: theme.background,
            borderTopLeftRadius: BORDER_RADIUS.lg,
            borderTopRightRadius: BORDER_RADIUS.lg,
          },
          modalStyle,
        ] as ViewStyle
      }
      overlayStyle={styles.sheetOverlay}>
      {children}
    </BaseModal>
  );
};

// Dialog Modal - Centered with blur backdrop
export const DialogModal: React.FC<ModalVariantProps> = ({
  isVisible,
  onClose,
  children,
  closeOnBackdropPress = true,
  modalStyle,
}) => {
  const { theme } = useTheme();
  const modalConfig = ANIMATIONS.modal.dialog;

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      animationType="fade"
      animationDuration={modalConfig.duration}
      closeOnBackdropPress={closeOnBackdropPress}
      modalStyle={
        [
          styles.dialogContainer,
          {
            backgroundColor: theme.background,
            borderRadius: BORDER_RADIUS.lg,
          },
          modalStyle,
        ] as ViewStyle
      }>
      {children}
    </BaseModal>
  );
};

// Simple Modal - Centered with opacity backdrop (like InfoModal)
export const SimpleModal: React.FC<ModalVariantProps> = ({
  isVisible,
  onClose,
  children,
  closeOnBackdropPress = true,
  modalStyle,
}) => {
  const { theme } = useTheme();
  const modalConfig = ANIMATIONS.modal.simple;

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      animationType="fade"
      animationDuration={modalConfig.duration}
      closeOnBackdropPress={closeOnBackdropPress}
      modalStyle={
        [
          styles.simpleContainer,
          {
            backgroundColor: theme.background,
            borderRadius: BORDER_RADIUS.md,
          },
          modalStyle,
        ] as ViewStyle
      }>
      {children}
    </BaseModal>
  );
};

// Full Screen Modal - Takes up entire screen
export const FullScreenModal: React.FC<ModalVariantProps> = ({
  isVisible,
  onClose,
  children,
  closeOnBackdropPress = false,
  modalStyle,
}) => {
  const { theme } = useTheme();
  const modalConfig = ANIMATIONS.modal.fullScreen;

  return (
    <BaseModal
      isVisible={isVisible}
      onClose={onClose}
      animationType="slide"
      animationDuration={modalConfig.duration}
      closeOnBackdropPress={closeOnBackdropPress}
      presentationStyle="fullScreen"
      modalStyle={
        [
          styles.fullScreenContainer,
          {
            backgroundColor: theme.background,
          },
          modalStyle,
        ] as ViewStyle
      }>
      {children}
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%' as any,
    // Enhanced shadow for sheet modals
    ...SHADOWS.xl,
    backgroundColor: MODAL_TOKENS.sheet.backgroundColor,
    borderTopLeftRadius: MODAL_TOKENS.sheet.borderRadius,
    borderTopRightRadius: MODAL_TOKENS.sheet.borderRadius,
  },
  sheetOverlay: {
    justifyContent: 'flex-end',
  },
  dialogContainer: {
    margin: MODAL_TOKENS.dialog.margin,
    padding: MODAL_TOKENS.dialog.padding,
    maxWidth: '90%' as any,
    // Enhanced shadow for dialog modals
    ...SHADOWS.lg,
    backgroundColor: MODAL_TOKENS.dialog.backgroundColor,
    borderRadius: MODAL_TOKENS.dialog.borderRadius,
  },
  simpleContainer: {
    margin: MODAL_TOKENS.simple.margin,
    padding: MODAL_TOKENS.simple.padding,
    maxWidth: '80%' as any,
    // Enhanced shadow for simple modals
    ...SHADOWS.md,
    backgroundColor: MODAL_TOKENS.simple.backgroundColor,
    borderRadius: MODAL_TOKENS.simple.borderRadius,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: MODAL_TOKENS.fullScreen.backgroundColor,
    padding: MODAL_TOKENS.fullScreen.padding,
    // No shadow for full screen modals
  },
});

export default BaseModal;
