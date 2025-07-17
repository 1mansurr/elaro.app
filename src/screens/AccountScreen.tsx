import React, { useState } from 'react';
import { ScrollView, Animated, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useBouncePress } from '../hooks/useBouncePress';
import { useSoftLaunch } from '../contexts/SoftLaunchContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ProfileCard,
  PlanCard,
  SettingsSection,
  DangerZone,
  CelebrationModal,
} from '../components/account';
import { ComingSoonBanner } from '../components/ComingSoonBanner';
import AddOddityModal from '../components/AddOddityModal';

import { COLORS, SPACING } from '../constants/theme';

const AccountScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user, signOut, session } = useAuth();
  const { isSubscribed } = useSubscription();
  const { scaleAnim, handlePress } = useBouncePress();
  const { showComingSoonModal } = useSoftLaunch();
  const { mode, toggleTheme, isDark, theme } = useTheme();
  
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showOddityModal, setShowOddityModal] = useState(false);

  const isGuestUser = !session;

  const handleUpgrade = () => {
    setShowOddityModal(true);
  };

  const handleSignUp = () => {
    navigation.navigate('Auth' as never);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.reset({ index: 0, routes: [{ name: 'Launch' as never }] });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDelete = () => {
    console.log('Account deletion would be handled here');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ padding: 24, transform: [{ scale: scaleAnim }] }}>
          <ProfileCard
            user={user || undefined}
            isGuestUser={isGuestUser}
            onSignUp={handleSignUp}
            scaleAnim={scaleAnim}
          />

          {/* Theme Toggle */}
          {/* Removed dark mode toggle for now */}
          
          {/* PlanCard (Oddity/Origin plan card) */}
          <PlanCard
            isSubscribed={isSubscribed}
            onUpgrade={handleUpgrade}
            isUpgrading={isUpgrading}
          />
          
          <SettingsSection navigation={navigation} />
          
          <DangerZone
            onLogout={handleLogout}
            onDelete={handleDelete}
            scaleAnim={scaleAnim}
          />
        </Animated.View>

        <FooterVersion />
      </ScrollView>

      <CelebrationModal
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
      <AddOddityModal
        visible={showOddityModal}
        onClose={() => setShowOddityModal(false)}
        onSuccess={() => setShowCelebration(true)}
      />
    </SafeAreaView>
  );
};

const FooterVersion = () => {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <Text style={{ fontSize: 13, color: theme.textSecondary }}>ELARO Version 1.0.0</Text>
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  content: {
    padding: SPACING.lg,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  versionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

export default AccountScreen;

