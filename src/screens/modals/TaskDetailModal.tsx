import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { shouldDecrementUsageOnDelete } from '../../utils/dateUtils';
import { taskService } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface TaskDetailModalProps {
  navigation: any;
  route: any;
}

export default function TaskDetailModal({ navigation, route }: TaskDetailModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { task } = route.params || {};

  const handleClose = () => { if (navigation.canGoBack()) navigation.goBack(); };

  const handleEdit = () => {
    navigation.navigate('AddModal', { editMode: true, task });
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user || !task) return;
              // Check if usage should be decremented
              const shouldDecrement = shouldDecrementUsageOnDelete(task);
              // Delete the task
              await taskService.deleteTask(task.id);
              // Optionally update usage count in local state/UI
              if (shouldDecrement) {
                // Usage count is based on rows, so after deletion, get the new count
                const newCount = await taskService.getWeeklyTaskCount(user.id);
                // Update your local state/UI here if needed
                // e.g., setUsedTaskCount(newCount);
                // Optionally show a toast or feedback
              }
              if (navigation.canGoBack()) navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task.');
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.gray100 }]}>
          <Pressable 
            onPress={handleClose} 
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { backgroundColor: theme.gray100 }
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close task details"
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.content}>
          <View style={[styles.errorCard, { backgroundColor: theme.white, ...SHADOWS.sm }]}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
            <Text style={[styles.errorTitle, { color: theme.text }]}>Task Not Found</Text>
            <Text style={[styles.errorText, { color: theme.textSecondary, lineHeight: 22 }]}>The task you're looking for doesn't exist or has been removed.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.gray100 }]}>
        <Pressable 
          onPress={handleClose} 
          style={({ pressed }) => [
            styles.closeButton,
            pressed && { backgroundColor: theme.gray100 }
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close task details"
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Task Details</Text>
        <Pressable 
          onPress={handleEdit} 
          style={({ pressed }) => [
            styles.editButton,
            pressed && { backgroundColor: theme.gray100 }
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit task"
        >
          <Ionicons name="create-outline" size={24} color={theme.primary} />
        </Pressable>
      </View>

      {/* Body */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={[styles.taskCard, { backgroundColor: theme.white, ...SHADOWS.md }]}>
          {/* Title & Type */}
          <View style={styles.taskHeader}>
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: theme[task.color as keyof typeof theme] || theme.gray },
              ]}
            />
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: theme.text, marginBottom: SPACING.xs }]}>{task.title}</Text>
              <Text style={[styles.taskType, { color: theme.textSecondary, textTransform: 'capitalize' }]}>{task.type}</Text>
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.detailSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]} >Date & Time</Text>
            </View>
            <Text style={[styles.detailText, { color: theme.textSecondary, lineHeight: 22 }]}>{formatDateTime(task.date_time)}</Text>
          </View>

          {/* Reminders */}
          {task.reminders?.length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="notifications-outline" size={20} color={theme.warning} />
                <Text style={[styles.sectionTitle, { color: theme.text }]} >Reminders</Text>
              </View>
              {task.reminders.map((reminder: string, index: number) => (
                <View key={index} style={styles.reminderItem}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                  <Text style={[styles.detailText, { color: theme.textSecondary, lineHeight: 22 }]}>{reminder}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Repeat */}
          {task.repeat_pattern && (
            <View style={styles.detailSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="repeat-outline" size={20} color={theme.success} />
                <Text style={[styles.sectionTitle, { color: theme.text }]} >Repeat Pattern</Text>
              </View>
              <Text style={[styles.detailText, { color: theme.textSecondary, lineHeight: 22 }]}>{task.repeat_pattern}</Text>
            </View>
          )}
        </View>

        {/* Delete Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.deleteButton,
            { borderWidth: 1, borderColor: theme.error, backgroundColor: theme.white, ...SHADOWS.small },
            pressed && { backgroundColor: theme.red100, transform: [{ scale: 0.98 }] }
          ]} 
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete task"
        >
          <Ionicons name="trash-outline" size={20} color={theme.error} />
          <Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Task</Text>
        </Pressable>
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
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    ...SHADOWS.sm,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  closeButtonPressed: {},
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  editButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  editButtonPressed: {
    // backgroundColor: theme.primaryLight, // Remove theme usage here
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.lg,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  taskCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: SPACING.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  taskType: {
    fontSize: FONT_SIZES.md,
    marginTop: 2,
  },
  detailSection: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.md,
    marginLeft: 24,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
    marginBottom: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  deleteButtonPressed: {},
  deleteButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
}); 