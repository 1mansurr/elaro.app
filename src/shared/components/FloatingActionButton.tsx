import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Animated,
  Text,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '@/constants/theme';

interface Action {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

interface FloatingActionButtonProps {
  actions: Action[];
  onStateChange?: (state: { isOpen: boolean; animation: Animated.Value }) => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ actions, onStateChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const handleToggle = () => {
    const toValue = isOpen ? 0 : 1;
    
    // Stop any ongoing animation before starting a new one
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    const newAnimation = Animated.spring(animation, {
      toValue,
      friction: 6,
      useNativeDriver: false,
    });
    
    animationRef.current = newAnimation;
    newAnimation.start();
    
    const newOpenState = !isOpen;
    setIsOpen(newOpenState);
    if (onStateChange) {
      onStateChange({ isOpen: newOpenState, animation });
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

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
      {actions.map((action, index) => {
        const translation = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(index + 1) * 65],
        });
        
        const opacity = animation.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.actionContainer,
              { 
                transform: [{ translateY: translation }],
                opacity: opacity,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionItem, { backgroundColor: action.backgroundColor || COLORS.primary }]}
              onPress={() => {
                handleToggle();
                action.onPress();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon} size={action.size || 24} color={action.color || 'white'} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <Animated.View style={rotation}>
          <Ionicons name="add" size={32} color="white" />
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
    alignItems: 'flex-end',
    zIndex: 10, // Higher than backdrop
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginTop: 10,
  },
  actionContainer: {
    position: 'absolute',
    right: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    minWidth: 200,
  },
  actionLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});

export default FloatingActionButton;