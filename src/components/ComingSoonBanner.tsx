import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface ComingSoonBannerProps {
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'premium' | 'feature';
  onPress?: () => void;
  style?: any;
}

export const ComingSoonBanner: React.FC<ComingSoonBannerProps> = ({
  title = '✨ Oddity Feature – Become an Oddity',
  subtitle = 'Upgrade to unlock premium tools and upgrades',
  variant = 'default',
  onPress,
  style,
}) => {
  const getGradientColors = (): [string, string] => {
    switch (variant) {
      case 'premium':
        return ['#667eea', '#764ba2'];
      case 'feature':
        return ['#ff6b6b', '#feca57'];
      default:
        return ['#f0f9ff', '#e0f2fe'];
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'premium':
      case 'feature':
        return COLORS.white;
      default:
        return COLORS.blue700;
    }
  };

  const getSubtitleColor = () => {
    switch (variant) {
      case 'premium':
      case 'feature':
        return COLORS.white;
      default:
        return COLORS.blue600;
    }
  };

  const BannerContent = () => (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name="sparkles" 
          size={16} 
          color={getTextColor()} 
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: getTextColor() }]}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: getSubtitleColor() }]}>
          {subtitle}
        </Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={16} 
        color={getTextColor()} 
        style={styles.chevron}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable 
        style={[styles.container, style]} 
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <LinearGradient
          colors={getGradientColors()}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <BannerContent />
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <BannerContent />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginVertical: SPACING.sm,
  },
  gradient: {
    padding: SPACING.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal as any,
  },
  chevron: {
    opacity: 0.7,
  },
}); 