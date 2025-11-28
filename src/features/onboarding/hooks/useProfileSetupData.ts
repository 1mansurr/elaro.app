import { useMemo } from 'react';
import countriesData from '@/data/countries.json';
import universities from '@/data/universities.json';
import programsData from '@/data/programs.json';

export interface UseProfileSetupDataReturn {
  countryData: string[];
  universityData: string[];
  programData: string[];
}

/**
 * Custom hook for processing profile setup data
 * 
 * Processes and filters data for country, university, and program selectors
 * 
 * @param selectedCountry - Currently selected country (filters universities)
 * @returns Processed data arrays for selectors
 */
export const useProfileSetupData = (
  selectedCountry: string,
): UseProfileSetupDataReturn => {
  // Filter universities based on the selected country
  const universityData = useMemo(() => {
    if (!selectedCountry) return [];
    return universities
      .filter(uni => uni.country === selectedCountry)
      .map(uni => uni.name)
      .sort();
  }, [selectedCountry]);

  // Extract program names for the selector
  const programData = useMemo(() => {
    return programsData.categories
      .flatMap(category =>
        category.subfields.flatMap(subfield => subfield.programs),
      )
      .filter((program): program is string => program !== undefined)
      .sort();
  }, []);

  // Extract country names for the selector
  const countryData = useMemo(() => {
    return countriesData.countries.map(c => c.name).sort();
  }, []);

  return {
    countryData,
    universityData,
    programData,
  };
};

