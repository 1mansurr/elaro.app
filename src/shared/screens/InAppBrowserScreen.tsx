import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { RootStackParamList } from '@/types/navigation';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';

type InAppBrowserScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'InAppBrowserScreen'
>;
type InAppBrowserScreenRouteProp = RouteProp<
  RootStackParamList,
  'InAppBrowserScreen'
>;

const InAppBrowserScreen = () => {
  const navigation = useNavigation<InAppBrowserScreenNavigationProp>();
  const route = useRoute<InAppBrowserScreenRouteProp>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { url, title } = route.params;

  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  // Auto-open in system browser on mount
  useEffect(() => {
    Linking.openURL(url).catch(err =>
      console.error('Failed to open URL:', err),
    );
  }, [url]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: surfaceColor,
            borderBottomColor: borderColor,
            paddingTop: insets.top + SPACING.sm,
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={textColor} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: textColor }]}
          numberOfLines={1}>
          {title || 'Browser'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Body — not absolutely positioned, won't block header touches */}
      <View style={styles.body}>
        <Ionicons
          name="open-outline"
          size={40}
          color={isDark ? '#4B5563' : '#D1D5DB'}
        />
        <Text style={[styles.bodyTitle, { color: textColor }]}>
          Opening in your browser…
        </Text>
        <Text style={[styles.bodySubtitle, { color: subtitleColor }]}>
          {url}
        </Text>
        <TouchableOpacity
          style={[styles.openButton, { backgroundColor: COLORS.primary }]}
          onPress={() => Linking.openURL(url)}
          activeOpacity={0.85}>
          <Text style={styles.openButtonText}>Open Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.xl,
  },
  bodyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
  },
  bodySubtitle: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  openButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 100,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

export default InAppBrowserScreen;
