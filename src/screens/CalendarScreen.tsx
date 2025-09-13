// FILE: src/screens/CalendarScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Task, RootStackParamList } from '../types';
import { WeekStrip, Timeline } from '../components';
import { startOfWeek, isSameDay, format } from 'date-fns';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const CalendarScreen = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { session } = useAuth();
  const isGuest = !session;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekData, setWeekData] = useState<Record<string, Task[]>>({});
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const fetchWeekData = useCallback(async (dateInWeek: Date) => {
    if (isGuest) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-calendar-data-for-week', {
        body: { date: dateInWeek.toISOString() },
      });
      
      if (error) throw error;
      setWeekData(data || {});
    } catch (e) {
      console.error("Failed to fetch week data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    fetchWeekData(currentWeekStart);
  }, [fetchWeekData, currentWeekStart]);

  const handleDateSelect = (newDate: Date) => {
    if (isGuest) return; // Disable date selection for guests
    
    const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
    if (!isSameDay(newWeekStart, currentWeekStart)) {
      setCurrentWeekStart(newWeekStart);
    }
    setSelectedDate(newDate);
  };

  const tasksForSelectedDay = useMemo(() => {
    if (isGuest) return [];
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const matchingKey = Object.keys(weekData).find(key => key.startsWith(dateKey));
    return matchingKey ? weekData[matchingKey] : [];
  }, [selectedDate, weekData, isGuest]);

  // Guest View
  if (isGuest) {
    return (
      <View style={styles.container}>
        <WeekStrip 
          selectedDate={selectedDate} 
          onDateSelect={() => {}} // Disabled for guests
        />
        <View style={styles.guestTimelineContainer}>
          <Text style={styles.guestText}>
            Your schedule will appear here.
          </Text>
          <Text style={styles.guestSubText}>
            Sign up to add lectures, assignments, and study sessions to your personal calendar.
          </Text>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => navigation.navigate('Auth', { mode: 'signup' })}
          >
            <Text style={styles.signUpButtonText}>Sign Up for Free</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Authenticated View
  return (
    <View style={styles.container}>
      <WeekStrip 
        selectedDate={selectedDate} 
        onDateSelect={handleDateSelect} 
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <Timeline tasks={tasksForSelectedDay} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestTimelineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
  },
  guestText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    textAlign: 'center',
    marginBottom: 12,
  },
  guestSubText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
  },
  signUpButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CalendarScreen;