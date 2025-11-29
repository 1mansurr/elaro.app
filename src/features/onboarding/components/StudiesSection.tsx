import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchableSelector } from '@/shared/components';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

export interface StudiesSectionProps {
  selectedCountry: string;
  university: string;
  program: string;
  countryData: string[];
  universityData: string[];
  programData: string[];
  onCountryChange: (country: string) => void;
  onUniversityChange: (university: string) => void;
  onProgramChange: (program: string) => void;
  activeSelectorId: string | null;
  onSelectorOpen: (id: string) => void;
  onInfoPress: () => void;
  onSelectorFocusScroll?: (selectorId: string) => void;
  onCountryComplete?: () => void; // Callback when country selection is complete
  onUniversityComplete?: () => void; // Callback when university selection is complete
}

/**
 * StudiesSection Component
 *
 * Displays the studies information form with country, university, and program selectors
 */
export const StudiesSection: React.FC<StudiesSectionProps> = ({
  selectedCountry,
  university,
  program,
  countryData,
  universityData,
  programData,
  onCountryChange,
  onUniversityChange,
  onProgramChange,
  activeSelectorId,
  onSelectorOpen,
  onInfoPress,
  onSelectorFocusScroll,
  onCountryComplete,
  onUniversityComplete,
}) => {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#ffffff', '#fffbfa']}
        style={styles.cardGradient}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🎓 Your Studies</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>
        <Text style={styles.cardHint}>
          Tell us where you study so we can personalize your experience.
        </Text>

        <View style={styles.fieldGroup}>
          <SearchableSelector
            id="country"
            label="Country *"
            data={countryData}
            selectedValue={selectedCountry}
            onValueChange={onCountryChange}
            placeholder="Select your country..."
            searchPlaceholder="Search for your country"
            showOther={true}
            returnKeyType="done"
            isActive={activeSelectorId === 'country'}
            onOpen={onSelectorOpen}
            onFocusScroll={() => onSelectorFocusScroll?.('country')}
            onSelectionComplete={onCountryComplete}
          />
        </View>

        {selectedCountry && (
          <View style={styles.fieldGroup}>
            <SearchableSelector
              id="university"
              label="University *"
              data={universityData}
              selectedValue={university}
              onValueChange={onUniversityChange}
              placeholder="Select or type your university..."
              searchPlaceholder="Search for your university"
              showOther={true}
              tooltipText="Enter your university manually"
              returnKeyType="done"
              isActive={activeSelectorId === 'university'}
              onOpen={onSelectorOpen}
              onFocusScroll={() => onSelectorFocusScroll?.('university')}
              onSelectionComplete={onUniversityComplete}
            />
          </View>
        )}

        {university && (
          <View style={styles.fieldGroup}>
            <SearchableSelector
              id="program"
              label="Program of Study *"
              data={programData}
              selectedValue={program}
              onValueChange={onProgramChange}
              placeholder="Select or type your program..."
              searchPlaceholder="Search for your program"
              showOther={true}
              tooltipText="Enter your course manually"
              returnKeyType="done"
              isActive={activeSelectorId === 'program'}
              onOpen={onSelectorOpen}
              onFocusScroll={() => onSelectorFocusScroll?.('program')}
            />
          </View>
        )}

        <TouchableOpacity onPress={onInfoPress} style={styles.linkContainer}>
          <Text style={styles.linkText}>Why do we need this?</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.xl,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: SPACING.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg + 1,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  requiredBadge: {
    backgroundColor: '#fff0f0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe0e0',
  },
  requiredText: {
    fontSize: FONT_SIZES.xs,
    color: '#c62828',
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  cardHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  fieldGroup: {
    marginBottom: SPACING.md,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    textDecorationLine: 'underline',
  },
});
