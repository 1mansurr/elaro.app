import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import PaystackPayment from './PaystackPayment';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/supabase';
import { useSubscription } from '../hooks/useSubscription';

interface AddOddityModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYSTACK_PUBLIC_KEY = 'pk_live_xxxxx'; // TODO: Replace with your real key or import from config
const ODDITY_AMOUNT = 5; // GHS 5.00

const AddOddityModal: React.FC<AddOddityModalProps> = ({ visible, onClose, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    isSubscribed,
    isProcessing: subscriptionProcessing,
    cancelOdditySubscription,
  } = useSubscription();

  const handlePaymentSuccess = async (reference: string) => {
    setIsProcessing(true);
    try {
      if (!user) throw new Error('User not found');
      // Optionally: verify with backend or Paystack API
      await subscriptionService.activateOdditySubscription(user.id);
      await refreshUser();
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('Subscription Error', 'Could not activate your subscription. Please contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.xButton} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.xButtonText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Become an Oddity</Text>
          <Text style={styles.subtitle}>Unlock more study sessions, full AI guide access, and premium features for GHS 5.00/month.</Text>
          <View style={{ width: '100%', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 18, color: '#22c55e', marginRight: 8 }}>✔️</Text>
              <Text style={{ fontSize: 15, color: '#222' }}>Up to 35 total tasks/events</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 18, color: '#22c55e', marginRight: 8 }}>✔️</Text>
              <Text style={{ fontSize: 15, color: '#222' }}>Up to 75 spaced repetition reminders</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 18, color: '#22c55e', marginRight: 8 }}>✔️</Text>
              <Text style={{ fontSize: 15, color: '#222' }}>Full access to the AI Study Guide</Text>
            </View>
          </View>
          {user ? (
            <>
              <PaystackPayment
                email={user.email}
                amount={ODDITY_AMOUNT}
                publicKey={PAYSTACK_PUBLIC_KEY}
                onSuccess={handlePaymentSuccess}
                onCancel={onClose}
              />
              {/* Cancel Subscription Button for Oddity users */}
              {isSubscribed && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  disabled={subscriptionProcessing}
                  onPress={() => {
                    Alert.alert(
                      'Cancel Subscription',
                      'Are you sure you want to cancel your Oddity subscription? You will retain access until the end of your billing period.',
                      [
                        { text: 'No', style: 'cancel' },
                        {
                          text: 'Yes, Cancel',
                          style: 'destructive',
                          onPress: cancelOdditySubscription,
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.cancelButtonText}>
                    {subscriptionProcessing ? 'Cancelling...' : 'Cancel Subscription'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.guestMessage}>
                Please sign up or log in to upgrade to Oddity and unlock premium features.
              </Text>
              <TouchableOpacity style={styles.signupButton} onPress={() => { onClose(); /* Optionally: trigger sign up modal/navigation here */ }}>
                <Text style={styles.signupButtonText}>Sign Up or Log In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  closeButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  guestMessage: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  signupButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  xButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: 8,
  },
  xButtonText: {
    fontSize: 26,
    color: '#888',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddOddityModal; 