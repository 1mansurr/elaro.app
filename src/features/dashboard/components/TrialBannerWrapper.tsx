import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import TrialBanner from './TrialBanner';

interface TrialBannerWrapperProps {
  user: User | null;
  isPremium: () => Promise<boolean>;
  onPressSubscribe: () => void;
  onDismiss: () => void;
}

export const TrialBannerWrapper: React.FC<TrialBannerWrapperProps> = ({
  user,
  isPremium,
  onPressSubscribe,
  onDismiss,
}) => {
  const [premiumStatus, setPremiumStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!user) {
        setPremiumStatus(false);
        setLoading(false);
        return;
      }

      try {
        const premium = await isPremium();
        setPremiumStatus(premium);
      } catch (error) {
        console.error('❌ Error checking premium status:', error);
        setPremiumStatus(false);
      } finally {
        setLoading(false);
      }
    };

    checkPremiumStatus();
  }, [user, isPremium]);

  if (loading || premiumStatus === null) {
    return null; // Don't show banner while loading
  }

  return (
    <TrialBanner
      daysRemaining={premiumStatus ? 7 : 0}
      onPressSubscribe={onPressSubscribe}
      onDismiss={onDismiss}
    />
  );
};
