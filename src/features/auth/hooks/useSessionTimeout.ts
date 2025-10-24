import { useState, useEffect, useCallback } from 'react';
import { SessionTimeoutService } from '../services/SessionTimeoutService';

export interface UseSessionTimeoutReturn {
  checkTimeout: () => Promise<boolean>;
  updateLastActive: () => Promise<void>;
  clearTimeout: () => Promise<void>;
  configure: (config: Partial<import('../services/SessionTimeoutService').SessionTimeoutConfig>) => void;
  config: import('../services/SessionTimeoutService').SessionTimeoutConfig;
}

export const useSessionTimeout = (): UseSessionTimeoutReturn => {
  const [config, setConfig] = useState(() => {
    const service = SessionTimeoutService.getInstance();
    return service.getConfig();
  });

  const sessionTimeoutService = SessionTimeoutService.getInstance();

  const checkTimeout = useCallback(async (): Promise<boolean> => {
    try {
      return await sessionTimeoutService.checkAndHandleTimeout();
    } catch (error) {
      console.error('❌ Error checking session timeout:', error);
      return false;
    }
  }, [sessionTimeoutService]);

  const updateLastActive = useCallback(async (): Promise<void> => {
    try {
      await sessionTimeoutService.updateLastActiveTimestamp();
    } catch (error) {
      console.error('❌ Error updating last active timestamp:', error);
    }
  }, [sessionTimeoutService]);

  const clearTimeout = useCallback(async (): Promise<void> => {
    try {
      await sessionTimeoutService.clearSessionTimeout();
    } catch (error) {
      console.error('❌ Error clearing session timeout:', error);
    }
  }, [sessionTimeoutService]);

  const configure = useCallback((newConfig: Partial<import('../services/SessionTimeoutService').SessionTimeoutConfig>) => {
    sessionTimeoutService.configure(newConfig);
    setConfig(sessionTimeoutService.getConfig());
  }, [sessionTimeoutService]);

  return {
    checkTimeout,
    updateLastActive,
    clearTimeout,
    configure,
    config,
  };
};
