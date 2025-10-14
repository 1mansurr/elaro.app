// FILE: src/screens/AccountScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { RootStackParamList } from '@/types';
import { Card, Button } from '@/shared/components';
import { NotificationSettings } from '@/features/notifications/components/NotificationSettings';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/features/auth/services/authService';
import { supabase } from '@/services/supabase';

// Import the AppError class
class AppError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
  }
}

type AccountScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const AccountScreen = () => {
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const { user, session, signOut } = useAuth();
  const isGuest = !session;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPostChatModalVisible, setPostChatModalVisible] = useState(false);
  const [isSupportChatLoading, setIsSupportChatLoading] = useState(false);

  const handleContactSupport = async () => {
    setIsSupportChatLoading(true);
    try {
      // Call the new backend function
      const { data, error } = await supabase.functions.invoke('get-secure-chat-link');

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.secureUrl) {
        // Open the secure URL in our in-app browser
        navigation.navigate('InAppBrowserScreen', {
          url: data.secureUrl,
          title: 'Support Chat'
        });
      } else {
        throw new Error('Could not retrieve the secure chat link.');
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not open support chat. Please try again later.');
    } finally {
      setIsSupportChatLoading(false);
    }
  };

  const handleGlobalSignOut = () => {
    Alert.alert(
      'Log Out From All Devices',
      'Are you sure? This will log you out of your ELARO account on all browsers and devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out Everywhere',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOutFromAllDevices();
              // The onAuthStateChange listener in AuthContext will handle navigation.
            } catch (error) {
              const message = error instanceof AppError ? error.message : 'Failed to log out from all devices.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleEnableMfa = () => {
    navigation.navigate('MFAEnrollmentScreen');
  };

  const handleDeleteAccount = () => {
    // First confirmation dialog
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all your data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second, final confirmation dialog
            Alert.alert(
              'Final Confirmation',
              'This is your final confirmation. Pressing "Permanently Delete" will erase your account immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await authService.deleteAccount();
                      // After backend deletion is successful, call the existing signOut from AuthContext
                      await signOut();
                      Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
                    } catch (error: any) {
                      Alert.alert('Deletion Failed', error.message || 'An unexpected error occurred. Please try again.');
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const ListItem = ({ 
    icon, 
    label, 
    onPress, 
    color = '#343a40', 
    disabled = false, 
    rightContent 
  }: { 
    icon: any; 
    label: string; 
    onPress: () => void; 
    color?: string; 
    disabled?: boolean;
    rightContent?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={[styles.listItem, disabled && styles.listItemDisabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={24} color={disabled ? '#8E8E93' : color} style={styles.listItemIcon} />
      <Text style={[styles.listItemLabel, disabled && styles.listItemLabelDisabled]}>{label}</Text>
      {rightContent && <View style={styles.listItemRight}>{rightContent}</View>}
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
          onPress={() => navigation.navigate('Auth', { mode: 'signup' })}
        />
      </Card>

      <Card title="Support">
        <ListItem
          icon="help-circle-outline"
          label="How ELARO Works"
          onPress={() => navigation.navigate('InAppBrowserScreen', {
            url: 'https://myelaro.com/how-it-works',
            title: 'How ELARO Works'
          })}
        />
      </Card>

      <Card title="Legal">
        <ListItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => navigation.navigate('InAppBrowserScreen', {
            url: 'https://myelaro.com/terms-of-service',
            title: 'Terms of Service'
          })}
        />
        <ListItem
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => navigation.navigate('InAppBrowserScreen', {
            url: 'https://myelaro.com/privacy-policy',
            title: 'Privacy Policy'
          })}
        />
      </Card>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isPostChatModalVisible}
        onRequestClose={() => setPostChatModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
            <Text style={{ marginBottom: 15, textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>We'll Be With You Shortly!</Text>
            <Text style={{ marginBottom: 20, textAlign: 'center' }}>
              Our support team will respond soon. Please check back in the chat from time to time within the next 2 hours.
            </Text>
            <Text style={{ marginBottom: 25, textAlign: 'center', fontStyle: 'italic' }}>
              In the meantime, your question might already be answered in our documentation.
            </Text>
            
            <Button
              title="Read 'How ELARO Works'"
              onPress={() => {
                setPostChatModalVisible(false); // Close this modal first
                navigation.navigate('InAppBrowserScreen', {
                  url: 'https://myelaro.com/how-it-works',
                  title: 'How ELARO Works'
                });
              }}
            />

            <Pressable
              style={{ marginTop: 15 }}
              onPress={() => setPostChatModalVisible(false)}
            >
              <Text style={{ color: 'blue' }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderAuthenticatedView = () => (
    <ScrollView style={styles.container}>
      {/* Admin Card - Only visible to admin users */}
      {user?.role === 'admin' && (
        <Card title="Admin">
          <ListItem
            icon="grid-outline"
            label="Admin Dashboard"
            onPress={() => Alert.alert('Coming Soon', 'The Admin Dashboard is under construction.')}
          />
        </Card>
      )}

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
          title="View Profile"
          onPress={() => navigation.navigate('Profile')}
          style={{ marginTop: 10 }}
        />
        <Button
          title="My Courses"
          onPress={() => navigation.navigate('Courses')}
          style={{ marginTop: 10 }}
        />
        <Button
          title="Add a Course"
          onPress={() => navigation.navigate('AddCourseFlow')}
          style={{ marginTop: 10 }}
        />
      </Card>

      {/* Security Card */}
      <Card title="Security">
        <ListItem
          icon="shield-outline"
          label="Enable Multi-Factor Authentication"
          onPress={handleEnableMfa}
        />
      </Card>

      {/* Notifications Card */}
      <Card title="Notifications">
        <NotificationSettings />
      </Card>

      {/* Support Card */}
      <Card title="Support">
        <ListItem
          icon="help-circle-outline"
          label="How ELARO Works"
          onPress={() => navigation.navigate('InAppBrowserScreen', {
            url: 'https://myelaro.com/how-it-works',
            title: 'How ELARO Works'
          })}
        />
        <ListItem
          icon="mail-outline"
          label="Contact Support"
          onPress={handleContactSupport}
          disabled={isSupportChatLoading}
          rightContent={isSupportChatLoading ? <ActivityIndicator size="small" /> : undefined}
        />
      </Card>

      {/* Legal Card */}
      <Card title="Legal">
        <ListItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => navigation.navigate('InAppBrowserScreen', {
            url: 'https://myelaro.com/terms-of-service',
            title: 'Terms of Service'
          })}
        />
        <ListItem
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => navigation.navigate('InAppBrowserScreen', {
            url: 'https://myelaro.com/privacy-policy',
            title: 'Privacy Policy'
          })}
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
          icon="exit-outline"
          label="Log Out From All Devices"
          onPress={handleGlobalSignOut}
          color="#FF3B30"
        />
        <ListItem
          icon="trash-outline"
          label="Delete Account"
          onPress={handleDeleteAccount}
          disabled={isDeleting}
          color="#FF3B30"
          rightContent={isDeleting ? <ActivityIndicator color="#FF3B30" size="small" /> : undefined}
        />
      </Card>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isPostChatModalVisible}
        onRequestClose={() => setPostChatModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
            <Text style={{ marginBottom: 15, textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>We'll Be With You Shortly!</Text>
            <Text style={{ marginBottom: 20, textAlign: 'center' }}>
              Our support team will respond soon. Please check back in the chat from time to time within the next 2 hours.
            </Text>
            <Text style={{ marginBottom: 25, textAlign: 'center', fontStyle: 'italic' }}>
              In the meantime, your question might already be answered in our documentation.
            </Text>
            
            <Button
              title="Read 'How ELARO Works'"
              onPress={() => {
                setPostChatModalVisible(false); // Close this modal first
                navigation.navigate('InAppBrowserScreen', {
                  url: 'https://myelaro.com/how-it-works',
                  title: 'How ELARO Works'
                });
              }}
            />

            <Pressable
              style={{ marginTop: 15 }}
              onPress={() => setPostChatModalVisible(false)}
            >
              <Text style={{ color: 'blue' }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  listItemDisabled: {
    opacity: 0.6,
  },
  listItemIcon: {
    marginRight: 16,
  },
  listItemLabel: {
    flex: 1,
    fontSize: 16,
  },
  listItemLabelDisabled: {
    color: '#8E8E93',
  },
  listItemRight: {
    marginLeft: 8,
  },
});

export default AccountScreen;