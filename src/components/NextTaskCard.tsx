// FILE: src/components/NextTaskCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Task } from '../types';
import { Button } from './'; // Assuming Button is exported from components/index.ts

interface Props {
  task: Task | null;
  isGuestMode?: boolean;
  onAddActivity?: () => void;
}

const NextTaskCard: React.FC<Props> = ({ task, isGuestMode = false, onAddActivity }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const getTaskTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePress = () => {
    if (isGuestMode || !task) return;
    // Later, this can navigate to a unified task detail screen
  };

  const renderContent = () => {
    if (task) {
      return (
        <>
          <Text style={styles.taskType}>
            {task.type.replace('_', ' ')}
          </Text>
          <Text style={styles.taskName}>{task.name}</Text>
          
          <View style={styles.footer}>
            <Text style={styles.courseName}>{task.courses.course_name}</Text>
            <Text style={styles.time}>{getTaskTime(task.date)}</Text>
          </View>
        </>
      );
    }

    if (isGuestMode) {
      return (
        <View style={styles.guestContainer}>
          <Text style={styles.noTaskText}>
            You have no upcoming activities
          </Text>
          <Button
            title="Add Your First Activity"
            onPress={onAddActivity}
            style={{ marginTop: 16 }}
          />
        </View>
      );
    }

    return (
      <Text style={styles.noTaskText}>
        You're all clear for now. Enjoy the break!
      </Text>
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} disabled={!task || isGuestMode}>
      <Text style={styles.header}>What's Next</Text>
      
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 16,
  },
  taskType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  taskName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 16,
  },
  courseName: {
    fontSize: 16,
    color: '#495057',
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343a40',
  },
  noTaskText: {
    fontSize: 18,
    color: '#495057',
    textAlign: 'center',
    paddingVertical: 20,
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
});

export default NextTaskCard;