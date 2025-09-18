import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import FloatingActionButton from '../components/FloatingActionButton';
import { Button } from '../components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants/theme';
import NextTaskCard from '../components/NextTaskCard';
import TodayOverviewCard from '../components/TodayOverviewCard';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { session } = useAuth();
  const { homeData, loading: isDataLoading, fetchInitialData } = useData();
  const isGuest = !session;
  const [isFabOpen, setIsFabOpen] = useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;

  const promptSignUp = () => {
    navigation.navigate('AuthChooser');
  };

  const fabActions = [
    {
      icon: 'book-outline' as any,
      label: 'Add Study Session',
      onPress: () => navigation.navigate('AddStudySessionModal')
    },
    {
      icon: 'document-text-outline' as any,
      label: 'Add Assignment',
      onPress: () => navigation.navigate('AddAssignmentModal')
    },
    {
      icon: 'school-outline' as any,
      label: 'Add Lecture',
      onPress: () => navigation.navigate('AddLectureModal')
    },
  ];

  const backdropOpacity = fabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1], // Animate opacity to 1 to show the blur view
  });

  const handleFabStateChange = ({ isOpen }) => {
    setIsFabOpen(isOpen);
    Animated.spring(fabAnimation, {
        toValue: isOpen ? 1 : 0,
        friction: 7,
        useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isDataLoading} onRefresh={fetchInitialData} />
        }
        scrollEnabled={!isFabOpen}
      >
        <Text style={styles.title}>Let's Make Today Count</Text>
        <NextTaskCard 
          task={isGuest ? null : (homeData?.nextUpcomingTask || null)} 
          isGuestMode={isGuest}
          onAddActivity={() => handleFabStateChange({ isOpen: true })}
        />
        <TodayOverviewCard
          overview={isGuest ? null : (homeData?.todayOverview || null)}
          weeklyTaskCount={isGuest ? 0 : (homeData?.weeklyTaskCount || 0)}
        />
        <Button
          title="View Full Calendar"
          onPress={() => navigation.navigate('Calendar')}
        />
      </ScrollView>

      {isFabOpen && (
        <TouchableWithoutFeedback onPress={() => handleFabStateChange({ isOpen: false })}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      )}

      <FloatingActionButton 
        actions={fabActions}
        onStateChange={handleFabStateChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
});

export default HomeScreen;