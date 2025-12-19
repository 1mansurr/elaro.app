import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface RecurrenceCardProps {
  repeats: boolean;
  recurrence: 'weekly' | 'bi-weekly' | null;
  onToggle: (value: boolean) => void;
  onSelect: (option: 'weekly' | 'bi-weekly') => void;
}

const recurrenceOptions: Array<'weekly' | 'bi-weekly'> = [
  'weekly',
  'bi-weekly',
];

export const RecurrenceCard: React.FC<RecurrenceCardProps> = ({
  repeats,
  recurrence,
  onToggle,
  onSelect,
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
      <View style={styles.repeatHeader}>
        <View style={styles.repeatHeaderLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="repeat-outline" size={20} color="#16a34a" />
          </View>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Repeat</Text>
        </View>
        <Switch
          value={repeats}
          onValueChange={onToggle}
          trackColor={{ false: '#e5e7eb', true: '#135bec' }}
          thumbColor="#ffffff"
        />
      </View>

      {repeats && (
        <View style={styles.frequencySection}>
          <Text style={[styles.frequencyLabel, { color: '#64748b' }]}>
            Frequency
          </Text>
          <View style={styles.frequencyGrid}>
            {recurrenceOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.frequencyButton,
                  recurrence === option && styles.frequencyButtonActive,
                  {
                    backgroundColor:
                      recurrence === option
                        ? '#135bec20'
                        : theme.surface || '#FFFFFF',
                    borderColor:
                      recurrence === option ? '#135bec33' : theme.border,
                  },
                ]}
                onPress={() => onSelect(option)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.frequencyButtonText,
                    {
                      color: recurrence === option ? '#135bec' : theme.text,
                      fontWeight: recurrence === option ? '600' : '500',
                    },
                  ]}>
                  {option === 'bi-weekly' ? 'Every 2 Weeks' : 'Every Week'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  repeatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  frequencySection: {
    padding: 16,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyButtonActive: {
    borderWidth: 1,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
