// FILE: src/components/NextTaskCard.tsx
import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Task } from '@/types';
import { Button } from '@/shared/components';
import { isTempId } from '@/utils/uuid';
import { formatDate } from '@/i18n';

interface Props {
  task: Task | null;
  isGuestMode?: boolean;
  onAddActivity?: () => void;
  onViewDetails?: (task: Task) => void; // Add this prop
}

const NextTaskCard: React.FC<Props> = ({
  task,
  isGuestMode = false,
  onAddActivity,
  onViewDetails,
}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const getTaskTime = (dateString: string) => {
    const date = new Date(dateString);
    return formatDate(date, { hour: '2-digit', minute: '2-digit' });
  };

  const handlePress = () => {
    if (isGuestMode || !task) return;
    // Later, this can navigate to a unified task detail screen
  };

  const renderContent = () => {
    if (task) {
      const isPendingSync = isTempId(task.id);
      const isExample =
        'is_example' in task &&
        (task as Task & { is_example?: boolean }).is_example === true;

      return (
        <>
          <View style={styles.typeRow}>
            <Text style={styles.taskType}>{task.type.replace('_', ' ')}</Text>
            <View style={styles.badgeContainer}>
              {/* Example Badge */}
              {isExample && (
                <View style={styles.exampleBadge}>
                  <Ionicons
                    name="information-circle"
                    size={14}
                    color="#007AFF"
                  />
                  <Text style={styles.exampleText}>EXAMPLE</Text>
                </View>
              )}
              {/* Pending Sync Indicator */}
              {isPendingSync && (
                <View style={styles.pendingBadge}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={14}
                    color="#FF9500"
                  />
                  <Text style={styles.pendingText}>Pending Sync</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.taskName}>{task.name}</Text>

          <View style={styles.footer}>
            <Text style={styles.courseName}>{task.courses.courseName}</Text>
            <Text style={styles.time}>{getTaskTime(task.date)}</Text>
          </View>

          {/* Start Study Button - for study_session tasks */}
          {task.type === 'study_session' && (
            <TouchableOpacity
              style={styles.startStudyButton}
              onPress={() => {
                navigation.navigate('StudySessionReview', {
                  sessionId: task.id,
                });
              }}
              testID="start-study-button"
              accessibilityLabel="Start study session"
              accessibilityHint={`Opens the study session for ${task.name}`}
              accessibilityRole="button">
              <Ionicons name="play-circle" size={20} color="#FFFFFF" />
              <Text style={styles.startStudyText}>Start Study</Text>
            </TouchableOpacity>
          )}

          {/* View Details Button */}
          {onViewDetails && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => onViewDetails(task)}
              accessibilityLabel="View task details"
              accessibilityHint={`Shows detailed information about ${task.name}`}
              accessibilityRole="button">
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#2C5EFF" />
            </TouchableOpacity>
          )}
        </>
      );
    }

    if (isGuestMode) {
      return (
        <View style={styles.guestContainer}>
          <Text style={styles.noTaskText}>You have no upcoming activities</Text>
          <Button
            title="Add Your First Activity"
            onPress={onAddActivity || (() => {})}
            style={{ marginTop: 16 }}
          />
        </View>
      );
    }

    return (
      <Text style={styles.noTaskText}>
        You&apos;re all clear for now. Enjoy the break!
      </Text>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.header}>What&apos;s Next?</Text>

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#F0F0F5',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  exampleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  exampleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9500',
  },
  taskName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
    lineHeight: 36,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#E8E8ED',
    paddingTop: 20,
    marginTop: 4,
  },
  courseName: {
    fontSize: 18,
    color: '#495057',
    fontWeight: '600',
  },
  time: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  noTaskText: {
    fontSize: 20,
    color: '#495057',
    textAlign: 'center',
    paddingVertical: 24,
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F5FF',
    borderRadius: 10,
  },
  viewDetailsText: {
    color: '#007AFF',
    fontWeight: '700',
    marginRight: 4,
    fontSize: 16,
  },
  startStudyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    gap: 8,
  },
  startStudyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default memo(NextTaskCard);
