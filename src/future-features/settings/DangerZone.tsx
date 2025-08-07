import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';

interface DangerZoneProps {
  onLogout: () => void;
  onDelete: () => void;
  scaleAnim: any; // Animated.Value
}

export const DangerZone: React.FC<DangerZoneProps> = ({
  onLogout,
  onDelete,
  scaleAnim,
}) => {
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: onLogout,
        },
      ],
      { cancelable: true },
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: onDelete,
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Account</Text>

      <Pressable
        style={styles.dangerItem}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Sign out of account"
        accessibilityHint="Double tap to confirm sign out">
        <View style={styles.dangerIcon}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.warning} />
        </View>
        <View style={styles.dangerContent}>
          <Text style={styles.dangerTitle}>Sign Out</Text>
          <Text style={styles.dangerSubtitle}>Sign out of your account</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textSecondary}
        />
      </Pressable>

      <Pressable
        style={styles.dangerItem}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete account permanently"
        accessibilityHint="Double tap to confirm account deletion">
        <View style={styles.dangerIcon}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </View>
        <View style={styles.dangerContent}>
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text style={styles.dangerSubtitle}>
            Permanently delete your account
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textSecondary}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.error + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  dangerContent: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  dangerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
