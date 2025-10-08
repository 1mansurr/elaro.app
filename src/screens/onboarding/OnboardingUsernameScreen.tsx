import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../services/supabase';
import { debounce } from '../../utils/debounce'; // Assuming debounce utility exists

const OnboardingUsernameScreen = ({ navigation }) => {
  const { onboardingData, updateOnboardingData } = useOnboarding();
  
  const [username, setUsername] = useState(onboardingData.username || '');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkUsername = useCallback(
    debounce(async (newUsername: string) => {
      if (newUsername.length < 3) {
        setIsAvailable(null);
        setIsChecking(false);
        return;
      }
      setIsChecking(true);
      try {
        const { data } = await supabase.functions.invoke('check-username-availability', {
          body: { username: newUsername },
        });
        setIsAvailable(data.isAvailable);
      } catch (err) {
        console.error('Error checking username:', err);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 500),
    []
  );

  const handleNext = () => {
    if (!username.trim() || !isAvailable) {
      Alert.alert('Please choose an available username.');
      return;
    }
    updateOnboardingData({ username: username.trim() });
    navigation.navigate('OnboardingUniversity'); // Navigate to the next screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your username</Text>
      <Text style={styles.subtitle}>This will be your unique name on ELARO.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="e.g., john_doe"
        value={username}
        onChangeText={(text) => {
          const formattedText = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
          setUsername(formattedText);
          setIsChecking(true);
          checkUsername(formattedText);
        }}
        autoCapitalize="none"
      />
      
      {isChecking && <ActivityIndicator style={styles.feedback} />}
      {!isChecking && isAvailable === true && username.length >= 3 && (
        <Text style={[styles.feedback, styles.success]}>Username is available!</Text>
      )}
      {!isChecking && isAvailable === false && (
        <Text style={[styles.feedback, styles.error]}>Username is already taken.</Text>
      )}

      <Button title="Next" onPress={handleNext} disabled={!isAvailable || username.length < 3} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', color: 'gray', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, fontSize: 16 },
  feedback: { marginTop: 10, textAlign: 'center' },
  success: { color: 'green' },
  error: { color: 'red' },
});

export default OnboardingUsernameScreen;
