import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Task } from '@/types';
import EventItem from './EventItem';

const HOUR_HEIGHT = 80;

interface Props {
  tasks: Task[];
  onTaskPress: (task: Task) => void;
  onLockedTaskPress?: (task: Task) => void;
  onScroll: (event: any) => void;
}

const Timeline: React.FC<Props> = ({
  tasks,
  onTaskPress,
  onLockedTaskPress,
  onScroll,
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => (prev === taskId ? null : taskId));
  };

  const calculatePosition = (task: Task) => {
    const startTime = new Date(task.startTime || task.date);
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const top = (startMinutes / 60) * HOUR_HEIGHT;

    let durationMinutes = 60;
    if (task.type === 'lecture' && task.endTime) {
      const endTime = new Date(task.endTime);
      if (endTime > startTime) {
        durationMinutes =
          (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      }
    }

    const height = (durationMinutes / 60) * HOUR_HEIGHT - 2;

    return {
      top,
      left: 70,
      height: Math.max(height, 20),
      width: 200,
    };
  };

  return (
    <ScrollView
      style={styles.container}
      onScroll={onScroll}
      scrollEventThrottle={16}>
      <View style={styles.timelineContainer}>
        {hours.map((_, i) => (
          <View key={`hour-slot-${i}`} style={styles.hourSlot}>
            <Text
              style={
                styles.hourText
              }>{`${i.toString().padStart(2, '0')}:00`}</Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {tasks.map(task => {
          const position = calculatePosition(task);
          const isLocked = task.isLocked || false;
          const isExpanded = expandedTaskId === task.id;

          return (
            <View
              key={task.id}
              style={[
                styles.eventContainer,
                position,
                isExpanded && { zIndex: 10 },
              ]}>
              <EventItem
                task={task}
                position={position}
                isLocked={isLocked}
                isExpanded={isExpanded}
                onPress={() => {
                  if (isLocked && onLockedTaskPress) {
                    onLockedTaskPress(task);
                  } else {
                    handleToggleExpand(task.id);
                  }
                }}
                onViewDetails={() => {
                  setExpandedTaskId(null);
                  onTaskPress(task);
                }}
              />
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
    width: 70,
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
