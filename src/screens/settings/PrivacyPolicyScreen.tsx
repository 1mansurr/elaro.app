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

const PolicySection = ({
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

const PrivacyPolicyScreen = () => {
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <PolicySection
          title="🛡️ Clause 1: Introduction"
          content={`Welcome to ELARO : Your Academic Co-Pilot!\nThis app is a personal project developed by Alidu Yakubu Suhyini Mansur, a Computer Science student at KNUST (Kwame Nkrumah University of Science and Technology) in Ghana. ELARO is built with students in mind, to help you organize your studies, build better habits, and achieve your academic goals.\nWe believe your data is personal. That’s why we only collect what’s necessary to make ELARO work well, and we take your privacy seriously.\nThis Privacy Policy explains what information we collect, how we use it, how we keep it secure, and what rights you have.\n\nBy using ELARO, you agree to the practices outlined in this policy. If you have any concerns or questions about your data, we're here to help, just reach out. And if you're not comfortable with any part of this policy, you're free to stop using the app at any time.\nThis Privacy Policy is governed by the laws of the Republic of Ghana.`}
          styles={styles}
        />

        <PolicySection
          title="📦 Clause 2: What We Collect"
          content={`To help you get the most out of ELARO, we collect a small amount of information: only what’s necessary to make the app function well, stay secure, and continue improving.\n\n🧠 Information You Provide\n* Account Details: Your name, email address, and password when you sign up\n* Study Inputs: The study sessions, tasks, and academic events you create\n* Preferences: Your chosen settings, reminders, and app configurations\n\n📱 Information We Collect Automatically\n* Device Info: Type of device, operating system, and basic system diagnostics\n* Usage Data: How you interact with the app (e.g., which features you use, frequency of use)\n* App Performance: Crash reports and loading times to help us fix bugs and improve speed\n\n🔐 What We Don’t Collect\n* We do not collect your location\n* We do not access your personal files or contacts\n* We do not use your data for targeted advertising\n* We do not track you across other apps or websites\n\nAll collected data is handled with care and is either stored securely or anonymized where appropriate. We do not collect more than we need.`}
          styles={styles}
        />

        <PolicySection
          title="📊 Clause 3: How We Use Your Data"
          content={`We use the information we collect to give you the best possible experience with ELARO, no surprises, no hidden agendas.\n\n✅ Here’s how your data helps:\n* To power core features\nWe use your session and task data to schedule reminders, track your progress, and help you build better study habits.\n* To personalize your experience\nYour preferences and usage patterns help us tailor features like your study calendar, streaks, and in-app prompts.\n* To improve the app\nWe analyze aggregated usage data and performance metrics to make ELARO smoother, faster, and more reliable for everyone.\n* To communicate with you\nWe may send important notifications related to your study sessions, reminders, or changes to the app.\n* To protect ELARO\nWe may use system-level data (e.g., device info, crash logs) to maintain security, prevent misuse, and detect bugs or errors.\n\nWe do not use your personal data for advertising or profiling, and we will never sell your data to third parties.\nYour data stays with us, is treated with respect, and is only used to serve your learning journey.`}
          styles={styles}
        />

        <PolicySection
          title="🤝 Clause 4: Data Sharing"
          content={`We treat your data with care and we only share it when absolutely necessary to make ELARO work properly, comply with the law, or keep the platform secure.\n\n🔐 We do not sell your personal data — ever.\nHere’s when data may be shared:\n* With trusted service providers\nWe may use secure third-party tools (like cloud storage or analytics providers) to help us operate ELARO. These partners only access the data they need, and they’re bound by confidentiality and data protection obligations.\n* If required by law\nWe may disclose your information if we are legally required to do so, such as to respond to a court order, legal process, or a valid request by public authorities.\n* With your explicit permission\nIn the future, if we add features that involve optional data sharing (e.g., inviting a friend, syncing calendars), we’ll ask clearly for your permission before sharing anything.\n* For analytics (in anonymous form)\nWe may share anonymized or aggregated usage data, for example, to understand trends or demonstrate app impact but it cannot be used to identify you.\n\nWe keep your personal data private. When we work with others, we make sure they respect your privacy too.`}
          styles={styles}
        />

        <PolicySection
          title="🛡️ Clause 5: Data Security"
          content={`We take protecting your information seriously and apply industry-standard practices to keep your data safe at all times.\nHere’s what we do to protect your data:\n* Use encryption protocols to safeguard data during transmission and storage\n* Host all user data on secure, trusted infrastructure with access controls\n* Perform regular checks and updates to keep our security measures current\n* Limit access to your data to only those who need it to operate the app\n* Train anyone involved in maintaining ELARO on best practices for data protection\n* Prepare for incidents with internal response procedures in case of any breach or risk\nWhile no system can guarantee 100% security, we are committed to doing everything we reasonably can to protect your information.\nIf you ever suspect unauthorized access or believe your data may be at risk, please contact us immediately at support@myelaro.com .`}
          styles={styles}
        />

        <PolicySection
          title="🗂️ Clause 6: Data Retention"
          content={`We only keep your data for as long as we need it to provide you with ELARO’s services, meet legal requirements, or improve the app.\nHere is how we manage different types of data:\n* Account data\nWe retain your name, email, and session data for as long as your account is active. If you delete your account, we keep a backup for up to 30 days in case you want to recover it. After that, it is permanently deleted.\n* Study sessions and tasks\nYour study history and tasks are stored as long as your account exists. If you delete your account, this data is deleted along with it after the 30-day recovery period.\n* Usage analytics\nWe may store anonymized usage data for up to two years to help us understand how the app is being used and make improvements. This data cannot be linked back to you.\n* Error reports and diagnostics\nTechnical logs and crash reports may be kept for up to one year to help us identify and fix issues.\n* Emails and support requests\nIf you contact us, we may retain those communications for recordkeeping and to improve future support.\nYou can delete your account at any time from within the app. When you do, we begin the deletion process and remove all associated personal data after 30 days.`}
          styles={styles}
        />

        <PolicySection
          title="🌍 Clause 7: International Data Transfers"
          content={`Although ELARO is developed and managed in Ghana, some of the tools and services we use may process or store data in other countries.\nThis means your information might be transferred to and processed in a country outside of Ghana, including countries that may have different data protection laws.\nHere is how we protect your data across borders:\n* We only work with third-party providers who meet strong data protection standards\n* If data leaves Ghana, we ensure appropriate legal safeguards are in place, such as contractual commitments to protect your privacy\n* Regardless of where your data is processed, we apply the same care and security to protect it\nBy using ELARO, you consent to the transfer of your data to other countries where necessary to provide and maintain the service.`}
          styles={styles}
        />

        <PolicySection
          title="👤 Clause 8: Your Rights"
          content={`You have full control over your personal information, and we respect your rights as a user of ELARO.\nHere are your core rights:\n* Access\nYou can request a copy of the personal data we hold about you.\n* Correction\nIf any of your data is inaccurate or outdated, you have the right to request a correction.\n* Deletion\nYou can delete your account at any time from within the app. Once deleted, your data will be permanently removed after a 30-day grace period.\n* Export\nIf you want a portable copy of your data, you can request an export.\n* Objection\nYou can object to certain uses of your data, like marketing or analytics.\n* Withdraw Consent\nIf you previously agreed to something and change your mind, you have the right to withdraw your consent.\nTo make any of these requests, email privacy@elaro.app and we will respond within 30 days.`}
          styles={styles}
        />

        <PolicySection
          title="🍪 Clause 9: Cookies and Tracking"
          content={`ELARO uses a limited form of tracking, only what is essential to help the app run well and improve over time.\nHere's what we do use:\n* Essential app tracking\nWe may track things like how often features are used or if reminders are delivered. This helps us improve the app's functionality.\n* Diagnostic tools\nThese help us monitor performance and fix bugs, like crash reports and screen loading speeds.\nHere's what we don’t use:\n* No advertising trackers\n* No location tracking\n* No cookies that follow you around the internet\n* No third-party marketing scripts\nIf tracking features expand in the future, we’ll give you clear choices and controls. For now, we keep things simple and respectful of your space.`}
          styles={styles}
        />

        <PolicySection
          title="👶 Clause 10: Children’s Privacy"
          content={`ELARO is designed for students, but it is not intended for children under the age of 13.\nWe do not knowingly collect personal information from anyone under 13 years old. If you are a parent or guardian and you believe your child has provided us with personal data, please contact us immediately.\nIf we learn that a user is under 13:\n* We will delete the account and any associated data\n* We will notify the parent or guardian if we have contact information\n* We will block further access unless parental consent is obtained\nFor users between 13 and 18, we recommend that parents or guardians supervise app use, especially when setting reminders or planning academic tasks.`}
          styles={styles}
        />

        <PolicySection
          title="🔄 Clause 12: Policy Updates"
          content={`We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other reasons.\n\nIf we make significant changes, we will notify you through the app or by other means. We encourage you to review this policy periodically to stay informed about how we protect your information.\n\n• Last updated: 16th July 2025`}
          styles={styles}
        />

        <PolicySection
          title="💰 Clause 13: Payments and Subscriptions"
          content={`ELARO offers a paid plan called **Oddity**, which unlocks access to premium academic features. Payments are securely processed using **Paystack**, a trusted third-party payment provider.\n\nHere is how we handle payment-related information:\n\n- **No sensitive payment data is stored by ELARO**. This includes card numbers, names on cards, billing addresses, or CVV codes.\n- All transactions are handled directly by **Paystack** through secure checkout pages embedded in the app or browser redirects.\n- The only payment-related data we retain is a flag in our database indicating whether a user is subscribed to the Oddity plan (\`is_subscribed_to_oddity: true or false\`).\n- We may also track subscription start or end dates and status internally for app logic purposes, but this data is not persisted in the backend database.\n- Users may **cancel their subscription directly inside the app**. This triggers a change in their subscription status, which disables access at the end of the billing cycle. The recurring billing itself is still managed through Paystack.\n- We **do not send payment emails or invoices**. All payment communications (e.g., receipts, failed charges) are managed directly by Paystack.\n- ELARO is intended for users aged 18 and older. We do not knowingly allow minors to make purchases through the app.\n- The **legal basis** for processing payment-related data is **performance of a contract** — we collect and use only what is necessary to deliver paid services that the user has chosen to access.`}
          styles={styles}
        />

        <PolicySection
          title="📞 Clause 14: Contact Us"
          content={`We’re committed to transparency and open communication. If you have questions, concerns, or requests about this Privacy Policy or your personal data, feel free to reach out.\nYou can contact us at:\n*  support@myelaro.com\nWe aim to respond to all inquiries within 15 days`}
          styles={styles}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>We do not sell your data. Ever. 🔒</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default PrivacyPolicyScreen; 