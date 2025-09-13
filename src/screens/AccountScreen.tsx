// FILE: src/screens/AccountScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext'; // Corrected path
import { RootStackParamList } from '../types';
import { Card, Button } from '../components';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

type AccountScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const AccountScreen = () => {
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const { user, session, signOut } = useAuth();
  const isGuest = !session;

  const handleOpenUrl = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const ListItem = ({ icon, label, onPress, color = '#343a40' }: { icon: any; label: string; onPress: () => void; color?: string }) => (
    <TouchableOpacity style={styles.listItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color={color} style={styles.listItemIcon} />
      <Text style={styles.listItemLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const renderGuestView = () => (
    <ScrollView style={styles.container}>
      <Card title="Get Started">
        <Text style={styles.guestText}>
          You are currently browsing as a guest.
        </Text>
        <Button
          title="Sign Up for Free"
          onPress={() => navigation.navigate('Auth', { 
            onClose: () => navigation.goBack(),
            mode: 'signup' 
          })}
        />
      </Card>

      <Card title="Support">
        <ListItem
          icon="help-circle-outline"
          label="How ELARO Works"
          onPress={() => console.log('How ELARO Works')}
        />
      </Card>

      <Card title="Legal">
        <ListItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => handleOpenUrl('https://elaro.app/terms')}
        />
        <ListItem
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => handleOpenUrl('https://elaro.app/privacy')}
        />
      </Card>
    </ScrollView>
  );

  const renderAuthenticatedView = () => (
    <ScrollView style={styles.container}>
      {/* Profile Card */}
      <Card title="Profile">
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.profileName}>
              {user?.name || 'User'}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email}
            </Text>
          </View>
        </View>
        <Button
          title="My Courses"
          onPress={() => navigation.navigate('Courses')}
          style={{ marginTop: 20 }}
        />
      </Card>

      {/* Support Card */}
      <Card title="Support">
        <ListItem
          icon="help-circle-outline"
          label="How ELARO Works"
          onPress={() => navigation.navigate('ComingSoon')}
        />
        <ListItem
          icon="bulb-outline"
          label="Request a Feature"
          onPress={() => navigation.navigate('ComingSoon')}
        />
        <ListItem
          icon="mail-outline"
          label="Contact Support"
          onPress={() => navigation.navigate('ComingSoon')}
        />
      </Card>

      {/* Legal Card */}
      <Card title="Legal">
        <ListItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => handleOpenUrl('https://elaro.app/terms')}
        />
        <ListItem
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => handleOpenUrl('https://elaro.app/privacy')}
        />
      </Card>

      {/* Settings Card */}
      <Card title="Settings">
        <ListItem
          icon="trash-outline"
          label="Recycle Bin"
          onPress={() => navigation.navigate('RecycleBin')}
        />
        <ListItem
          icon="log-out-outline"
          label="Log Out"
          onPress={handleLogout}
        />
        <ListItem
          icon="trash-outline"
          label="Delete Account"
          onPress={() => console.log('Delete Account')}
          color="#FF3B30"
        />
      </Card>
    </ScrollView>
  );

  return isGuest ? renderGuestView() : renderAuthenticatedView();
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  guestText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#343a40',
  },
  profileEmail: {
    fontSize: 16,
    color: '#6c757d',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  listItemIcon: {
    marginRight: 16,
  },
  listItemLabel: {
    flex: 1,
    fontSize: 16,
  },
});

export default AccountScreen;