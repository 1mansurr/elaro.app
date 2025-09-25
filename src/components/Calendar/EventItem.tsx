// FILE: src/components/Calendar/EventItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types';

interface Props {
  task: Task;
  position: { top: number; left: number; height: number; width: string };
  onPress: () => void;
}

const EventItem: React.FC<Props> = ({ task, position, onPress }) => {
  const eventColor = {
    lecture: '#007AFF',
    study_session: '#34C759',
    assignment: '#FF9500',
  };

  const backgroundColor = eventColor[task.type] || '#8E8E93';
  const isCompleted = task.status === 'completed'; // Assuming 'status' field exists

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.container, 
        {
          top: position.top,
          left: position.left,
          height: position.height,
          width: position.width,
          backgroundColor
        }
      ]}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.title, isCompleted && styles.completedText]}>{task.name}</Text>
        <Text style={[styles.time, isCompleted && styles.completedText]}>
          {new Date(task.start_time || task.date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="white" style={styles.chevron} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  time: {
    color: '#fff',
    fontSize: 12,
    alignSelf: 'flex-end',
    opacity: 0.8,
  },
  chevron: {
    marginLeft: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#A9A9A9', // A muted gray color
  },
});

export default EventItem;
