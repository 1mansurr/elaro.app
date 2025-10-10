import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Button, InfoModal, SearchableSelector } from '../../components';

// Import the data files
import countriesData from '../../data/countries.json';
import universities from '../../data/universities.json';
import programsData from '../../data/programs.json';

type ScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'OnboardingUniversity'>;

const OnboardingUniversityScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { onboardingData, updateOnboardingData } = useOnboarding();

  // Update state management for the new selectors
  const [selectedCountry, setSelectedCountry] = useState(onboardingData.country || '');
  const [university, setUniversity] = useState(onboardingData.university || '');
  const [program, setProgram] = useState(onboardingData.program || '');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Add logic to filter universities based on the selected country
  const universityData = useMemo(() => {
    if (!selectedCountry) return [];
    return universities
      .filter(uni => uni.country === selectedCountry)
      .map(uni => uni.name)
      .sort();
  }, [selectedCountry]);

  // Extract just the program names for the selector
  const programData = useMemo(() => {
    return programsData.categories.flatMap(category => 
      category.subfields.flatMap(subfield => subfield.programs)
    ).sort();
  }, []);

  // Extract country names for the selector
  const countryData = useMemo(() => {
    return countriesData.countries.map(c => c.name).sort();
  }, []);

  // Update the handleNext function to save the new state
  const handleNext = () => {
    if (!university.trim()) {
      Alert.alert('Please select or enter your university.');
      return;
    }
    // Program is optional, so no validation needed for it.
    updateOnboardingData({
      country: selectedCountry,
      university: university.trim(),
      program: program.trim(),
    });
    navigation.navigate('OnboardingCourses');
  };
  
  const handleBack = () => {
    // Save current state before going back
    updateOnboardingData({
      country: selectedCountry,
      university,
      program,
    });
    navigation.goBack();
  };

  // Replace the old JSX with the new layout using SearchableSelector
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tell us about your studies</Text>
      <Text style={styles.subtitle}>This helps us personalize your experience.</Text>

      <SearchableSelector
        label="Country"
        data={countryData}
        selectedValue={selectedCountry}
        onValueChange={setSelectedCountry}
        placeholder="Select your country..."
        searchPlaceholder="Search for your country"
      />

      {/* Only show the University selector if a country has been selected */}
      {selectedCountry && (
        <SearchableSelector
          label="University"
          data={universityData}
          selectedValue={university}
          onValueChange={setUniversity}
          placeholder="Select or type your university..."
          searchPlaceholder="Search for your university"
        />
      )}

      <SearchableSelector
        label="Program of Study (Optional)"
        data={programData}
        selectedValue={program}
        onValueChange={setProgram}
        placeholder="Select or type your program..."
        searchPlaceholder="Search for your program"
      />

      <TouchableOpacity onPress={() => setIsModalVisible(true)}>
        <Text style={styles.linkText}>Why do we need this?</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} variant="secondary" />
        <Button title="Next" onPress={handleNext} />
      </View>

      <InfoModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Why We Ask for Your School Info"
        message="We're building special tools and integrations for specific universities and programs. This helps us show you the features that are most relevant to you!"
      />
    </ScrollView>
  );
};

// Keep the styles, but we might not need the 'input' style anymore
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: 'gray', marginBottom: 30 },
  linkText: { marginTop: 15, textAlign: 'center', color: '#007AFF', textDecorationLine: 'underline' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
});

export default OnboardingUniversityScreen;
