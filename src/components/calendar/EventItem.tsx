// FILE: src/components/Calendar/EventItem.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Task } from '../../types';

interface Props {
  task: Task;
  position: { top: number; left: number; height: number; width: string };
}

const EventItem: React.FC<Props> = ({ task, position }) => {
  const eventColor = {
    lecture: '#007AFF',
    study_session: '#34C759',
    assignment: '#FF9500',
  };

  const backgroundColor = eventColor[task.type] || '#8E8E93';

  return (
    <View style={[
      styles.container, 
      {
        top: position.top,
        left: position.left,
        height: position.height,
        width: position.width,
        backgroundColor
      }
    ]}>
      <Text style={styles.title}>{task.name}</Text>
      <Text style={styles.time}>
        {new Date(task.date).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
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
});

export default EventItem;
