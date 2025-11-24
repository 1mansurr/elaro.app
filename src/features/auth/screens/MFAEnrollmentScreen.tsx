import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

const MFAEnrollmentScreen = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    const startEnrollment = async () => {
      try {
        setIsLoading(true);
        const enrollmentData = await authService.mfa.enroll();
        setQrCode(enrollmentData.qrCode);
        setSecret(enrollmentData.secret);
        setFactorId(enrollmentData.factorId);
      } catch (error: any) {
        console.error('MFA enrollment error:', error);
        Alert.alert(
          'Enrollment Failed',
          error.message || 'Could not start MFA enrollment. Please try again.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    startEnrollment();
  }, []);

  const handleVerify = async () => {
    if (!factorId || !code) {
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

    setIsVerifying(true);
    try {
      const { challengeId } = await authService.mfa.challenge(factorId);
      await authService.mfa.verify({ factorId, challengeId, code });

      Alert.alert(
        'Success!',
        'MFA has been enabled successfully! Your account is now more secure.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await refreshUser();
              // Navigate back to settings or profile screen
              // This would typically be handled by navigation
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('MFA verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message ||
          'Invalid code. Please check your authenticator app and try again.',
      );
      setCode(''); // Clear the code input
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Setting up MFA...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Enable Two-Factor Authentication</Text>

        <Text style={styles.description}>
          Scan the QR code below with your authenticator app to set up
          two-factor authentication.
        </Text>

        {qrCode && (
          <View style={styles.qrContainer}>
            <QRCode
              value={qrCode}
              size={200}
              backgroundColor="white"
              color="black"
            />
          </View>
        )}

        {secret && (
          <View style={styles.secretContainer}>
            <Text style={styles.secretLabel}>
              Or enter this secret key manually:
            </Text>
            <Text style={styles.secretText} selectable>
              {secret}
            </Text>
          </View>
        )}

        <Text style={styles.instructionText}>
          After scanning the QR code or entering the secret key, enter the
          6-digit code from your authenticator app below:
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
        />

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (!code || code.length !== 6 || isVerifying) &&
              styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={!code || code.length !== 6 || isVerifying}>
          {isVerifying ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify and Enable MFA</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Popular authenticator apps: Google Authenticator, Authy, Microsoft
          Authenticator, or 1Password
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  secretContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  secretLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  secretText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#007AFF',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    lineHeight: 22,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    letterSpacing: 4,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
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
    fontStyle: 'italic',
  },
});

export default MFAEnrollmentScreen;
