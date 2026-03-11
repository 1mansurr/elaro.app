import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const DEVICE_ID_KEY = '@elaro/device_id';

let cachedDeviceId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    cachedDeviceId = existing;
    return existing;
  }
  const newId = uuid.v4() as string;
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  cachedDeviceId = newId;
  return newId;
}
