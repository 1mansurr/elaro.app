// FILE: src/screens/modals/TaskDetailSheet.tsx
// Create this new file for the bottom sheet component.

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Make sure expo-blur is installed
import { Task } from '../../types'; // Adjust path if needed

interface TaskDetailSheetProps {
  task: Task | null;
  isVisible: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}

const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({ task, isVisible, onClose, onEdit, onComplete, onDelete }) => {
  if (!task) return null;

  return (
    <Modal transparent visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      <View style={styles.sheetContainer}>
        {/* Header with Edit and Close buttons */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onEdit(task)} style={styles.iconButton}>
            <Ionicons name="pencil-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close-outline" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.taskTitle}>{task.name}</Text>
          <Text style={styles.taskDescription}>{task.description || 'No description.'}</Text>
        </View>

        {/* Footer with action buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.completeButton} onPress={() => onComplete(task)}>
            <Text style={styles.buttonText}>Mark as Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(task)}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Add styles for the sheet.
const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  taskDescription: {
    fontSize: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  completeButton: {
    backgroundColor: '#2C5EFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default TaskDetailSheet;
