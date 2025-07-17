import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING } from '../../constants/theme';

const HelpAndFeedbackScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with SafeAreaView */}
      <SafeAreaView style={{ backgroundColor: theme.card }}>
        <View style={[styles.header, { paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg, backgroundColor: theme.card, borderBottomColor: theme.gray100, borderBottomWidth: 1 }]}>
          <Pressable
            onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }}
            style={({ pressed }) => [styles.backButton, pressed && { backgroundColor: theme.gray100, padding: SPACING.sm, borderRadius: SPACING.sm }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { fontSize: SPACING.lg, color: theme.text }]}>Help & Feedback</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={[styles.scroll, { padding: SPACING.md }]}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.heading, { fontSize: SPACING.xl, color: theme.text }]}>❓ Need help?</Text>
          <Text style={[styles.body, { fontSize: SPACING.md, color: theme.textSecondary }]}>
            We're here to help you get the most out of ELARO. Here are the best ways to reach us:
          </Text>
        </View>

        {/* General Support */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={styles.sectionTitle}>General Support</Text>
          <View style={{ flexDirection: 'column', gap: 16, marginTop: 12 }}>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@myelaro.com')} style={supportButtonStyle(theme)}>
              <Text style={linkTextStyle(theme)}>Email Us</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('TawkChat' as never)} style={supportButtonStyle(theme)}>
              <Feather name="message-circle" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={linkTextStyle(theme)}>Chat with Us in Real Time</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Common Issues */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.subheading, { fontSize: SPACING.lg, color: theme.text }]}>🔧 Common Issues</Text>
          <Text style={[styles.body, { fontSize: SPACING.md, color: theme.textSecondary }]}>
            {`
• Can't add study sessions? Check your weekly limit
• App crashes? Try restarting the app
• Sync issues? Make sure you have a stable internet connection and are using the latest version of the app
• Still having trouble? Contact support for help
            `}
          </Text>
        </View>

        {/* Tips */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.subheading, { fontSize: SPACING.lg, color: theme.text }]}>💡 Tips</Text>
          <Text style={[styles.body, { fontSize: SPACING.md, color: theme.textSecondary }]}>
            • Use spaced repetition for better retention{'\n'}
            • Set realistic study goals{'\n'}
            • Take advantage of the AI Study Guide{'\n'}
            • Track your progress regularly
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontSize: SPACING.md, color: theme.primary }]}>Thank you for using ELARO! 🚀</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const supportButtonStyle = (theme: any) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: theme.input,
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 16,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: theme.inputBorder,
});

const linkTextStyle = (theme: any) => ({
  color: theme.primary,
  fontWeight: '600' as const,
  fontSize: 16,
});

export default HelpAndFeedbackScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: 8,
  },
  backButtonPressed: {},
  headerTitle: {
    fontWeight: '600',
  },
  placeholder: {
    width: 24,
  },
  scroll: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  heading: {
    fontWeight: '700',
    marginBottom: 8,
  },
  subheading: {
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
  footer: {
    marginTop: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
}); 