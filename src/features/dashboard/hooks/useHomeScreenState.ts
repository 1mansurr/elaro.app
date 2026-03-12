import { useState, useCallback } from 'react';
import { Task } from '@/types';

export const useHomeScreenState = () => {
  // State management
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Handlers
  const handleViewDetails = useCallback((task: Task) => {
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
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    return `${greeting}, there`;
  }, []);

  // Check if should show trial banner
  const shouldShowBanner = useCallback(async () => {
    return false;
  }, []);

  // Calculate trial days remaining
  const getTrialDaysRemaining = useCallback(() => {
    return 0;
  }, []);

  return {
    // State
    selectedTask,
    isFabOpen,
    isBannerDismissed,

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
