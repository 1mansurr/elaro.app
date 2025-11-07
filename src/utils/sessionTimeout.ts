import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ACTIVE_TIMESTAMP_KEY = 'lastActiveTimestamp';
const SESSION_TIMEOUT_DAYS = 30;

/**
 * Update the last active timestamp to the current time
 */
export const updateLastActiveTimestamp = async (): Promise<void> => {
  try {
    const timestamp = Date.now().toString();
    await AsyncStorage.setItem(LAST_ACTIVE_TIMESTAMP_KEY, timestamp);
    console.log(
      '✅ Last active timestamp updated:',
      new Date(parseInt(timestamp)).toISOString(),
    );
  } catch (error) {
    console.error('❌ Error updating last active timestamp:', error);
  }
};

/**
 * Get the last active timestamp
 */
export const getLastActiveTimestamp = async (): Promise<number | null> => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_ACTIVE_TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.error('❌ Error getting last active timestamp:', error);
    return null;
  }
};

/**
 * Check if the session has expired based on the last active timestamp
 * @returns true if session has expired, false otherwise
 */
export const isSessionExpired = async (): Promise<boolean> => {
  try {
    const lastActiveTimestamp = await getLastActiveTimestamp();

    if (!lastActiveTimestamp) {
      // If there's no timestamp, consider it as a new session and set current time
      await updateLastActiveTimestamp();
      return false;
    }

    const now = Date.now();
    const timeDiff = now - lastActiveTimestamp;
    const daysSinceLastActive = timeDiff / (1000 * 60 * 60 * 24); // Convert to days

    console.log(`📅 Days since last active: ${daysSinceLastActive.toFixed(2)}`);

    // Check if more than 30 days have passed
    if (daysSinceLastActive > SESSION_TIMEOUT_DAYS) {
      console.log('⏰ Session expired due to inactivity');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error checking session expiration:', error);
    return false;
  }
};

/**
 * Clear the last active timestamp (useful when logging out)
 */
export const clearLastActiveTimestamp = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LAST_ACTIVE_TIMESTAMP_KEY);
    console.log('✅ Last active timestamp cleared');
  } catch (error) {
    console.error('❌ Error clearing last active timestamp:', error);
  }
};
