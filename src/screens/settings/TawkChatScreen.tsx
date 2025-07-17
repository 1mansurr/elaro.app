import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

const TAWK_CHAT_URL = 'https://tawk.to/chat/685fb69800ff9419109c4db9/default';

const TawkChatScreen = () => {
  const [error, setError] = useState(false);
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={26} color="#1D4ED8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Chat</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.container}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load chat. Please try again later.</Text>
          </View>
        ) : (
          <WebView
            source={{ uri: TAWK_CHAT_URL }}
            startInLoadingState
            renderLoading={() => (
              <ActivityIndicator size="large" color="#1D4ED8" style={styles.loader} />
            )}
            onError={() => setError(true)}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default TawkChatScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: 'red', fontSize: 16 },
}); 