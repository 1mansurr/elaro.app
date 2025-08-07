import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  title?: string;
  message?: string;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  visible,
  onClose,
  onSignIn,
  onSignUp,
  title = 'Join the Community!',
  message = 'Please sign in or create an account to save your progress and access all features.',
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: theme.background }]}>
          <Text style={[styles.modalText, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.modalSubText, { color: theme.textSecondary }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={onSignUp}>
            <Text style={styles.textStyle}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSecondary,
              { borderColor: theme.primary },
            ]}
            onPress={onSignIn}>
            <Text style={[styles.textStyle, { color: theme.primary }]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.textSecondary }]}>
              Maybe Later
            </Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    width: 200,
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubText: {
    marginBottom: 25,
    textAlign: 'center',
  },
  closeText: {
    marginTop: 15,
    textAlign: 'center',
  },
});
