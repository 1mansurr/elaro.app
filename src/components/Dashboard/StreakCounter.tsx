import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import Icon from 'react-native-vector-icons/Ionicons';

const StreakCounter = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-streak-info');
        if (error) throw error;
        if (data) {
          setStreak(data.current_streak || 0);
        }
      } catch (error) {
        console.error('Error fetching streak:', error);
        setStreak(0); // Default to 0 on error
      } finally {
        setLoading(false);
      }
    };
    fetchStreak();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FFA726" />
      </View>
    );
  }

  const isZero = streak === 0;

  return (
    <View style={[styles.container, isZero && styles.zeroState]}>
      <Icon name="flame" size={20} color={isZero ? "#A0A0A0" : "#FFA726"} />
      <Text style={[styles.text, isZero && styles.zeroText]}>
        {streak}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle background
  },
  zeroState: {
    opacity: 0.6, // Blurred/faded effect for zero state
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // Assuming a dark header, adjust if needed
    marginLeft: 6,
  },
  zeroText: {
    color: '#A0A0A0',
  },
});

export default StreakCounter; 