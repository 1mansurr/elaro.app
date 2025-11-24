import { useState, useCallback } from 'react';
import { Task } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { mixpanelService } from '@/services/mixpanel';
import { AnalyticsEvents } from '@/services/analyticsEvents';

export const useHomeScreenState = () => {
  const { session, user } = useAuth();
  const { isPremium } = usePermissions(user);
  const isGuest = !session;

  // State management
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Handlers
  const handleViewDetails = useCallback((task: Task) => {
    mixpanelService.track(AnalyticsEvents.TASK_DETAILS_VIEWED, {
      task_id: task.id,
      task_type: task.type,
      task_title: task.title,
      source: 'home_screen',
      timestamp: new Date().toISOString(),
    });
    setSelectedTask(task);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleFabStateChange = useCallback((state: { isOpen: boolean }) => {
    setIsFabOpen(state.isOpen);
  }, []);

  const handleDismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
  }, []);

  // Get personalized title
  const getPersonalizedTitle = useCallback(() => {
    if (isGuest) {
      return 'Welcome to ELARO';
    }

    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';

    const firstName =
      user?.first_name || user?.user_metadata?.first_name || 'there';
    return `${greeting}, ${firstName}`;
  }, [isGuest, user]);

  // Check if should show trial banner
  const shouldShowBanner = useCallback(async () => {
    if (isGuest || isBannerDismissed) return false;
    return await isPremium();
  }, [isGuest, isBannerDismissed, isPremium]);

  // Calculate trial days remaining
  const getTrialDaysRemaining = useCallback(() => {
    if (!user?.subscription_expires_at) return 0;
    const now = new Date();
    const expiry = new Date(user.subscription_expires_at);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [user?.subscription_expires_at]);

  return {
    // State
    selectedTask,
    isFabOpen,
    isBannerDismissed,
    isGuest,
    user,

    // Handlers
    handleViewDetails,
    handleCloseSheet,
    handleFabStateChange,
    handleDismissBanner,

    // Computed values
    getPersonalizedTitle,
    shouldShowBanner,
    getTrialDaysRemaining,
  };
};
