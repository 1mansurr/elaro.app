import React from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AuthScreen } from './AuthScreen';

type AuthScreenWrapperParams = {
  AuthScreenWrapper: {
    onClose?: () => void;
  };
};

/**
 * AuthScreenWrapper - A pass-through component that handles onClose logic
 * Either uses the passed prop or falls back to navigation.goBack()
 */
export const AuthScreenWrapper: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AuthScreenWrapperParams, 'AuthScreenWrapper'>>();
  const handleClose = route.params?.onClose ?? (() => { if (navigation.canGoBack()) navigation.goBack(); });

  return <AuthScreen onClose={handleClose} />;
}; 