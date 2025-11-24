import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Button } from '@/shared/components/Button';

interface PostChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  onFaqPress: () => void;
}

export const PostChatModal: React.FC<PostChatModalProps> = ({
  isVisible,
  onClose,
  onFaqPress,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.title}>We'll Be With You Shortly!</Text>
          <Text style={styles.message}>
            Our support team will respond soon. Please check back in the chat
            from time to time within the next 2 hours.
          </Text>
          <Text style={styles.subtitle}>
            In the meantime, your question might already be answered in our
            documentation.
          </Text>

          <Button title="Read 'How ELARO Works'" onPress={onFaqPress} />

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  message: {
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 25,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: 15,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
