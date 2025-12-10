import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface DetailSheetFooterProps {
  buttonText: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const DetailSheetFooter: React.FC<DetailSheetFooterProps> = ({
  buttonText,
  onPress,
  disabled = false,
  icon,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? '#18212B' : '#FFFFFF',
          borderTopColor: theme.isDark ? '#374151' : '#E5E7EB',
          paddingBottom: insets.bottom + SPACING.md,
        },
      ]}>
      {/* Gradient fade mask */}
      <View
        style={[
          styles.gradientMask,
          {
            backgroundColor: theme.isDark ? '#18212B' : '#FFFFFF',
          },
        ]}
      />
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: disabled
              ? theme.isDark
                ? '#1C252E'
                : '#D1D5DB'
              : COLORS.primary,
          },
          disabled && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color="#FFFFFF"
            style={styles.buttonIcon}
          />
        )}
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    borderTopWidth: 1,
    zIndex: 30,
  },
  gradientMask: {
    position: 'absolute',
    top: -48,
    left: 0,
    right: 0,
    height: 48,
    opacity: 0.95,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: -4,
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

