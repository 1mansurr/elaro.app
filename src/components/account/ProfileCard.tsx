import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';
import { getAvatarText } from '../../utils/getAvatarText';

interface User {
  name?: string;
  email?: string;
}

interface ProfileCardProps {
  user?: User;
  isGuestUser: boolean;
  onSignUp: () => void;
  scaleAnim: any; // Animated.Value
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  isGuestUser,
  onSignUp,
  scaleAnim,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.avatar}>
          <Text style={styles.avatarText} numberOfLines={1}>
            {getAvatarText(user)}
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.profileDetailsColumn}>
        <Text style={styles.userName} numberOfLines={1}>
          {user?.name || 'Guest User'}
        </Text>
        {isGuestUser && <View style={{ height: 16 }} />}
        {!isGuestUser && (
          <Text style={styles.userEmail} numberOfLines={1}>
            {user?.email}
          </Text>
        )}

        {isGuestUser && (
          <Pressable
            style={styles.signUpButton}
            onPress={onSignUp}
            accessibilityRole="button"
            accessibilityLabel="Sign Up">
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signUpGradient}>
              <Text style={styles.signUpButtonText} numberOfLines={1}>
                Sign Up
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  avatarContainer: {
    marginRight: SPACING.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.white,
  },
  profileDetailsColumn: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  signUpButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  signUpGradient: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  signUpButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.white,
  },
});
