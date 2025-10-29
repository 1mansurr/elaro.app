import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { recordSRSPerformance, getQualityRatingLabel, getQualityRatingColor } from '@/utils/reminderUtils';

interface SRSReviewCardProps {
  sessionId: string;
  topic: string;
  reminderId?: string;
  onComplete?: () => void;
  onStudyComplete?: (sessionId: string) => void; // Callback to navigate to StudyResult screen
}

export function SRSReviewCard({
  sessionId,
  topic,
  reminderId,
  onComplete,
  onStudyComplete,
}: SRSReviewCardProps) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showRating, setShowRating] = useState(true);

  const qualityOptions = [
    { rating: 0, label: 'Complete Blackout', emoji: '❌', description: 'No memory at all' },
    { rating: 1, label: 'Incorrect', emoji: '😰', description: 'Wrong answer' },
    { rating: 2, label: 'Correct with Effort', emoji: '😅', description: 'Hard to recall' },
    { rating: 3, label: 'Correct with Hesitation', emoji: '🤔', description: 'Some hesitation' },
    { rating: 4, label: 'Correct Easily', emoji: '😊', description: 'Easy to recall' },
    { rating: 5, label: 'Perfect Recall', emoji: '🎯', description: 'Instant recall' },
  ];

  const handleRating = async (rating: number) => {
    setLoading(true);

    try {
      const result = await recordSRSPerformance(sessionId, rating, reminderId);

      if (result.success) {
        setShowRating(false);
        
        Alert.alert(
          rating >= 3 ? '✅ Great Job!' : '💪 Keep Practicing!',
          result.message || `Next review in ${result.nextIntervalDays} days`,
          [
            {
              text: 'OK',
              onPress: () => {
                onComplete?.();
                // Navigate to StudyResult screen if callback provided
                if (onStudyComplete) {
                  onStudyComplete(sessionId);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to record your review');
      }
    } catch (error: any) {
      console.error('Error recording rating:', error);
      Alert.alert('Error', 'Failed to record your review');
    } finally {
      setLoading(false);
    }
  };

  if (!showRating) {
    return (
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <View style={[styles.successIcon, { backgroundColor: '#10B981' + '20' }]}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        </View>
        <Text style={[styles.successText, { color: theme.text }]}>
          Review recorded! Keep up the great work.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="sync-outline" size={24} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          How well did you remember this?
        </Text>
      </View>

      {/* Topic */}
      <Text style={[styles.topic, { color: theme.textSecondary }]}>
        {topic}
      </Text>

      {/* Rating Options */}
      <View style={styles.ratingsContainer}>
        {qualityOptions.map((option) => (
          <TouchableOpacity
            key={option.rating}
            style={[
              styles.ratingButton,
              { 
                backgroundColor: theme.background,
                borderColor: getQualityRatingColor(option.rating) + '40',
              },
            ]}
            onPress={() => handleRating(option.rating)}
            disabled={loading}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <View style={styles.ratingInfo}>
              <Text style={[styles.ratingLabel, { color: theme.text }]}>
                {option.label}
              </Text>
              <Text style={[styles.ratingDescription, { color: theme.textSecondary }]}>
                {option.description}
              </Text>
            </View>
            <View
              style={[
                styles.ratingIndicator,
                { backgroundColor: getQualityRatingColor(option.rating) },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  topic: {
    fontSize: 16,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  ratingsContainer: {
    gap: 12,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ratingDescription: {
    fontSize: 13,
  },
  ratingIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginLeft: 12,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});

