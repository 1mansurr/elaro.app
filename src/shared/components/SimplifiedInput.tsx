import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants/theme';

interface SimplifiedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  required?: boolean;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
}

export const SimplifiedInput: React.FC<SimplifiedInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required = false,
  variant = 'default',
  size = 'medium',
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const themedStyles = useThemedStyles(theme => ({
    container: {
      marginBottom: SPACING.md,
    },
    label: {
      marginBottom: SPACING.xs,
      fontSize: FONT_SIZES.md,
      fontWeight: '500' as const,
      color: theme.text,
    },
    required: {
      color: theme.destructive,
    },
    inputContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: error
        ? theme.destructive
        : isFocused
          ? theme.accent
          : theme.inputBorder,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
    },
    input: {
      flex: 1,
      fontSize: FONT_SIZES.md,
      color: theme.text,
      paddingVertical: SPACING.sm,
    },
    leftIcon: {
      marginRight: SPACING.sm,
    },
    rightIcon: {
      marginLeft: SPACING.sm,
    },
    helperText: {
      marginTop: SPACING.xs,
      fontSize: FONT_SIZES.sm,
      color: error ? theme.destructive : theme.textSecondary,
    },
  }));

  const sizeStyles = useMemo(() => {
    const sizes = {
      small: {
        paddingVertical: SPACING.xs,
        fontSize: FONT_SIZES.sm,
      },
      medium: {
        paddingVertical: SPACING.sm,
        fontSize: FONT_SIZES.md,
      },
      large: {
        paddingVertical: SPACING.md,
        fontSize: FONT_SIZES.lg,
      },
    };
    return sizes[size];
  }, [size]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  return (
    <View style={themedStyles.container}>
      {label && (
        <Text style={themedStyles.label}>
          {label}
          {required && <Text style={themedStyles.required}> *</Text>}
        </Text>
      )}

      <View style={[themedStyles.inputContainer]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={
              error ? themedStyles.required.color : themedStyles.label.color
            }
            style={themedStyles.leftIcon}
          />
        )}

        <TextInput
          {...props}
          style={[themedStyles.input, sizeStyles, style]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={themedStyles.helperText.color}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={themedStyles.rightIcon}>
            <Ionicons
              name={rightIcon}
              size={20}
              color={
                error ? themedStyles.required.color : themedStyles.label.color
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text style={themedStyles.helperText}>{error || helperText}</Text>
      )}
    </View>
  );
};

export default SimplifiedInput;
