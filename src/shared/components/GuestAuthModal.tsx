import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface GuestAuthModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onSignIn: () => void;
  actionType: 'Study Session' | 'Assignment' | 'Lecture' | 'Course';
}

const GuestAuthModal: React.FC<GuestAuthModalProps> = ({
  isVisible,
  onClose,
  onSignUp,
  onSignIn,
  actionType,
}) => {
  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={
                actionType === 'Study Session' ? 'book-outline' :
                actionType === 'Assignment' ? 'document-text-outline' :
                'school-outline'
              } 
              size={32} 
              color={COLORS.primary} 
            />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Save Your {actionType}</Text>
          <Text style={styles.message}>
            Create an account to save and manage your {actionType.toLowerCase()}s. 
            It's completely free and takes less than a minute!
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.signUpButton} onPress={onSignUp}>
            <Text style={styles.signUpButtonText}>Sign Up for Free</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.signInButton} onPress={onSignIn}>
            <Text style={styles.signInButtonText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    alignSelf: 'center',
    marginTop: '20%',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: SPACING.sm,
  },
  content: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    width: '100%',
    gap: SPACING.md,
  },
  signUpButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  signUpButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  signInButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  signInButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
});

export default GuestAuthModal;
