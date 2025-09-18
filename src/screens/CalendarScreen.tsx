import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Task, RootStackParamList } from '../types';
import { WeekStrip, Timeline } from '../components';
import { startOfWeek, isSameDay, format } from 'date-fns';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants/theme';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const CalendarScreen = () => {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { session } = useAuth();
  const { calendarData, loading: isDataLoading, fetchInitialData } = useData();
  const isGuest = !session;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleDateSelect = (newDate: Date) => {
    if (isGuest) return; // Disable date selection for guests
    
    const newWeekStart = startOfWeek(newDate, { weekStartsOn: 1 });
    if (!isSameDay(newWeekStart, currentWeekStart)) {
      setCurrentWeekStart(newWeekStart);
      // Note: In a real app, you might want to fetch new week data here
      // For now, we'll use the pre-loaded data
    }
    setSelectedDate(newDate);
  };

  const tasksForSelectedDay = useMemo(() => {
    if (isGuest) return [];
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const matchingKey = Object.keys(calendarData).find(key => key.startsWith(dateKey));
    return matchingKey ? calendarData[matchingKey] : [];
  }, [selectedDate, calendarData, isGuest]);

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
            onPress={() => navigation.navigate('AuthChooser')}
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
      {isDataLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
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
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  guestTimelineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  guestText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  guestSubText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  signUpButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
  },
  signUpButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
});

export default CalendarScreen;