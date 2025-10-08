import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import InfoModal from '../../components/InfoModal'; // Import the new modal

const OnboardingUniversityScreen = ({ navigation }) => {
  const { onboardingData, updateOnboardingData } = useOnboarding();

  const [university, setUniversity] = useState(onboardingData.university || '');
  const [program, setProgram] = useState(onboardingData.program || '');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleNext = () => {
    // While not strictly required, we can add a simple validation.
    if (!university.trim()) {
      Alert.alert('Please enter your university.');
      return;
    }
    updateOnboardingData({ university: university.trim(), program: program.trim() });
    navigation.navigate('OnboardingCourses'); // Navigate to the next screen
  };

  const handleBack = () => {
    // Save current input before going back, in case the user returns.
    updateOnboardingData({ university, program });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about your studies</Text>
      <Text style={styles.subtitle}>This helps us tailor your experience.</Text>
      
      <Text style={styles.label}>University or School</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Harvard University"
        value={university}
        onChangeText={setUniversity}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Program of Study (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Computer Science"
        value={program}
        onChangeText={setProgram}
        autoCapitalize="words"
      />

      <TouchableOpacity onPress={() => setIsModalVisible(true)}>
        <Text style={styles.linkText}>Why do we need this?</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={handleBack} />
        <Button title="Next" onPress={handleNext} />
      </View>

      <InfoModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Why We Ask for Your School Info"
        message="We're building special tools and integrations for specific universities and programs. This helps us show you the features that are most relevant to you!"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: 'gray', marginBottom: 30 },
  label: { fontSize: 16, marginTop: 15, marginBottom: 5, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, fontSize: 16 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  linkText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#007AFF', // A standard link color
    textDecorationLine: 'underline',
  },
});

export default OnboardingUniversityScreen;
