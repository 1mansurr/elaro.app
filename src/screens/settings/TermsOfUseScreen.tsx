import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS, COLORS } from '../../constants/theme';

const TermSection = ({
  title,
  content,
  styles,
}: {
  title: string;
  content: string;
  styles: any;
}) => (
  <View style={styles.card}>
    <Text style={styles.clauseTitle}>{title}</Text>
    <Text style={styles.clauseBody}>{content}</Text>
  </View>
);

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.gray100,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  backButtonPressed: {
    backgroundColor: theme.gray100,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: theme.text,
  },
  placeholder: {
    width: 24,
  },
  scroll: {
    flex: 1,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  clauseTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.blue,
    marginBottom: SPACING.sm,
  },
  clauseBody: {
    fontSize: FONT_SIZES.md,
    color: COLORS.black,
    lineHeight: 22,
  },
  footer: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: theme.primary,
  },
}); 

const CLAUSES = [
  {
    title: 'Clause 1 – Introduction & Who We Are',
    content: `Welcome to ELARO! These Terms of Service ("Terms") govern your access to and use of the ELARO mobile application (the "App"), including all features, content, and services provided through it.\n\nELARO v1.0.0 is a personal project created and maintained by Alidu Yakubu Suhyini Mansur, a Computer Science student at the Kwame Nkrumah University of Science and Technology (KNUST), Ghana.\n\nELARO is currently in early release (v1.0.0) and is offered on a "beta" basis. While we’re working hard to improve the experience, please understand that some bugs or incomplete features may still be present.\n\nPlease read these Terms carefully. By using the ELARO app, even in guest mode, you agree to be bound by these Terms. If you do not agree, please do not use the App.`
  },
  {
    title: 'Clause 2 – User Responsibilities',
    content: `You agree to use the App only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.`
  },
  {
    title: 'Clause 3 – Subscription & Payment',
    content: `- ELARO offers both a free plan (Origin) and a paid plan (Oddity).\n- The Oddity plan includes:\n  • Up to 35 total tasks/events\n  • Up to 75 spaced repetition reminders\n  • Full access to the AI Study Guide\n- The subscription costs GHS 5.00 per month and renews automatically by default.\n- Payments are securely processed by **Paystack** using a hosted checkout page via browser or deep link.\n- Users may cancel their subscription directly in the app.\n- Upon cancellation or payment failure:\n  • You will be downgraded to the Origin plan\n  • You may complete existing tasks/events, but cannot add new ones beyond the Origin limit\n  • Downgrade is immediate; no grace period is provided\n- Refunds are handled manually via our support team and only granted under specific conditions:\n  • Refunds must be requested within 14 days of purchase\n  • Full refunds are issued only if paid features were broken or not delivered\n  • Dissatisfaction alone does not qualify for a refund\n  • No partial refunds\n- Receipts are issued by Paystack. ELARO does not send a separate receipt.`
  },
  {
    title: 'Clause 4 – Intellectual Property',
    content: `All content, features, and functionality in the App are the exclusive property of ELARO and its creator. You may not copy, modify, distribute, or create derivative works without permission.`
  },
  {
    title: 'Clause 5 – Prohibited Conduct',
    content: `You agree not to misuse the App, including but not limited to: attempting to gain unauthorized access, interfering with the operation, or using the App for any unlawful or harmful purpose.`
  },
  {
    title: 'Clause 6 – Termination',
    content: `We reserve the right to suspend or terminate your access to the App at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users or the App.\n\nIf your subscription is cancelled or downgraded, you may continue to use any existing tasks or reminders already created but will be restricted from adding more than allowed on the Origin plan.`
  },
  {
    title: 'Clause 7 – Disclaimer & Limitation of Liability',
    content: `The App is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the App. In no event shall ELARO or its creator be liable for any damages arising from your use of the App.`
  },
  {
    title: 'Clause 8 – Changes to Terms',
    content: `We may update these Terms from time to time. Continued use of the App after changes means you accept the new Terms. We will notify users of significant changes.`
  },
  {
    title: 'Clause 9 – Governing Law',
    content: `These Terms are governed by the laws of the Republic of Ghana. Any disputes arising from these Terms or the App will be subject to the exclusive jurisdiction of the courts of Ghana.`
  },
  {
    title: 'Clause 10 – Contact',
    content: `If you have any questions about these Terms, please contact us at support@myelaro.com.`
  },
];

const TermsOfUseScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {/* Header with SafeAreaView */}
      <SafeAreaView style={{ backgroundColor: theme.card }}>
        <View style={styles.header}>
          <Pressable 
            onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} 
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Terms of Use</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {CLAUSES.map((clause, idx) => (
          <TermSection key={idx} title={clause.title} content={clause.content} styles={styles} />
        ))}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: 16th July 2025</Text>
          <Text style={styles.footerText}>We do not sell your data. Ever. 🔒</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default TermsOfUseScreen; 