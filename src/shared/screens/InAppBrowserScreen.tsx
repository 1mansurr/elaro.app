import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types/navigation';

type InAppBrowserScreenNavigationProp = StackNavigationProp<RootStackParamList, 'InAppBrowserScreen'>;
type InAppBrowserScreenRouteProp = RouteProp<RootStackParamList, 'InAppBrowserScreen'>;

const InAppBrowserScreen = () => {
  const navigation = useNavigation<InAppBrowserScreenNavigationProp>();
  const route = useRoute<InAppBrowserScreenRouteProp>();
  const { url, title } = route.params;

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Browser'}</Text>
      </View>
      <WebView
        source={{ uri: url }}
        startInLoadingState={true}
        renderLoading={renderLoading}
        style={styles.webView}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    top: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    maxWidth: '80%', // Ensure title doesn't overlap with button
    textAlign: 'center',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InAppBrowserScreen;
