import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface VenueCardProps {
  venue: string;
  onVenueChange: (text: string) => void;
  onFocus: () => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  onVenueChange,
  onFocus,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface || '#FFFFFF',
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.venueSection}>
        <View style={styles.venueSectionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="location-outline" size={20} color="#16a34a" />
          </View>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Venue</Text>
        </View>
        <TextInput
          style={[
            styles.venueInput,
            {
              backgroundColor: theme.surface || '#FFFFFF',
              borderColor: '#dbdfe6',
              color: theme.text,
            },
          ]}
          value={venue}
          onChangeText={onVenueChange}
          onFocus={onFocus}
          placeholder="e.g. Room 404, Main Building"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  venueSection: {
    padding: 16,
  },
  venueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  venueInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
});
