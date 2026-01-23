import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  optional?: boolean;
  multiline?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  placeholderHint?: string; // For separate placeholder text
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  optional = false,
  value,
  onFocus,
  onBlur,
  multiline = false,
  maxLength,
  showCharacterCount = false,
  placeholderHint,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value, animatedValue]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const labelTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const labelFontSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const currentLength = value ? String(value).length : 0;
  const isNearLimit = maxLength && currentLength > maxLength * 0.8;

  return (
    <View style={styles.container}>
      <TextInput
        {...props}
        value={value}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            borderColor: isFocused ? '#135bec' : '#dbdfe6',
            backgroundColor: theme.surface || '#FFFFFF',
            color: theme.text,
            minHeight: multiline ? 100 : undefined,
          },
        ]}
        placeholder=""
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor="transparent"
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      <Animated.View
        style={[
          styles.label,
          {
            transform: [{ translateY: labelTranslateY }],
          },
        ]}
        pointerEvents="none">
        <Animated.Text
          style={[
            {
              fontSize: labelFontSize,
              color: isFocused ? '#135bec' : '#6b7280',
            },
          ]}>
          {label}
          {optional && <Text style={styles.optionalText}> (Optional)</Text>}
        </Animated.Text>
      </Animated.View>
      {isFocused && placeholderHint && (
        <Text style={styles.placeholderHint}>{placeholderHint}</Text>
      )}
      {showCharacterCount && maxLength && (
        <Text
          style={[
            styles.characterCount,
            isNearLimit ? styles.characterCountWarning : undefined,
          ]}>
          {currentLength}/{maxLength}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
    fontSize: 16,
  },
  inputMultiline: {
    paddingTop: 20,
    paddingBottom: 32, // Extra space for character counter
  },
  label: {
    position: 'absolute',
    left: 16,
    top: 14,
  },
  optionalText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#9ca3af',
  },
  placeholderHint: {
    position: 'absolute',
    left: 16,
    top: 40,
    fontSize: 16,
    color: '#616f8940',
  },
  characterCount: {
    position: 'absolute',
    right: 16,
    bottom: 8,
    fontSize: 12,
    color: '#9ca3af',
  },
  characterCountWarning: {
    color: '#f59e0b',
  },
});
