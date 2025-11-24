import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  color?: string;
}

interface ActionMenuProps {
  actions: Action[];
  isVisible: boolean;
  animation?: Animated.Value;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  actions,
  isVisible,
  animation,
}) => {
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {actions.map((action, index) => {
        const translation =
          animation?.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(index + 1) * 65],
          }) || 0;

        const opacity =
          animation?.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          }) || 1;

        return (
          <Animated.View
            key={index}
            style={[
              styles.actionContainer,
              {
                transform: [{ translateY: translation }],
                opacity: opacity,
              },
            ]}>
            <TouchableOpacity
              style={[
                styles.actionItem,
                { backgroundColor: action.backgroundColor || COLORS.primary },
              ]}
              onPress={action.onPress}
              activeOpacity={0.8}>
              <Ionicons
                name={action.icon}
                size={24}
                color={action.color || 'white'}
              />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'flex-end',
    zIndex: 10,
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

export default ActionMenu;
