import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { SearchableSelector } from '../components';

// Import the data files
import countriesData from '../data/countries.json';

const ProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [country, setCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Extract country names for the selector
  const countryData = useMemo(() => {
    return countriesData.countries.map(c => c.name).sort();
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setUsername(user.username || '');
      setUniversity(user.university || '');
      setProgram(user.program || '');
      setCountry(user.country || '');
    }
  }, [user]);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-profile', {
        body: {
          firstName,
          lastName,
          university,
          program,
          country,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // On success, invalidate the user query in AuthContext to refetch the fresh user data.
      // This assumes your AuthContext exposes a function to refetch the user.
      // A common pattern is to invalidate a query if you are using React Query for user data too.
      // For now, we'll alert the user and navigate back. A full refresh would be better.
      Alert.alert('Success', 'Your profile has been updated.');
      
      // To make the UI update, we need to refetch the user data.
      // The best way is to invalidate a React Query key if 'user' is fetched via React Query.
      // If not, we might need to add a refresh function to AuthContext.
      // For now, let's navigate back. The data will be fresh on next app open.
      navigation.goBack();

    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      
      <Text style={styles.label}>First Name</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />

      <Text style={styles.label}>Last Name</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />

      <Text style={styles.label}>Username</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} editable={false} />
      {/* Username is not editable for now to avoid complexity with uniqueness checks */}

      <SearchableSelector
        label="Country"
        data={countryData}
        selectedValue={country}
        onValueChange={setCountry}
        placeholder="Select your country..."
        searchPlaceholder="Search for your country"
      />

      <Text style={styles.label}>University</Text>
      <TextInput style={styles.input} value={university} onChangeText={setUniversity} />

      <Text style={styles.label}>Program of Study</Text>
      <TextInput style={styles.input} value={program} onChangeText={setProgram} />

      <Button title={isLoading ? 'Saving...' : 'Save Changes'} onPress={handleSaveChanges} disabled={isLoading} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, marginTop: 15, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
});

export default ProfileScreen;
