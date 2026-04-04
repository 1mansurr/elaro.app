import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '@/types/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import * as WebBrowser from 'expo-web-browser';
import { LEGAL_URLS } from '@/constants/legal';
import { InlineNotificationSettings } from '@/shared/components';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const SectionHeader: React.FC<{
  label: string;
  title: string;
  isDark: boolean;
  textColor: string;
}> = ({ label, title, isDark, textColor }) => (
  <View style={styles.sectionHeader}>
    <Text
      style={[
        styles.sectionLabel,
        { color: isDark ? 'rgba(99,160,255,0.7)' : 'rgba(0,91,174,0.6)' },
      ]}>
      {label}
    </Text>
    <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
  </View>
);

export function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const cardBg = isDark ? '#1A2235' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const surfaceLow = isDark ? '#141C2C' : '#EEF0FF';
  const iconCircleBg = isDark ? 'rgba(99,160,255,0.15)' : '#C3D0FF';
  const subtitleColor = isDark ? '#9CA3AF' : '#4D5A81';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}>
      {/* Custom header */}
      <View style={[styles.header, { borderBottomColor: cardBorder }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? '#FFFFFF' : '#202D51' },
          ]}>
          Settings
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ── Notifications ── */}
        <SectionHeader
          label="PREFERENCES"
          title="Notifications"
          isDark={isDark}
          textColor={isDark ? '#FFFFFF' : '#202D51'}
        />

        {/* Stay Updated card */}
        <View
          style={[
            styles.historyCard,
            { backgroundColor: surfaceLow, borderColor: cardBorder },
          ]}>
          <View style={styles.historyCardRow}>
            <View
              style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
              <Ionicons name="time-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.historyCardText}>
              <Text
                style={[
                  styles.historyCardTitle,
                  { color: isDark ? '#FFFFFF' : '#202D51' },
                ]}>
                Stay Updated
              </Text>
              <Text
                style={[styles.historyCardSubtitle, { color: subtitleColor }]}>
                Review your past alerts and messages
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('NotificationManagement')}
            activeOpacity={0.85}>
            <Text style={styles.historyButtonText}>
              View Notification History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toggles */}
        <View
          style={[
            styles.togglesCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}>
          <InlineNotificationSettings />
        </View>

        {/* ── Legal ── */}
        <SectionHeader
          label="COMPLIANCE"
          title="Legal"
          isDark={isDark}
          textColor={isDark ? '#FFFFFF' : '#202D51'}
        />

        <View style={styles.legalGrid}>
          <TouchableOpacity
            style={[
              styles.legalCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
            onPress={() =>
              WebBrowser.openBrowserAsync(LEGAL_URLS.TERMS_OF_SERVICE)
            }
            activeOpacity={0.8}>
            <View
              style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <Text
              style={[
                styles.legalCardLabel,
                { color: isDark ? '#FFFFFF' : '#202D51' },
              ]}>
              Terms of Service
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.legalCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
            onPress={() =>
              WebBrowser.openBrowserAsync(LEGAL_URLS.PRIVACY_POLICY)
            }
            activeOpacity={0.8}>
            <View
              style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <Text
              style={[
                styles.legalCardLabel,
                { color: isDark ? '#FFFFFF' : '#202D51' },
              ]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Account Management ── */}
        <SectionHeader
          label="DANGER ZONE"
          title="Account Management"
          isDark={isDark}
          textColor={isDark ? '#FFFFFF' : '#202D51'}
        />

        <TouchableOpacity
          style={[
            styles.recycleBinButton,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
          onPress={() => navigation.navigate('RecycleBin')}
          activeOpacity={0.8}>
          <View
            style={[
              styles.recycleBinIcon,
              { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2' },
            ]}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </View>
          <View style={styles.recycleBinText}>
            <Text
              style={[
                styles.recycleBinTitle,
                { color: isDark ? '#FFFFFF' : '#202D51' },
              ]}>
              Recycle Bin
            </Text>
            <Text
              style={[
                styles.recycleBinSubtitle,
                { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              Deleted items are kept for 30 days
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? '#6B7280' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 56,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 120,
    gap: SPACING.md,
  },
  sectionHeader: {
    gap: 4,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
  },
  historyCard: {
    borderRadius: 20,
    padding: SPACING.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  historyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  historyCardText: {
    flex: 1,
    gap: 2,
  },
  historyCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  historyCardSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
  historyButton: {
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  togglesCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: SPACING.xs,
  },
  legalGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  legalCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  legalCardLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  recycleBinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  recycleBinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  recycleBinText: {
    flex: 1,
    gap: 2,
  },
  recycleBinTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  recycleBinSubtitle: {
    fontSize: FONT_SIZES.sm,
  },
});
