import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AddOptionModalProps {
  visible: boolean;
  onClose: () => void;
  onAddSession: () => void;
  onAddEvent: () => void;
}

const { width } = Dimensions.get('window');

export const AddOptionModal: React.FC<AddOptionModalProps> = ({
  visible,
  onClose,
  onAddSession,
  onAddEvent,
}) => {
  // No scroll needed, modal fits on screen
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* X Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Close add modal">
            <Feather name="x" size={24} color="#888" />
          </TouchableOpacity>
          {/* Title and action buttons */}
          <Text style={[styles.title, { textAlign: 'left', alignSelf: 'flex-start' }]}>What would you like to add?</Text>
          <Text style={[styles.subtext, { textAlign: 'left', alignSelf: 'flex-start' }]}>Choose an option to get started</Text>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={onAddSession}
            accessibilityLabel="Add Study Session"
          >
            <Text style={styles.optionText}>📚 Add Study Session</Text>
            <Text style={styles.optionSubtext}>Plan your study time with spaced repetition</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={onAddEvent}
            accessibilityLabel="Add Task or Event"
          >
            <Text style={styles.optionText}>📝 Add Task or Event</Text>
            <Text style={styles.optionSubtext}>Schedule assignments, exams, and more</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    width: width > 500 ? 420 : width - 24,
    alignSelf: 'center',
    marginBottom: 0,
    shadowColor: 'transparent',
    elevation: 0,
    alignItems: 'stretch',
    minHeight: 280,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 6,
    textAlign: 'center',
    marginTop: 8,
  },
  subtext: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '400',
  },
  optionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  optionText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtext: {
    color: '#e0e7ef',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
}); 