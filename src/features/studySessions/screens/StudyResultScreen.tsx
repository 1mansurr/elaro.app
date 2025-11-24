import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/shared/components';

type StudyResultScreenRouteProp = RouteProp<RootStackParamList, 'StudyResult'>;
type StudyResultScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'StudyResult'
>;

/**
 * StudyResultScreen - Placeholder for study session results
 *
 * This screen will display results and completion information after a study session.
 * Currently a placeholder implementation - to be enhanced with actual results data.
 */
const StudyResultScreen: React.FC = () => {
  const route = useRoute<StudyResultScreenRouteProp>();
  const navigation = useNavigation<StudyResultScreenNavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { sessionId } = route.params;

  const handleDone = () => {
    navigation.goBack();
    // Optionally navigate to main screen
    navigation.navigate('Main');
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      testID="study-result-screen">
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={64} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Study Session Complete!
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Great work on completing your study session.
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Session Summary
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Session ID: {sessionId}
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            This is a placeholder screen. Future enhancements will include:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>
              • Detailed performance metrics
            </Text>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>
              • Study statistics and progress
            </Text>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>
              • Recommendations for next session
            </Text>
            <Text style={[styles.bullet, { color: theme.textSecondary }]}>
              • Achievement badges and milestones
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Done"
          onPress={handleDone}
          style={styles.doneButton}
          testID="study-result-done-button"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  bulletList: {
    marginTop: 12,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  doneButton: {
    marginTop: 10,
  },
});

export default StudyResultScreen;
