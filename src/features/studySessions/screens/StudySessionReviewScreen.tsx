import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SRSReviewCard } from '../components/SRSReviewCard';
import { supabase } from '@/services/supabase';
import { PrimaryButton } from '@/shared/components';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';

type StudySessionReviewScreenRouteProp = RouteProp<
  RootStackParamList,
  'StudySessionReview'
>;
type StudySessionReviewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'StudySessionReview'
>;

/**
 * StudySessionReviewScreen - Displays SRS review interface for a study session
 *
 * This screen allows users to review their study session and rate their recall quality.
 * After rating, it navigates to StudyResult screen.
 */
const StudySessionReviewScreen: React.FC = () => {
  const route = useRoute<StudySessionReviewScreenRouteProp>();
  const navigation = useNavigation<StudySessionReviewScreenNavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { sessionId } = route.params;

  // Light mode default colors
  const isDark = theme.background === '#101922' || theme.background === '#0A0F14';
  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  const [loading, setLoading] = useState(true);
  const [studySession, setStudySession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudySession = async () => {
      if (!sessionId) {
        setError('Session ID is missing');
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (dbError) throw dbError;
        setStudySession(data);
      } catch (err: any) {
        console.error('Error fetching study session:', err);
        setError(err.message || 'Failed to load study session');
      } finally {
        setLoading(false);
      }
    };

    fetchStudySession();
  }, [sessionId]);

  const handleStudyComplete = (completedSessionId: string) => {
    // Navigate to StudyResult screen
    navigation.navigate('StudyResult', { sessionId: completedSessionId });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
          },
        ]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading study session...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !studySession) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
          },
        ]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: bgColor,
              borderBottomColor: borderColor,
              paddingTop: SPACING.md,
            },
          ]}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Review Study Session
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: textColor }]}>
            {error || 'Study session not found'}
          </Text>
          <PrimaryButton
            title="Go Back"
            onPress={handleBack}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top,
        },
      ]}
      testID="study-session-review-screen">
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: bgColor,
            borderBottomColor: borderColor,
            paddingTop: SPACING.md,
          },
        ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          testID="back-button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Review Study Session
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Session Info */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: surfaceColor,
              borderColor: borderColor,
            },
          ]}>
          <Ionicons name="book-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.infoTitle, { color: textColor }]}>
            {studySession.topic || 'Untitled Study Session'}
          </Text>
          {studySession.description && (
            <Text style={[styles.infoDescription, { color: textSecondaryColor }]}>
              {studySession.description}
            </Text>
          )}
        </View>

        {/* SRS Review Card */}
        <SRSReviewCard
          sessionId={sessionId}
          topic={studySession.topic || 'Study Session'}
          reminderId={undefined}
          onComplete={() => {
            // Optional: Handle completion without navigation
          }}
          onStudyComplete={handleStudyComplete}
        />
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.lg,
  },
  infoCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    ...SHADOWS.xs,
  },
  infoTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    marginLeft: SPACING.md,
  },
  infoDescription: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    marginLeft: 36, // Align with title (icon width + margin)
  },
});

export default StudySessionReviewScreen;
