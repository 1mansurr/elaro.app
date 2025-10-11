import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Factor } from '@supabase/supabase-js';
import MFAVerificationScreen from './MFAVerificationScreen';

interface EnhancedAuthScreenProps {
  onClose?: () => void;
  onAuthSuccess?: () => void;
  mode?: 'signup' | 'signin';
}

export default function EnhancedAuthScreen({
  onClose,
  onAuthSuccess,
  mode: initialMode = 'signup',
}: EnhancedAuthScreenProps) {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // MFA state
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<Factor[]>([]);
  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });
  
  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    
    if (currentMode === 'signup') {
      if (!firstName.trim()) {
        Alert.alert('First Name is required for sign up.');
        return;
      }
      if (!agreedToTerms) {
        Alert.alert(
          'Agreement Required',
          'You must agree to the Terms of Service and Privacy Policy to sign up.',
        );
        return;
      }
    }
    
    setLoading(true);
    try {
      if (currentMode === 'signup') {
        const { error } = await signUp({ 
          email, 
          password, 
          firstName: firstName.trim(), 
          lastName: lastName.trim() 
        });
        
        if (error) {
          Alert.alert('Authentication Failed', error.message);
        } else {
          onAuthSuccess?.();
        }
      } else {
        // Handle sign in with potential MFA
        const result = await signIn({ email, password });
        
        if (result.error) {
          Alert.alert('Authentication Failed', result.error.message);
        } else if (result.requiresMFA && result.factors) {
          // Store credentials and show MFA verification
          setLoginCredentials({ email, password });
          setMfaFactors(result.factors);
          setShowMFAVerification(true);
        } else {
          // Regular login successful
          onAuthSuccess?.();
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = (session: any) => {
    setShowMFAVerification(false);
    onAuthSuccess?.();
  };

  const handleMFAError = (error: string) => {
    setShowMFAVerification(false);
    Alert.alert('MFA Verification Failed', error);
  };

  const handleMFACancel = () => {
    setShowMFAVerification(false);
    setLoginCredentials({ email: '', password: '' });
    setMfaFactors([]);
  };

  if (showMFAVerification) {
    return (
      <MFAVerificationScreen
        factors={mfaFactors}
        onVerificationSuccess={handleMFASuccess}
        onVerificationError={handleMFAError}
        onCancel={handleMFACancel}
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {currentMode === 'signup' ? 'Create Account' : 'Sign In'}
          </Text>
          <Text style={styles.subtitle}>
            {currentMode === 'signup' 
              ? 'Join ELARO to organize your studies' 
              : 'Welcome back to ELARO'
            }
          </Text>
        </View>

        <View style={styles.form}>
          {currentMode === 'signup' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {currentMode === 'signup' && (
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
              >
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.link}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.authButton, loading && styles.disabledButton]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.authButtonText}>
                {currentMode === 'signup' ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => setCurrentMode(currentMode === 'signup' ? 'signin' : 'signup')}
            disabled={loading}
          >
            <Text style={styles.switchModeText}>
              {currentMode === 'signup' 
                ? 'Already have an account? Sign In' 
                : 'Need an account? Sign Up'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  termsContainer: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  link: {
    color: '#007AFF',
    fontWeight: '500',
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
