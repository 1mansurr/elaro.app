import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

interface RouteParams {
  factorId: string;
}

interface MFAVerificationScreenProps {
  route?: {
    params: RouteParams;
  };
  factors?: any[];
  onVerificationSuccess?: (session: any) => void;
  onVerificationError?: (error: string) => void;
  onCancel?: () => void;
}

const MFAVerificationScreen: React.FC<MFAVerificationScreenProps> = ({
  route,
  factors,
  onVerificationSuccess,
  onVerificationError,
  onCancel,
}) => {
  const factorId = route?.params?.factorId;
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();

  const handleVerify = async () => {
    if (!code) {
      Alert.alert(
        'Error',
        'Please enter the code from your authenticator app.',
      );
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      if (!factorId) {
        throw new Error('Factor ID is required for MFA verification');
      }
      const { challengeId } = await authService.mfa.challenge(factorId);
      await authService.mfa.verify({ factorId, challengeId, code });

      // On success, refresh user state and let the AuthContext handle navigation
      await refreshUser();

      // The onAuthStateChange listener in AuthContext should handle
      // the rest of the login flow, navigating the user into the main app.
    } catch (error: any) {
      console.error('MFA verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message ||
          'Invalid code. Please check your authenticator app and try again.',
      );
      setCode(''); // Clear the code input for retry
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Two-Factor Authentication</Text>

        <Text style={styles.description}>
          Enter the 6-digit code from your authenticator app to complete
          sign-in.
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="Enter 6-digit code"
          value={code}
          onChangeText={setCode}
          keyboardType="numeric"
          maxLength={6}
          autoCapitalize="none"
          autoCorrect={false}
          textAlign="center"
          placeholderTextColor="#999"
          autoFocus
        />

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (!code || code.length !== 6 || isLoading) &&
              styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={!code || code.length !== 6 || isLoading}>
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Check your authenticator app for the current 6-digit code
        </Text>

        <TouchableOpacity
          style={styles.troubleshootButton}
          onPress={() => {
            Alert.alert(
              'Troubleshooting',
              "Make sure your device time is correct and that you're using the right authenticator app for this account.",
              [{ text: 'OK' }],
            );
          }}>
          <Text style={styles.troubleshootButtonText}>Having trouble?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 20,
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
    backgroundColor: '#f8f9fa',
    letterSpacing: 6,
    minHeight: 60,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  troubleshootButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  troubleshootButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default MFAVerificationScreen;
