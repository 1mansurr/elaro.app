// FILE: src/components/Calendar/Timeline.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Task } from '../../types';
import EventItem from './EventItem';

const HOUR_HEIGHT = 80; // Increased height for better spacing

interface Props {
  tasks: Task[];
}

const Timeline: React.FC<Props> = ({ tasks }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

  const calculatePosition = (task: Task) => {
    const taskDate = new Date(task.date);
    const startMinutes = taskDate.getHours() * 60 + taskDate.getMinutes();
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    
    // Assuming a default duration of 60 minutes for now
    const durationMinutes = 60;
    const height = (durationMinutes / 60) * HOUR_HEIGHT - 2; // -2 for margin

    return {
      top,
      left: 70, // Adjusted left position
      height,
      width: '75%'
    };
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.timelineContainer}>
        {hours.map((hour) => (
          <View key={hour} style={styles.hourSlot}>
            <Text style={styles.hourText}>
              {hour === 0 ? '12 AM' : 
               hour < 12 ? `${hour} AM` : 
               hour === 12 ? '12 PM' : 
               `${hour - 12} PM`}
            </Text>
            <View style={styles.hourLine} />
          </View>
        ))}
        
        {tasks.map((task) => (
          <EventItem
            key={task.id}
            task={task}
            position={calculatePosition(task)}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timelineContainer: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  hourSlot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourText: {
    width: 70, // Increased width to match left position
    textAlign: 'center',
    fontSize: 12,
    color: '#6c757d',
    transform: [{ translateY: -8 }],
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
});

export default Timeline;
