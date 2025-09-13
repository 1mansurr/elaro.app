// FILE: src/screens/ComingSoonScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components';

const ComingSoonScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Coming Soon!</Text>
      <Text style={styles.subtitle}>
        We're working hard to bring this feature to you. Stay tuned!
      </Text>
      <Button
        title="Go Back"
        onPress={() => navigation.goBack()}
        style={{ marginTop: 30 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default ComingSoonScreen;
