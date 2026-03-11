import { useState, useEffect } from 'react';
import { getOrCreateDeviceId } from '@/utils/deviceId';

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  return deviceId;
}
