import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

interface LectureVenueFieldProps {
  venue: string;
  onVenueChange: (venue: string) => void;
}

export const LectureVenueField: React.FC<LectureVenueFieldProps> = ({
  venue,
  onVenueChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.field}>
      <Text
        style={[styles.label, { color: theme.isDark ? '#FFFFFF' : '#374151' }]}>
        Venue
      </Text>
      <View style={styles.venueInputContainer}>
        <Ionicons
          name="location-outline"
          size={20}
          color={theme.isDark ? '#9CA3AF' : '#6B7280'}
          style={styles.venueIcon}
        />
        <TextInput
          style={[
            styles.venueInput,
            {
              backgroundColor: theme.isDark ? '#1C252E' : '#FFFFFF',
              borderColor: theme.isDark ? '#3B4754' : 'transparent',
              color: theme.isDark ? '#FFFFFF' : '#111418',
            },
          ]}
          value={venue}
          onChangeText={onVenueChange}
          placeholder="e.g., Room 404, Main Building"
          placeholderTextColor={theme.isDark ? '#6B7280' : '#9CA3AF'}
          maxLength={200}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.sm,
  },
  venueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  venueIcon: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  venueInput: {
    flex: 1,
    height: 56,
    paddingLeft: SPACING.md + 24,
    paddingRight: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: FONT_SIZES.md,
  },
});
