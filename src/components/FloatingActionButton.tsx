// FILE: src/components/FloatingActionButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
};

interface Props {
  actions: Action[];
  isOpen?: boolean; // Prop to control state from parent
  onStateChange?: (state: { open: boolean }) => void; // Callback to notify parent of state change
}

const FloatingActionButton: React.FC<Props> = ({ actions, isOpen, onStateChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(isOpen || false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sync internal state if parent-controlled state changes
    if (isOpen !== undefined && isOpen !== isMenuOpen) {
      handleToggle();
    }
  }, [isOpen]);

  const handleToggle = () => {
    const toValue = isMenuOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    const newOpenState = !isMenuOpen;
    setIsMenuOpen(newOpenState);
    onStateChange?.({ open: newOpenState });
  };

  const rotation = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      {isMenuOpen && (
        <>
          {actions.map((action, index) => {
            const translation = animation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -(index + 1) * 60],
            });
            return (
              <Animated.View
                key={index}
                style={[
                  styles.actionButton,
                  {
                    transform: [{ translateY: translation }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.actionCircle}
                  onPress={() => {
                    handleToggle();
                    action.onPress();
                  }}
                >
                  <Ionicons name={action.icon} size={action.size || 24} color="white" />
                </TouchableOpacity>
                <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
              </Animated.View>
            );
          })}
        </>
      )}
      <TouchableOpacity style={styles.menuButton} onPress={handleToggle}>
        <Animated.View style={rotation}>
          <Ionicons name={isMenuOpen ? "close" : "add"} size={30} color="white" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'center',
  },
  menuButton: {
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButton: {
    position: 'absolute',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    right: 0,
    minWidth: 200,
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 16,
    color: '#333',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    maxWidth: 150,
  },
});

export default FloatingActionButton;