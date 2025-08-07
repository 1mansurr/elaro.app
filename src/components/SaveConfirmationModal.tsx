import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface SaveConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: theme.background }]}>
          <View
            style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
            <Ionicons name="checkmark-sharp" size={40} color="white" />
          </View>
          <Text style={[styles.modalText, { color: theme.text }]}>Saved!</Text>
          <Text style={[styles.modalSubText, { color: theme.textSecondary }]}>
            Your session has been successfully saved.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={onClose}>
            <Text style={styles.textStyle}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    width: '100%',
    marginTop: 15,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalSubText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
  },
});
