import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  UsageLimitPaywall,
  LimitType,
} from '@/shared/components/UsageLimitPaywall';
import { UpgradeSuccessModal } from '@/shared/components/UpgradeSuccessModal';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';

interface PendingAction {
  route: keyof RootStackParamList;
  params?: any;
}

interface UsageLimitPaywallState {
  isVisible: boolean;
  limitType: LimitType;
  currentUsage: number;
  maxLimit: number;
  actionLabel: string;
  pendingAction: PendingAction | null;
}

interface UsageLimitPaywallContextType {
  showUsageLimitPaywall: (
    limitType: LimitType,
    currentUsage: number,
    maxLimit: number,
    actionLabel: string,
    pendingAction: PendingAction | null,
  ) => void;
  hideUsageLimitPaywall: () => void;
}

const UsageLimitPaywallContext = createContext<
  UsageLimitPaywallContextType | undefined
>(undefined);

export const UsageLimitPaywallProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [paywallState, setPaywallState] =
    useState<UsageLimitPaywallState | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const showUsageLimitPaywall = useCallback(
    (
      limitType: LimitType,
      currentUsage: number,
      maxLimit: number,
      actionLabel: string,
      pendingAction: PendingAction | null,
    ) => {
      setPaywallState({
        isVisible: true,
        limitType,
        currentUsage,
        maxLimit,
        actionLabel,
        pendingAction,
      });
    },
    [],
  );

  const hideUsageLimitPaywall = useCallback(() => {
    setPaywallState(null);
  }, []);

  const handleUpgradeSuccess = useCallback(() => {
    // Store pending action before clearing paywall state
    if (paywallState?.pendingAction) {
      setPendingAction(paywallState.pendingAction);
    }
    hideUsageLimitPaywall();
    setShowSuccessModal(true);
  }, [hideUsageLimitPaywall, paywallState]);

  const handleSuccessModalClose = useCallback(() => {
    setShowSuccessModal(false);

    // Retry the pending action - only if navigation is ready
    if (pendingAction) {
      try {
        // Check if navigation is available and ready
        if (navigation && typeof navigation.navigate === 'function') {
          const { route, params } = pendingAction;
          navigation.navigate(route as any, params);
          // Clear pending action after navigation
          setPendingAction(null);
        } else {
          // Navigation not ready yet, keep pending action for later
          console.warn('Navigation not ready, keeping pending action');
        }
      } catch (error) {
        // Navigation error - keep pending action for retry
        console.warn('Navigation error in handleSuccessModalClose:', error);
      }
    }
  }, [pendingAction, navigation]);

  return (
    <UsageLimitPaywallContext.Provider
      value={{ showUsageLimitPaywall, hideUsageLimitPaywall }}>
      {children}
      {paywallState && (
        <UsageLimitPaywall
          isVisible={paywallState.isVisible}
          onClose={hideUsageLimitPaywall}
          limitType={paywallState.limitType}
          currentUsage={paywallState.currentUsage}
          maxLimit={paywallState.maxLimit}
          actionLabel={paywallState.actionLabel}
          onUpgradeSuccess={handleUpgradeSuccess}
        />
      )}
      <UpgradeSuccessModal
        isVisible={showSuccessModal}
        onClose={handleSuccessModalClose}
        onContinue={handleSuccessModalClose}
      />
    </UsageLimitPaywallContext.Provider>
  );
};

export const useUsageLimitPaywall = () => {
  const context = useContext(UsageLimitPaywallContext);
  if (!context) {
    throw new Error(
      'useUsageLimitPaywall must be used within UsageLimitPaywallProvider',
    );
  }
  return context;
};
