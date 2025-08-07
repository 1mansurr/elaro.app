import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  COLORS,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
} from '../../constants/theme';

interface BaseModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  title,
  onClose,
  children,
  wide,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal visible={visible} animationType="none" transparent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modal,
            wide && {
              width: width > 500 ? 420 : width - 24,
              alignSelf: 'center',
            },
            { transform: [{ translateY: slideAnim }] },
          ]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close modal">
              <Feather name="x" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    ...Platform.select({
      ios: { paddingBottom: 32 },
      android: { paddingBottom: 24 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flexGrow: 1,
  },
});

export default BaseModal;
