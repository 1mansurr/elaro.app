import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '@/services/supabase';
import { RootStackParamList } from '@/types';
import { RouteProp } from '@react-navigation/native';

type TaskDetailModalRouteProp = RouteProp<
  RootStackParamList,
  'TaskDetailModal'
>;

const TaskDetailModal = () => {
  const route = useRoute<TaskDetailModalRouteProp>();
  const { taskId, taskType } = route.params;

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !taskType) {
        setError('Task ID or Type is missing.');
        setLoading(false);
        return;
      }

      // Map taskType to Supabase table name
      const tableName =
        taskType === 'study_session' ? 'study_sessions' : taskType;

      try {
        const { data, error: dbError } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', taskId)
          .single();

        if (dbError) throw dbError;
        setTask(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, taskType]);

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" />}
      {error && <Text style={styles.errorText}>Error: {error}</Text>}
      {task && (
        <View>
          <Text style={styles.title}>
            {task.topic || task.title || task.lecture_name}
          </Text>
          <Text style={styles.detail}>Type: {taskType.replace('_', ' ')}</Text>
          {/* Add more task details here as needed */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  detail: {
    fontSize: 16,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default TaskDetailModal;
