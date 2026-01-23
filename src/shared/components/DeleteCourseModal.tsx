import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';

interface DeleteCourseModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  courseName?: string;
  isLoading?: boolean;
}

export const DeleteCourseModal: React.FC<DeleteCourseModalProps> = ({
  visible,
  onClose,
  onConfirm,
  courseName,
  isLoading = false,
}) => {
  const { theme, isDark } = useTheme();
  const [scaleAnim] = React.useState(new Animated.Value(0.95));
  const [opacityAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.surface || '#FFFFFF',
              },
            ]}>
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    isDark ? '#dc262620' : '#fee2e2',
                },
              ]}>
              <View
                style={[
                  styles.iconRing,
                  {
                  backgroundColor:
                    isDark ? '#dc262610' : '#fee2e280',
                  },
                ]}
              />
              <Ionicons
                name="trash"
                size={32}
                color={isDark ? '#f87171' : '#dc2626'}
              />
            </View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: theme.text }]}>
                Delete Course
              </Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                Are you sure you want to delete this course? This action cannot
                be undone.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {/* Delete Button */}
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  isLoading && styles.deleteButtonDisabled,
                ]}
                onPress={onConfirm}
                disabled={isLoading}
                activeOpacity={0.8}>
                <Text style={styles.deleteButtonText}>
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor:
                      isDark ? '#ffffff10' : '#f0f2f4',
                  },
                ]}
                onPress={onClose}
                disabled={isLoading}
                activeOpacity={0.8}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  deleteButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.015,
  },
});
