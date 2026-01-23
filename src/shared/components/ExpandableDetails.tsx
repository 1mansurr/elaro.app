import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface ExpandableDetailsProps {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const ExpandableDetails: React.FC<ExpandableDetailsProps> = ({
  summary,
  children,
  defaultOpen = false,
}) => {
  const { theme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [rotateAnim] = useState(new Animated.Value(defaultOpen ? 1 : 0));

  const toggle = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.timing(rotateAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View>
      <TouchableOpacity
        onPress={toggle}
        style={[
          styles.summary,
          {
            backgroundColor: theme.background,
          },
        ]}
        activeOpacity={0.7}>
        {summary}
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? '#6B7280' : '#9CA3AF'}
          />
        </Animated.View>
      </TouchableOpacity>
      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingLeft: 72, // Match indentation from HTML (4.5rem = 72px)
  },
});
