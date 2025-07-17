import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface BottomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: number; // percentage of screen height (e.g., 0.4 = 40%)
}

export const BottomModal: React.FC<BottomModalProps> = ({
  visible,
  onClose,
  title,
  children,
  height = 0.4,
}) => {
  const { height: screenHeight } = Dimensions.get('window');
  const modalHeight = screenHeight * height;
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContainer, { height: modalHeight, backgroundColor: theme.card, shadowColor: isDark ? '#000' : theme.input }]}>
          <SafeAreaView style={styles.safeTop}>
            <View style={[styles.header, { backgroundColor: theme.card, shadowColor: isDark ? '#000' : theme.input }]}>
              <View style={[styles.dragHandle, { backgroundColor: theme.inputBorder }]} />
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close modal"
                  accessibilityHint="Double tap to close this modal"
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  safeTop: {
    flex: 1,
  },
  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
    borderBottomWidth: 0, // Remove border in favor of shadow
  },
  dragHandle: {
    width: 36,
    height: 5,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    flex: 1,
  },
  closeButton: {
    marginLeft: SPACING.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  contentContainer: {
    paddingBottom: SPACING.xxl,
  },
});

