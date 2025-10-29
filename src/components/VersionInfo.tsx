/**
 * Version Info Component
 * 
 * Displays API version information and migration recommendations
 * to help users understand version status and upgrade paths.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApiVersion } from '../hooks/useVersionedApi';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface VersionInfoProps {
  showDetails?: boolean;
  onUpgrade?: () => void;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ 
  showDetails = false, 
  onUpgrade 
}) => {
  const {
    currentVersion,
    migrationRecommendations,
    checkingCompatibility,
    checkCompatibility,
    upgradeToLatest,
  } = useApiVersion();

  const [showRecommendations, setShowRecommendations] = useState(false);

  const handleUpgrade = async () => {
    try {
      const upgraded = await upgradeToLatest();
      if (upgraded) {
        Alert.alert(
          'API Upgraded',
          'Your API has been upgraded to the latest version.',
          [{ text: 'OK' }]
        );
        onUpgrade?.();
      } else {
        Alert.alert(
          'No Upgrade Available',
          'You are already using the latest API version.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Upgrade Failed',
        'Failed to upgrade API version. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCheckCompatibility = async () => {
    await checkCompatibility();
    setShowRecommendations(true);
  };

  const hasRecommendations = migrationRecommendations.length > 0;

  if (!showDetails && !hasRecommendations) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.versionInfo}>
          <Ionicons 
            name="information-circle" 
            size={16} 
            color={COLORS.textSecondary} 
          />
          <Text style={styles.versionText}>
            API Version: {currentVersion}
          </Text>
        </View>
        
        {hasRecommendations && (
          <TouchableOpacity
            style={styles.warningButton}
            onPress={() => setShowRecommendations(!showRecommendations)}
          >
            <Ionicons 
              name="warning" 
              size={16} 
              color={COLORS.warning} 
            />
            <Text style={styles.warningText}>
              {migrationRecommendations.length} recommendation{migrationRecommendations.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showRecommendations && hasRecommendations && (
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Migration Recommendations:</Text>
          {migrationRecommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Ionicons 
                name="arrow-forward" 
                size={12} 
                color={COLORS.textSecondary} 
              />
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
              disabled={checkingCompatibility}
            >
              <Ionicons 
                name="arrow-up" 
                size={16} 
                color={COLORS.white} 
              />
              <Text style={styles.upgradeButtonText}>
                {checkingCompatibility ? 'Checking...' : 'Upgrade API'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.checkButton}
              onPress={handleCheckCompatibility}
              disabled={checkingCompatibility}
            >
              <Ionicons 
                name="refresh" 
                size={16} 
                color={COLORS.primary} 
              />
              <Text style={styles.checkButtonText}>
                {checkingCompatibility ? 'Checking...' : 'Check Again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showDetails && (
        <View style={styles.detailsContainer}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={handleCheckCompatibility}
            disabled={checkingCompatibility}
          >
            <Ionicons 
              name="settings" 
              size={16} 
              color={COLORS.primary} 
            />
            <Text style={styles.detailsButtonText}>
              {checkingCompatibility ? 'Checking...' : 'API Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    margin: SPACING.sm,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  versionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  warningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.warning + '20',
    borderRadius: BORDER_RADIUS.sm,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  recommendationsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  recommendationsTitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.semibold as any,
    marginBottom: SPACING.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  recommendationText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  upgradeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  checkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  checkButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  detailsContainer: {
    marginTop: SPACING.sm,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
  },
  detailsButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
});

export default VersionInfo;
