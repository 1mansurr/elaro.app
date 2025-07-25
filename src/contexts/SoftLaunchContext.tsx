import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';

interface SoftLaunchContextType {
  isSoftLaunch: boolean;
  showComingSoonModal: (feature?: string) => void;
  showComingSoonToast: (message: string) => void;
  blockPremiumFeature: (feature: string) => boolean;
  getComingSoonMessage: (feature: string) => string;
}

const SoftLaunchContext = createContext<SoftLaunchContextType | undefined>(undefined);

export const useSoftLaunch = () => {
  const context = useContext(SoftLaunchContext);
  if (!context) {
    throw new Error('useSoftLaunch must be used within a SoftLaunchProvider');
  }
  return context;
};

interface SoftLaunchProviderProps {
  children: ReactNode;
}

export const SoftLaunchProvider: React.FC<SoftLaunchProviderProps> = ({ children }) => {
  // Soft launch disabled, all features enabled
  const [isSoftLaunch] = useState(false);

  const getComingSoonMessage = (feature: string): string => {
    const messages = {
      'study-guide': '🎁 Bonus: AI Study Guide is coming soon! You’ll get personalized learning strategies and advanced study techniques as a free bonus for Oddity members.',
      'spaced-repetition': '🧠 Advanced Spaced Repetition is coming soon! Get intelligent review scheduling and extended intervals.',
      'premium-analytics': '📊 Premium Analytics launching soon! Track your progress with detailed insights and trends.',
      'unlimited-tasks': '🗂️ More tasks coming next week! Plan with fewer limits and organize your academic life.',
      'priority-support': '🎯 Priority Support launching soon! Get faster responses and personalized help.',
      'subscription': 'Become An Oddity to unlock premium features and analytics. Subscriptions open soon!',
      'learning-style': '🧠 Learning Style Discovery is launching soon! Take a quick AI-powered quiz to discover your optimal study strategies.',
      'default': '✨ This Oddity feature is launching soon! Become An Oddity to unlock premium tools and upgrades.',
    };
    return messages[feature as keyof typeof messages] || messages.default;
  };

  const showComingSoonModal = (feature: string = 'default') => {
    const message = getComingSoonMessage(feature);
    Alert.alert(
      '🚀 Become An Oddity',
      `${message}\n\nFull Oddity access launches next week (GHS 5/month). Stay tuned!`,
      [
        { text: 'Got it!', style: 'default' }
      ]
    );
  };

  const showComingSoonToast = (message: string) => {
    // For now, we'll use Alert as a fallback
    // In a real implementation, you'd use a toast library
    Alert.alert('Coming Soon', message, [{ text: 'OK' }]);
  };

  // Do not block any features
  const blockPremiumFeature = (feature: string): boolean => {
    return true;
  };

  const value: SoftLaunchContextType = {
    isSoftLaunch,
    showComingSoonModal,
    showComingSoonToast,
    blockPremiumFeature,
    getComingSoonMessage,
  };

  return (
    <SoftLaunchContext.Provider value={value}>
      {children}
    </SoftLaunchContext.Provider>
  );
}; 