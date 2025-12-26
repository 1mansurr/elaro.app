import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';

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
  const { user, session, signOut } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
    } catch (error: unknown) {
      console.error('Contact Support Error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Could not open support chat. Please try again later.';
      showToast({ type: 'error', message: errorMessage });
    } finally {
      setSupportChatLoading(false);
    }
  }, [user, navigation]);

  const handleLogout = useCallback(async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    navigation.navigate('DeleteAccountScreen');
  }, [navigation]);

  const renderGuestView = () => (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
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
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom: insets.bottom + 80 + SPACING.lg, // Safe area + tab bar height (80px) + spacing
        },
      ]}>
      {/* Profile Section - NOT in a card */}
      <View style={styles.profileSection}>
        <Text style={[styles.profileName, { color: theme.text }]}>
          {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
        </Text>
        {user?.username && (
          <Text
            style={[styles.profileUsername, { color: theme.textSecondary }]}>
            @{user.username}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.viewProfileButton,
            { backgroundColor: COLORS.primary },
          ]}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}>
          <Text style={[styles.viewProfileButtonText, { color: COLORS.white }]}>
            View Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Buttons Card - with rounded corners */}
      <Card style={styles.buttonsCard}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Courses')}
          activeOpacity={0.7}>
          <View style={styles.menuButtonLeft}>
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: '#F0F5FF' },
              ]}>
              <Ionicons
                name="school-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <Text style={[styles.menuButtonLabel, { color: theme.text }]}>
              My Courses
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('AddCourseFlow')}
          activeOpacity={0.7}>
          <View style={styles.menuButtonLeft}>
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: '#F0F5FF' },
              ]}>
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <Text style={[styles.menuButtonLabel, { color: theme.text }]}>
              Add a Course
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Templates')}
          activeOpacity={0.7}>
          <View style={styles.menuButtonLeft}>
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: '#F0F5FF' },
              ]}>
              <Ionicons
                name="layers-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <Text style={[styles.menuButtonLabel, { color: theme.text }]}>
              Templates
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </Card>

      <Card>
        <SubscriptionManagementCard />
      </Card>

      <Card title="Support">
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
      </Card>

      <Card title="Legal">
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
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
          testID="settings-navigation-button">
          <View style={styles.settingsButtonLeft}>
            <View
              style={[
                styles.settingsIconContainer,
                { backgroundColor: '#F0F5FF' },
              ]}>
              <Ionicons
                name="settings-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <Text style={[styles.settingsButtonLabel, { color: theme.text }]}>
              Settings
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </Card>

      {/* Account Actions Card - at the bottom with rounded edges */}
      <Card style={styles.accountActionsCard}>
        <TouchableOpacity
          style={styles.accountActionButton}
          onPress={handleLogout}
          activeOpacity={0.7}>
          <View style={styles.accountActionButtonLeft}>
            <View
              style={[
                styles.accountActionIconContainer,
                { backgroundColor: '#F0F5FF' },
              ]}>
              <Ionicons name="exit-outline" size={22} color={COLORS.primary} />
            </View>
            <Text
              style={[styles.accountActionButtonLabel, { color: theme.text }]}>
              Log Out
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.accountActionDivider,
            { backgroundColor: theme.border },
          ]}
        />

        <TouchableOpacity
          style={styles.accountActionButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}>
          <View style={styles.accountActionButtonLeft}>
            <View
              style={[
                styles.accountActionIconContainer,
                { backgroundColor: '#F0F5FF' },
              ]}>
              <Ionicons
                name="trash-bin-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <Text
              style={[styles.accountActionButtonLabel, { color: theme.error }]}>
              Delete Account
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </Card>

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
    padding: SPACING.md,
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
  // Profile Section - NOT in a card
  profileSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  profileName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  profileUsername: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
  },
  viewProfileButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  viewProfileButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  // Buttons card with rounded corners
  buttonsCard: {
    borderRadius: 24,
    marginBottom: SPACING.lg,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  menuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuButtonLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  menuDivider: {
    height: 1,
    marginLeft: SPACING.md + 36 + SPACING.md, // Align with text (icon + margin + icon margin)
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
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  settingsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingsButtonLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  scrollContent: {
    paddingBottom: SPACING.xxxl,
  },
  accountActionsCard: {
    borderRadius: 24,
    marginBottom: SPACING.lg,
  },
  accountActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  accountActionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountActionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  accountActionButtonLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  accountActionDivider: {
    height: 1,
    marginLeft: SPACING.md + 36 + SPACING.md, // Align with text (icon + margin + icon margin)
  },
});
