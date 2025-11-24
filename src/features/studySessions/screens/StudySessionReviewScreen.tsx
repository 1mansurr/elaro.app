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

import { RootStackParamList } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SRSReviewCard } from '../components/SRSReviewCard';
import { supabase } from '@/services/supabase';

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
  const { user } = useAuth();

  const { sessionId } = route.params;

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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading study session...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !studySession) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Review Study Session
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={48}
            color={theme.error || '#EF4444'}
          />
          <Text style={[styles.errorText, { color: theme.text }]}>
            {error || 'Study session not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={handleBack}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      testID="study-session-review-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          testID="back-button">
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Review Study Session
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Session Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
          <Ionicons name="book-outline" size={24} color={theme.primary} />
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            {studySession.topic || 'Untitled Study Session'}
          </Text>
          {studySession.description && (
            <Text
              style={[styles.infoDescription, { color: theme.textSecondary }]}>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoDescription: {
    marginTop: 8,
    fontSize: 14,
    marginLeft: 36, // Align with title (icon width + margin)
  },
});

export default StudySessionReviewScreen;
