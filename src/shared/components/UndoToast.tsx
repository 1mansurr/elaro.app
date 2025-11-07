import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface UndoToastProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  visible,
  message,
  onUndo,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsAnimatingOut(false);
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      setIsAnimatingOut(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  if (!visible && isAnimatingOut) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}>
      <View style={styles.contentContainer}>
        <Ionicons
          name="trash-outline"
          size={20}
          color={theme.text}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: theme.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onUndo}
          style={[styles.undoButton, { backgroundColor: theme.accent }]}
          activeOpacity={0.8}>
          <Text style={[styles.undoText, { color: theme.white }]}>UNDO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    maxWidth: width - 32,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  undoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  undoText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
});
