import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { showToast } from '@/utils/showToast';
import { PostChatModal } from '@/shared/components/PostChatModal';
import { getSecureChatLink } from '@/shared/utils/getSecureChatLink';
import { SubscriptionManagementCard } from '@/features/user-profile/components/SubscriptionManagementCard';
import { LEGAL_URLS } from '@/constants/legal';

const ListItem = ({
  label,
  onPress,
  isDestructive = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
  testID?: string;
}) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      style={[
        styles.listItem,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      activeOpacity={0.7}>
      <Text
        style={[
          styles.listItemText,
          {
            color: isDestructive ? theme.error : theme.text,
            fontWeight: '500',
          },
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const SettingItem = ({
  label,
  description,
  onPress,
  icon,
  disabled = false,
  rightContent,
}: {
  label: string;
  description?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  rightContent?: React.ReactNode;
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      disabled={disabled}>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={22} color={theme.accent} />
        </View>
      )}
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          {label}
        </Text>
        {description && (
          <Text
            style={[styles.settingDescription, { color: theme.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {rightContent || (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
};

export function AccountScreen() {
  const { user, session } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const [isPostChatModalVisible, setPostChatModalVisible] = useState(false);
  const [isSupportChatLoading, setSupportChatLoading] = useState(false);

  const handleContactSupport = useCallback(async () => {
    if (!user) return;
    setSupportChatLoading(true);
    try {
      const secureUrl = await getSecureChatLink(user);
      navigation.navigate('InAppBrowserScreen', {
        url: secureUrl,
        title: 'Support Chat',
      });
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
          <Text style={[styles.guestTitle, { color: theme.text }]}>
            Join ELARO
          </Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
            Log in or create an account to manage your academic life.
          </Text>
          <Button
            title="Login or Sign Up"
            onPress={() => navigation.navigate('Auth', { mode: 'signin' })}
          />
        </View>
      </Card>

      <Card title="Support & Help">
        <SettingItem
          label="How ELARO Works"
          description="Learn how to get the most out of ELARO"
          icon="school-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: 'https://elaro.app/how-it-works',
              title: 'How ELARO Works',
            })
          }
        />
        <SettingItem
          label="FAQs"
          description="Find answers to common questions"
          icon="help-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: 'https://elaro.app/faq',
              title: 'FAQs',
            })
          }
        />
        <SettingItem
          label="Terms of Service"
          description="Read our terms and conditions"
          icon="document-text-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: LEGAL_URLS.TERMS_OF_SERVICE,
              title: 'Terms of Service',
            })
          }
        />
        <SettingItem
          label="Privacy Policy"
          description="Learn how we protect your data"
          icon="shield-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: LEGAL_URLS.PRIVACY_POLICY,
              title: 'Privacy Policy',
            })
          }
        />
      </Card>
    </ScrollView>
  );

  const renderAuthenticatedView = () => (
    <ScrollView style={styles.container}>
      {user?.role === 'admin' && (
        <Card title="Admin">
          <Button
            title="Admin Dashboard"
            onPress={() => navigation.navigate('AnalyticsAdmin')}
          />
        </Card>
      )}

      <Card title="Profile">
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
          </Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
            {user?.email}
          </Text>
        </View>
        <Button
          title="View Profile"
          onPress={() => navigation.navigate('Profile')}
        />
        <Button
          title="My Courses"
          onPress={() => navigation.navigate('Courses')}
        />
        <Button
          title="Add a Course"
          onPress={() => navigation.navigate('AddCourseFlow')}
        />
      </Card>

      <Card title="Subscription">
        <SubscriptionManagementCard />
      </Card>

      <Card title="Support & Help">
        <SettingItem
          label="Contact Support"
          description="Get help from our support team"
          icon="chatbubbles-outline"
          onPress={handleContactSupport}
          disabled={isSupportChatLoading}
          rightContent={
            isSupportChatLoading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : undefined
          }
        />
        <SettingItem
          label="FAQs"
          description="Find answers to common questions"
          icon="help-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: 'https://elaro.app/faq',
              title: 'FAQs',
            })
          }
        />
        <SettingItem
          label="How ELARO Works"
          description="Learn how to get the most out of ELARO"
          icon="school-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: 'https://elaro.app/how-it-works',
              title: 'How ELARO Works',
            })
          }
        />
        <SettingItem
          label="Templates"
          description="Manage your saved task templates"
          icon="library-outline"
          onPress={() => navigation.navigate('Templates')}
        />
        <SettingItem
          label="Terms of Service"
          description="Read our terms and conditions"
          icon="document-text-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: LEGAL_URLS.TERMS_OF_SERVICE,
              title: 'Terms of Service',
            })
          }
        />
        <SettingItem
          label="Privacy Policy"
          description="Learn how we protect your data"
          icon="shield-outline"
          onPress={() =>
            navigation.navigate('InAppBrowserScreen', {
              url: LEGAL_URLS.PRIVACY_POLICY,
              title: 'Privacy Policy',
            })
          }
        />
      </Card>

      <Card title="Settings">
        <ListItem
          label="Settings"
          onPress={() => navigation.navigate('Settings')}
          testID="settings-navigation-button"
        />
      </Card>

      {/* Premium Features - Analytics Dashboard for Oddity users */}
      <Card title="Premium Features">
        {user?.subscription_tier === 'oddity' || user?.role === 'admin' ? (
          <View style={styles.premiumFeatureItem}>
            <View style={styles.premiumFeatureLeft}>
              <Ionicons
                name="analytics-outline"
                size={20}
                color={theme.accent}
                style={styles.premiumFeatureIcon}
              />
              <View style={styles.premiumFeatureText}>
                <Text
                  style={[styles.premiumFeatureTitle, { color: theme.text }]}>
                  Weekly Analytics
                </Text>
                <Text
                  style={[
                    styles.premiumFeatureDescription,
                    { color: theme.textSecondary },
                  ]}>
                  Comprehensive insights into your academic progress and study
                  patterns
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.premiumFeatureButton,
                { backgroundColor: theme.accent },
              ]}
              onPress={() =>
                navigation.navigate('InAppBrowserScreen', {
                  url: 'https://elaro.app/analytics',
                  title: 'Analytics',
                })
              }>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.premiumFeatureItem}>
            <View style={styles.premiumFeatureLeft}>
              <Ionicons
                name="star-outline"
                size={20}
                color="#FFD700"
                style={styles.premiumFeatureIcon}
              />
              <View style={styles.premiumFeatureText}>
                <Text
                  style={[styles.premiumFeatureTitle, { color: theme.text }]}>
                  Become an Oddity
                </Text>
                <Text
                  style={[
                    styles.premiumFeatureDescription,
                    { color: theme.textSecondary },
                  ]}>
                  Unlock comprehensive weekly analytics and academic insights
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.premiumFeatureButton,
                { backgroundColor: '#FFD700' },
              ]}
              onPress={() => {
                // Navigate to subscription/upgrade flow
                console.log('Navigate to subscription upgrade');
              }}>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Admin Features - Only for admin users */}
      {user?.role === 'admin' && (
        <Card title="Admin Features">
          <View style={styles.premiumFeatureItem}>
            <View style={styles.premiumFeatureLeft}>
              <Ionicons
                name="settings-outline"
                size={20}
                color="#9C27B0"
                style={styles.premiumFeatureIcon}
              />
              <View style={styles.premiumFeatureText}>
                <Text
                  style={[styles.premiumFeatureTitle, { color: theme.text }]}>
                  Analytics Admin
                </Text>
                <Text
                  style={[
                    styles.premiumFeatureDescription,
                    { color: theme.textSecondary },
                  ]}>
                  Manage templates, monitor batch processing, and view system
                  logs
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.premiumFeatureButton,
                { backgroundColor: '#9C27B0' },
              ]}
              onPress={() => navigation.navigate('AnalyticsAdmin')}
              accessibilityLabel="Open Analytics Admin"
              accessibilityHint="Opens the analytics administration dashboard"
              accessibilityRole="button">
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <PostChatModal
        isVisible={isPostChatModalVisible}
        onClose={() => setPostChatModalVisible(false)}
        onFaqPress={() => {
          setPostChatModalVisible(false);
          navigation.navigate('InAppBrowserScreen', {
            url: 'https://elaro.app/faq',
            title: 'FAQs',
          });
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  premiumFeatureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumFeatureIcon: {
    marginRight: 12,
  },
  premiumFeatureText: {
    flex: 1,
  },
  premiumFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  premiumFeatureDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  premiumFeatureButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
