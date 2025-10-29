import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { COLORS } from '@/constants/theme';

export const AuthIssueModal: React.FC = () => {
  const { authIssue, timedOut, retryAuth } = useAuth();
  const { isOffline } = useNetwork();

  const visible = Boolean(authIssue || timedOut);

  const { title, message, primary } = useMemo(() => {
    if (isOffline || authIssue === 'network') {
      return {
        title: 'No Internet Connection',
        message: 'We can’t connect right now. Please check your internet connection and try again.',
        primary: 'Retry',
      };
    }
    return {
      title: 'Service Unavailable',
      message: 'We’re experiencing technical issues. Our team is working on it. Please try again shortly.',
      primary: 'Retry',
    };
  }, [authIssue, timedOut, isOffline]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.primary]} onPress={retryAuth}>
              <Text style={styles.primaryText}>{primary}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '86%',
    borderRadius: 12,
    backgroundColor: COLORS.card,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  primaryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default AuthIssueModal;


