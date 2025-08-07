import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  SHADOWS,
  FONT_WEIGHTS,
} from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { sendTestPushNotification } from '../services/notifications';

interface PushTestScreenProps {
  navigation: any;
}

export const PushTestScreen: React.FC<PushTestScreenProps> = ({
  navigation,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<string>('');
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray100,
      backgroundColor: theme.card,
      ...SHADOWS.sm,
    },
    backButton: {
      width: 40,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: theme.text,
      marginLeft: SPACING.md,
    },
    content: {
      flex: 1,
      padding: SPACING.md,
    },
    section: {
      marginBottom: SPACING.lg,
    },
    description: {
      fontSize: FONT_SIZES.md,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    sectionTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: theme.text,
      marginBottom: SPACING.sm,
    },
    tokenBox: {
      backgroundColor: theme.gray50,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: theme.gray100,
    },
    tokenText: {
      fontSize: FONT_SIZES.sm,
      fontFamily: 'monospace',
      color: theme.textSecondary,
      lineHeight: 18,
    },
    buttonGroup: {
      marginBottom: SPACING.xl,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      gap: SPACING.sm,
      ...SHADOWS.sm,
    },
    buttonText: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.semibold as any,
    },
    primaryButton: {
      backgroundColor: theme.primary,
    },
    successButton: {
      backgroundColor: theme.success,
    },
    clearButton: {
      backgroundColor: theme.white,
      borderWidth: 1,
      borderColor: theme.gray100,
    },
    clearButtonText: {
      color: theme.text,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    resultBox: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      backgroundColor: theme.gray50,
      borderColor: theme.gray100,
      borderWidth: 1,
      marginBottom: SPACING.xl,
    },
    resultText: {
      fontSize: FONT_SIZES.md,
      color: theme.text,
      lineHeight: 20,
    },
    instructionList: {
      gap: SPACING.xs,
    },
    instructionItem: {
      fontSize: FONT_SIZES.md,
      color: theme.textSecondary,
    },
  });

  const fetchPushToken = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('pushToken');
      setPushToken(token);

      setLastTestResult(
        token
          ? '✅ Push token retrieved successfully!'
          : '❌ No push token found. Register first.',
      );
    } catch (error) {
      console.error('Fetch error:', error);
      setLastTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!pushToken) {
      Alert.alert('No Token', 'Please fetch the push token first.');
      return;
    }

    try {
      setIsLoading(true);
      setLastTestResult('🔄 Sending test notification...');

      const message = {
        to: pushToken,
        sound: 'default',
        title: '🧪 Test Notification',
        body: 'This is a test notification from ELARO!',
        data: {
          type: 'test',
          screen: 'PushTestScreen',
          timestamp: new Date().toISOString(),
        },
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      if (response.ok) {
        setLastTestResult('✅ Test notification sent! Check your device.');
        Alert.alert('Success', 'Notification sent. Check your device!');
      } else {
        setLastTestResult(`❌ Failed: ${JSON.stringify(result)}`);
        Alert.alert('Error', `Failed to send: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      setLastTestResult(`❌ Error: ${error}`);
      Alert.alert('Error', `Notification error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setPushToken(null);
    setLastTestResult('');
  };

  const handleSendTestPush = async () => {
    setIsLoading(true);
    setLastTestResult('');
    try {
      const token = await AsyncStorage.getItem('pushToken');
      if (!token) {
        setLastTestResult('No push token found.');
        setIsLoading(false);
        return;
      }
      const result = await sendTestPushNotification(token);
      setLastTestResult('Test push notification sent!');
    } catch (error) {
      setLastTestResult('Failed to send test push notification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Push Test</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.description}>
            Test push notifications for your device. You&apos;ll need to first
            fetch your Expo token, then send a test notification.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Push Token</Text>
          <View style={styles.tokenBox}>
            <Text style={styles.tokenText}>
              {pushToken ? pushToken : '— Not retrieved yet —'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={fetchPushToken}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Fetch push token">
            {isLoading ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <>
                <Ionicons
                  name="download-outline"
                  size={18}
                  color={theme.white}
                />
                <Text style={[styles.buttonText, { color: theme.white }]}>
                  Fetch Push Token
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.successButton,
              !pushToken && styles.buttonDisabled,
            ]}
            onPress={sendTestNotification}
            disabled={isLoading || !pushToken}
            accessibilityRole="button"
            accessibilityLabel="Send test notification">
            {isLoading ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color={theme.white} />
                <Text style={[styles.buttonText, { color: theme.white }]}>
                  Send Test Notification
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearResults}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Clear results">
            <Ionicons name="refresh-outline" size={18} color={theme.text} />
            <Text
              style={[
                styles.buttonText,
                styles.clearButtonText,
                { color: theme.text },
              ]}>
              Clear Results
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSendTestPush}
            disabled={isLoading}>
            <Ionicons name="notifications" size={20} color="#fff" />
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              Send Test Push Notification
            </Text>
          </TouchableOpacity>
          {lastTestResult ? (
            <Text style={{ marginTop: 10, color: theme.success }}>
              {lastTestResult}
            </Text>
          ) : null}
        </View>

        {lastTestResult !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.sectionTitle}>Last Result</Text>
            <Text style={styles.resultText}>{lastTestResult}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Steps</Text>
          <View style={styles.instructionList}>
            <Text style={styles.instructionItem}>
              1. Tap &quot;Fetch Push Token&quot;
            </Text>
            <Text style={styles.instructionItem}>
              2. Tap &quot;Send Test Notification&quot;
            </Text>
            <Text style={styles.instructionItem}>
              3. Confirm the notification arrives
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
