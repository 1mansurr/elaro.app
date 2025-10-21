import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Card from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { showToast } from '@/utils/showToast';
import { PostChatModal } from '@/features/support/components/PostChatModal';
import { getSecureChatLink } from '@/features/support/utils/getSecureChatLink';
import { SubscriptionManagementCard } from '@/features/user-profile/components/SubscriptionManagementCard';

const ListItem = ({ label, onPress, isDestructive = false }: { label: string; onPress: () => void; isDestructive?: boolean }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.listItem, 
        { 
          backgroundColor: theme.surface,
          borderColor: theme.border,
        }
      ]}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.listItemText, 
        { 
          color: isDestructive ? theme.error : theme.text,
          fontWeight: '500',
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export function AccountScreen() {
  const { user, session } = useAuth();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [isPostChatModalVisible, setPostChatModalVisible] = useState(false);
  const [isSupportChatLoading, setSupportChatLoading] = useState(false);

  const handleContactSupport = useCallback(async () => {
    if (!user) return;
    setSupportChatLoading(true);
    try {
      const secureUrl = await getSecureChatLink(user);
      (navigation as any).navigate('SupportChat', { uri: secureUrl });
    } catch (error) {
      showToast({ type: 'error', message: 'Could not open support chat.' });
    } finally {
      setSupportChatLoading(false);
    }
  }, [user, navigation]);

  const renderGuestView = () => (
    <ScrollView style={styles.container}>
      <Card title="Profile">
        <View style={styles.guestProfileContainer}>
          <Text style={[styles.guestTitle, { color: theme.text }]}>Join ELARO</Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
            Log in or create an account to manage your academic life.
          </Text>
          <Button title="Login or Sign Up" onPress={() => (navigation as any).navigate('Auth')} />
        </View>
      </Card>

      <Card title="Support">
        <ListItem 
          label="How ELARO Works" 
          onPress={() => (navigation as any).navigate('InAppBrowserScreen', { 
            url: 'https://elaro.app/how-it-works',
            title: 'How ELARO Works'
          })} 
        />
      </Card>

      <Card title="Legal">
        <ListItem 
          label="Terms of Service" 
          onPress={() => (navigation as any).navigate('InAppBrowserScreen', { 
            url: 'https://elaro.app/terms',
            title: 'Terms of Service'
          })} 
        />
        <ListItem 
          label="Privacy Policy" 
          onPress={() => (navigation as any).navigate('InAppBrowserScreen', { 
            url: 'https://elaro.app/privacy',
            title: 'Privacy Policy'
          })} 
        />
      </Card>
    </ScrollView>
  );

  const renderAuthenticatedView = () => (
    <ScrollView style={styles.container}>
      {user?.role === 'admin' && (
        <Card title="Admin">
          <Button title="Admin Dashboard" onPress={() => (navigation as any).navigate('AdminDashboard')} />
        </Card>
      )}

      <Card title="Profile">
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.text }]}>{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
        </View>
        <Button title="View Profile" onPress={() => (navigation as any).navigate('UserProfile')} />
        <Button title="My Courses" onPress={() => (navigation as any).navigate('CourseList')} />
        <Button title="Add a Course" onPress={() => (navigation as any).navigate('AddCourseFlow')} />
      </Card>

      <Card title="Subscription">
        <SubscriptionManagementCard />
      </Card>

      <Card title="Support">
        <ListItem 
          label="How ELARO Works" 
          onPress={() => (navigation as any).navigate('InAppBrowserScreen', { 
            url: 'https://elaro.app/how-it-works',
            title: 'How ELARO Works'
          })} 
        />
        <ListItem label="Contact Support" onPress={handleContactSupport} />
      </Card>

      <Card title="Legal">
        <ListItem 
          label="Terms of Service" 
          onPress={() => (navigation as any).navigate('InAppBrowserScreen', { 
            url: 'https://elaro.app/terms',
            title: 'Terms of Service'
          })} 
        />
        <ListItem 
          label="Privacy Policy" 
          onPress={() => (navigation as any).navigate('InAppBrowserScreen', { 
            url: 'https://elaro.app/privacy',
            title: 'Privacy Policy'
          })} 
        />
      </Card>

      <Card title="Settings">
        <ListItem label="Settings" onPress={() => (navigation as any).navigate('Settings')} />
      </Card>

      <PostChatModal
        isVisible={isPostChatModalVisible}
        onClose={() => setPostChatModalVisible(false)}
        onFaqPress={() => {
          setPostChatModalVisible(false);
          (navigation as any).navigate('Faq');
        }}
      />
    </ScrollView>
  );

  return session && user ? renderAuthenticatedView() : renderGuestView();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  guestProfileContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  profileInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 14,
  },
  listItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 16,
  },
});