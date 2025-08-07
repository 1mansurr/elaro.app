import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import Icon from 'react-native-vector-icons/Ionicons';

interface StreakData {
  current_streak: number;
  longest_streak: number;
}

const StreakDashboard = () => {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        setLoading(true);
        const { data, error } =
          await supabase.functions.invoke('get-streak-info');
        if (error) {
          throw new Error(error.message);
        }
        setStreakData(data);
      } catch (err: any) {
        setError('Could not load streak data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStreakData();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFA726" />
      </View>
    );
  }

  if (error || !streakData) {
    // Don't show a big error, just fail gracefully by showing nothing.
    // This is better UX than showing a broken component.
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.streakItem}>
        <Icon name="flame" size={32} color="#FFA726" />
        <View style={styles.textContainer}>
          <Text style={styles.streakValue}>{streakData.current_streak}</Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
        </View>
      </View>
      <View style={styles.separator} />
      <View style={styles.streakItem}>
        <Icon name="flame" size={32} color="#FFD700" />
        <View style={styles.textContainer}>
          <Text style={styles.streakValue}>{streakData.longest_streak}</Text>
          <Text style={styles.streakLabel}>Longest Streak</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#2C2C2E', // A dark, modern background
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 12,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  streakLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 2,
  },
  separator: {
    width: 1,
    height: '60%',
    backgroundColor: '#4A4A4C',
  },
});

export default StreakDashboard;
