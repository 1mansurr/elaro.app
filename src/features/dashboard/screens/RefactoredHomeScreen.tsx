import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { COLORS } from '@/constants/theme';

import { useHomeScreenState } from '../hooks/useHomeScreenState';
import HomeScreenHeader from '../components/HomeScreenHeader';
import HomeScreenContent from '../components/HomeScreenContent';
import HomeScreenFAB from '../components/HomeScreenFAB';
import HomeScreenModals from '../components/HomeScreenModals';

type RefactoredHomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const RefactoredHomeScreen: React.FC = () => {
  const navigation = useNavigation<RefactoredHomeScreenNavigationProp>();
  const { session } = useAuth();
  const isGuest = !session;
  
  const {
    selectedTask,
    isFabOpen,
    handleViewDetails,
    handleCloseSheet,
    handleFabStateChange,
    handleDismissBanner,
    getPersonalizedTitle,
    shouldShowBanner,
    getTrialDaysRemaining,
  } = useHomeScreenState();

  const handleSubscribePress = () => {
    navigation.navigate('Auth', { mode: 'signup' });
  };

  return (
    <View style={styles.container}>
      <HomeScreenHeader title={getPersonalizedTitle()} />
      
      <HomeScreenContent 
        onFabStateChange={handleFabStateChange}
      />
      
      <HomeScreenFAB 
        onStateChange={handleFabStateChange}
      />
      
      <HomeScreenModals 
        selectedTask={selectedTask}
        onCloseSheet={handleCloseSheet}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

export default RefactoredHomeScreen;
