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
        {/* Always render the 24-hour slots to form the grid */}
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={`hour-slot-${i}`} style={styles.hourSlot}>
            <Text style={styles.hourText}>{`${i.toString().padStart(2, '0')}:00`}</Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {/* Absolutely position the tasks over the grid */}
        {tasks.map(task => {
          const position = calculatePosition(task);
          return (
            <View key={task.id} style={[styles.eventContainer, position]}>
              <EventItem task={task} position={position} />
            </View>
          );
        })}
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
    position: 'relative',
  },
  hourSlot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: HOUR_HEIGHT,
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
  eventContainer: {
    position: 'absolute',
  },
});

export default Timeline;
