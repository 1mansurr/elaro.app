// FILE: src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../services/supabase';
import { RootStackParamList, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { FloatingActionButton, Button } from '../components';
import NextTaskCard from '../components/NextTaskCard';
import TodayOverviewCard from '../components/TodayOverviewCard';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface OverviewData {
  lectures: number;
  study_sessions: number;
  assignments: number;
  reviews: number;
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { session } = useAuth();
  const isGuest = !session;
  const [homeData, setHomeData] = useState<{
    nextUpcomingTask: Task | null;
    todayOverview: OverviewData | null;
    weeklyTaskCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [isFabOpen, setIsFabOpen] = useState(false); // State to control the FAB

  const fetchData = useCallback(async () => {
    if (isGuest) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-home-screen-data');
      if (error) throw error;
      setHomeData(data);
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]);

  useFocusEffect(useCallback(() => {
    fetchData();
  }, [fetchData]));

  const promptSignUp = () => {
    navigation.navigate('Auth', { 
      onClose: () => navigation.goBack(),
      mode: 'signup' 
    });
  };

  const fabActions = [
    {
      icon: 'book-outline' as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
      label: 'Add Study Session',
      onPress: isGuest ? promptSignUp : () => navigation.navigate('AddStudySessionModal')
    },
    {
      icon: 'document-text-outline' as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
      label: 'Add Assignment',
      onPress: isGuest ? promptSignUp : () => navigation.navigate('AddAssignmentModal')
    },
    {
      icon: 'school-outline' as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
      label: 'Add Lecture',
      onPress: isGuest ? promptSignUp : () => navigation.navigate('AddLectureModal')
    },
  ];

  if (isLoading && !isGuest) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchData} />
        }
      >
        <Text style={styles.title}>Let's Make Today Count</Text>
        
        <NextTaskCard 
          task={isGuest ? null : (homeData?.nextUpcomingTask || null)} 
          isGuestMode={isGuest}
          onAddActivity={() => setIsFabOpen(true)} // Correctly opens the FAB
        />
        
        <TodayOverviewCard
          overview={isGuest ? {
            lectures: 0,
            study_sessions: 0,
            assignments: 0,
            reviews: 0,
          } : (homeData?.todayOverview || null)}
          weeklyTaskCount={isGuest ? 0 : (homeData?.weeklyTaskCount || 0)}
        />
        
        <Button
          title="View Full Calendar"
          onPress={() => {
            navigation.navigate('Calendar');
          }}
        />
      </ScrollView>
      
      <FloatingActionButton 
        actions={fabActions}
        isOpen={isFabOpen}
        onStateChange={({ open }) => setIsFabOpen(open)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 80
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 24
  }
});

export default HomeScreen;