import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface AddModalWrapperProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const AddModalWrapper: React.FC<AddModalWrapperProps> = ({
  visible,
  onClose,
  children,
}) => {
  const { theme } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.centered} pointerEvents="box-none">
          <Pressable
            style={[styles.card, { backgroundColor: theme.card }]}
            onPress={() => {}}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal">
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: Math.min(width * 0.9, 600),
    height: height * 0.45,
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    padding: 8,
  },
  scroll: {
    flex: 1,
    marginTop: 32,
  },
});

export default AddModalWrapper;
