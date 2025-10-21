import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@/types';

interface Props {
  task: Task;
  position: { top: number; left: number; height: number; width: number };
  onPress: () => void;
  isLocked?: boolean;
}

const EventItem: React.FC<Props> = ({ task, position, onPress, isLocked = false }) => {
  const eventColor = {
    lecture: '#007AFF',
    study_session: '#34C759',
    assignment: '#FF9500',
  };

  const backgroundColor = isLocked ? '#8E8E93' : (eventColor[task.type] || '#8E8E93');
  const isCompleted = task.status === 'completed';

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
        },
        isLocked && styles.lockedContainer
      ]}
      activeOpacity={0.7}
    >
      {isLocked && (
        <View style={styles.lockIconContainer}>
          <Ionicons name="lock-closed" size={16} color="#fff" />
        </View>
      )}
      
      <View style={styles.textContainer}>
        <Text style={[
          styles.title, 
          isCompleted && styles.completedText,
          isLocked && styles.lockedText
        ]} numberOfLines={1}>
          {task.name}
        </Text>
        <Text style={[
          styles.time, 
          isCompleted && styles.completedText,
          isLocked && styles.lockedText
        ]}>
          {new Date(task.startTime || task.date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
      
      {isLocked ? (
        <Ionicons name="lock-closed" size={18} color="#fff" style={styles.lockIcon} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="white" style={styles.chevron} />
      )}
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
  lockedContainer: {
    opacity: 0.6,
    backgroundColor: '#8E8E93',
  },
  lockIconContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 4,
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
  lockedText: {
    opacity: 0.7,
  },
  chevron: {
    marginLeft: 8,
  },
  lockIcon: {
    marginLeft: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#A9A9A9',
  },
});

export default EventItem;
