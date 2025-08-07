import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
  SHADOWS,
} from '../../constants/theme';
import { CalendarItem, EVENT_COLORS_DARKENED } from '../../constants/calendar';
import SpacedRepetitionBadge from '../SpacedRepetitionBadge';

interface CalendarItemCardProps {
  item: CalendarItem;
  onPress: (item: CalendarItem) => void;
}

export const CalendarItemCard: React.FC<CalendarItemCardProps> = ({
  item,
  onPress,
}) => {
  const colors = EVENT_COLORS_DARKENED[item.type];
  const isAllDay = item.time === 'All Day';

  return (
    <TouchableOpacity
      style={[styles.container, item.completed && styles.completedContainer]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.time}`}
      accessibilityHint="Double tap to view details">
      <LinearGradient
        colors={colors.gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text
                style={[styles.title, item.completed && styles.completedText]}>
                {item.title}
              </Text>
              {item.hasSpacedRepetition && (
                <SpacedRepetitionBadge type="advanced" size="small" />
              )}
            </View>
            <View style={styles.timeContainer}>
              <Ionicons
                name={isAllDay ? 'time-outline' : 'time'}
                size={16}
                color={COLORS.white}
              />
              <Text style={styles.timeText}>
                {isAllDay ? 'All Day' : item.time}
              </Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.footer}>
            {item.hasSpacedRepetition && item.srRemaining !== undefined && (
              <View style={styles.srProgress}>
                <Text style={styles.srText}>
                  SR: {item.srRemaining}/{item.srTotal}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(item.srRemaining / (item.srTotal || 1)) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {item.isRepeating && (
              <View style={styles.repeatIndicator}>
                <Feather name="repeat" size={14} color={COLORS.white} />
                <Text style={styles.repeatText}>Repeating</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  completedContainer: {
    opacity: 0.7,
  },
  gradient: {
    padding: SPACING.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.white,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.white,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white + 'CC',
    marginBottom: SPACING.sm,
    lineHeight: FONT_SIZES.sm * 1.4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  srProgress: {
    flex: 1,
  },
  srText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    marginBottom: 2,
  },
  progressBar: {
    height: 2,
    backgroundColor: COLORS.white + '40',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 1,
  },
  repeatIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  repeatText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
  },
});
