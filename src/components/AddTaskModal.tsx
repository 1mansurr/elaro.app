import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,

  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomModal } from './BottomModal';
import { Button } from './Button';
import { AuthModal } from './AuthModal';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { taskService } from '../services/supabase';
import { notificationService } from '../services/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useSoftLaunch } from '../contexts/SoftLaunchContext';
import { AddTaskForm, ColorOption, ReminderTime, RepeatPattern } from '../types';
import { Picker } from '@react-native-picker/picker';
import { DateTimePicker } from './DateTimePicker';
import { Input } from './Input';
import { RepeatPatternSelector } from './events/RepeatPatternSelector';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TASK_TYPES = [
  { value: 'assignment', label: 'Assignment', icon: 'document-text' },
  { value: 'exam', label: 'Exam', icon: 'school' },
  { value: 'lecture', label: 'Lecture', icon: 'people' },
  { value: 'program', label: 'Program', icon: 'calendar' },
];

const COLOR_OPTIONS: ColorOption[] = ['green', 'blue', 'purple', 'orange', 'yellow', 'pink'];
const REMINDER_OPTIONS: { value: ReminderTime; label: string }[] = [
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hr', label: '1 hour before' },
  { value: '24hr', label: '24 hours before' },
];

const REPEAT_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom Days' },
];

// Locally override AddTaskForm type to allow string reminders
// (ReminderTime | string)[]
type AddTaskFormWithCustomReminders = Omit<AddTaskForm, 'reminders'> & { reminders: (ReminderTime | string)[] };

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { blockPremiumFeature } = useSoftLaunch();
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [form, setForm] = useState<AddTaskFormWithCustomReminders>({
    type: 'assignment',
    title: '',
    dateTime: new Date(),
    color: 'blue',
    reminders: [],
    repeatPattern: undefined,
  });
  
  // Remove any old custom calendar or time picker code and state
  // Only use the new DateTimePicker for date/time selection
  // Remove date and time state if not needed
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState('');
  const [customReminderUnit, setCustomReminderUnit] = useState('minutes');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const { theme, isDark } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');

  // When either date or time changes, update form.dateTime
  useEffect(() => {
    const combined = new Date(form.dateTime);
    combined.setHours(form.dateTime.getHours());
    combined.setMinutes(form.dateTime.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    setForm(prev => ({ ...prev, dateTime: combined }));
  }, [form.dateTime]);

  // Helper to get color hex for color options
  const getColorHex = (color: string) => {
    // Try theme first
    if ((theme as any)[color]) return (theme as any)[color];
    // Fallbacks for known color names
    const fallback: Record<string, string> = {
      green: '#22c55e',
      blue: '#3b82f6',
      purple: '#a855f7',
      orange: '#f97316',
      yellow: '#eab308',
      pink: '#ec4899',
      red: '#ef4444',
    };
    return fallback[color] || color;
  };

  const handleInputChange = (field: keyof AddTaskFormWithCustomReminders, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };



  const toggleReminder = (reminder: ReminderTime) => {
    const newReminders = form.reminders.includes(reminder)
      ? form.reminders.filter(r => r !== reminder)
      : [...form.reminders, reminder];
    handleInputChange('reminders', newReminders);
  };

  const getDefaultColor = (type: string): ColorOption => {
    switch (type) {
      case 'assignment': return 'yellow';
      case 'exam': return 'red';
      case 'lecture': return 'purple';
      case 'program': return 'blue';
      default: return 'green';
    }
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return false;
    }
    if (form.dateTime <= new Date()) {
      Alert.alert('Error', 'Please select a future date and time');
      return false;
    }
    return true;
  };

  const checkTaskLimit = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      if (isSubscribed) {
        // Check total active tasks for Oddity plan
        const activeCount = await taskService.getActiveTasks(user.id);
        if (activeCount >= 35) {
          Alert.alert(
            'Task Limit Reached',
            'You have reached the maximum of 35 active tasks. Complete or delete some tasks to continue.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } else {
        // Check weekly limit for Origin plan
        const weeklyCount = await taskService.getWeeklyTaskCount(user.id);
        if (weeklyCount >= 14) {
          blockPremiumFeature('unlimited-tasks');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking task limit:', error);
      return true; // Allow creation if check fails
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!validateForm()) return;

    const canAdd = await checkTaskLimit();
    if (!canAdd) return;

    setIsSubmitting(true);

    try {
      // Create the task
      const task = await taskService.createTask({
        user_id: user.id,
        type: form.type,
        title: form.title.trim(),
        date_time: form.dateTime.toISOString(),
        color: form.color,
        reminders: form.reminders.filter(r => typeof r !== 'string') as ReminderTime[],
        repeat_pattern: form.repeatPattern,
        completed: false,
      });

      // Schedule reminders if any
      const builtinReminders = form.reminders.filter(r => typeof r !== 'string') as ReminderTime[];
      if (builtinReminders.length > 0) {
        if (form.repeatPattern && form.type === 'lecture') {
          // Schedule repeating reminders for lectures
          await notificationService.scheduleRepeatingReminders({
            itemId: task.id,
            itemTitle: form.title,
            startDate: form.dateTime,
            repeatPattern: form.repeatPattern,
            reminderTimes: builtinReminders,
          });
        } else {
          // Schedule single reminders
          await notificationService.scheduleItemReminders({
            itemId: task.id,
            itemTitle: form.title,
            itemType: form.type,
            dateTime: form.dateTime,
            reminderTimes: builtinReminders,
          });
        }
      }

      Alert.alert('Success', 'Task created successfully!');
      onSuccess?.();
      onClose();
      
      // Reset form
      setForm({
        type: 'assignment',
        title: '',
        dateTime: new Date(),
        color: 'blue',
        reminders: [],
        repeatPattern: undefined,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthSuccess = () => {
    // After successful authentication, the user can try submitting again
    // The form will be re-validated and submitted
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Add Task / Event"
      height={0.6}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} scrollEnabled={!isTimePickerOpen}>
        <View style={{ width: Math.min(screenWidth * 0.9, 500), alignSelf: 'center' }}>
        {/* Task Type Selector */}
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {TASK_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: form.type === type.value ? theme.input : 'transparent',
                  borderWidth: form.type === type.value ? 1 : 0,
                  borderColor: form.type === type.value ? theme.accent : 'transparent',
                  marginRight: 8,
                }}
                onPress={() => handleInputChange('type', type.value)}
                accessibilityRole="button"
                accessibilityLabel={type.label}
              >
                <Ionicons name={type.icon as any} size={22} color={form.type === type.value ? theme.accent : theme.textSecondary} />
                <Text style={{ color: form.type === type.value ? theme.accent : theme.textSecondary, fontWeight: '600', marginTop: 4 }}>{type.label}</Text>
              </TouchableOpacity>
            ))}
        </View>
        {/* Title Input */}
        <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Title</Text>
          <TextInput
          style={{
            backgroundColor: theme.input,
            color: theme.text,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            borderWidth: 1,
            borderColor: theme.inputBorder,
            marginBottom: 16,
          }}
          placeholder="e.g. Math Assignment"
          placeholderTextColor={theme.textSecondary}
            value={form.title}
          onChangeText={(text: string) => handleInputChange('title', text)}
        />
        {/* Type-Specific Fields */}
        {form.type === 'assignment' && (
          <>
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Course Name</Text>
            <Input
              value={form.details?.courseName || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, courseName: text })}
              placeholder="e.g. Chemistry 101"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Description</Text>
            <Input
              value={form.details?.description || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, description: text })}
              placeholder="Optional details or instructions"
              placeholderTextColor={theme.textSecondary}
              multiline
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>File Link</Text>
            <Input
              value={form.details?.fileLink || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, fileLink: text })}
              placeholder="Paste a link to a file (optional)"
              placeholderTextColor={theme.textSecondary}
            />
          </>
        )}
        {form.type === 'exam' && (
          <>
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Course/Subject</Text>
            <Input
              value={form.details?.course || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, course: text })}
              placeholder="e.g. Physics"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Exam Type</Text>
            <Input
              value={form.details?.examType || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, examType: text })}
              placeholder="Midterm, Final, Quiz, etc."
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Location</Text>
            <Input
              value={form.details?.location || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, location: text })}
              placeholder="Room or online link (optional)"
              placeholderTextColor={theme.textSecondary}
            />
            {/* Toggles for studyReminder and spacedRepetition can be added here */}
          </>
        )}
        {form.type === 'lecture' && (
          <>
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Course/Topic</Text>
            <Input
              value={form.details?.courseOrTopic || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, courseOrTopic: text })}
              placeholder="e.g. Thermodynamics Week 2"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Lecturer</Text>
            <Input
              value={form.details?.lecturer || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, lecturer: text })}
              placeholder="Name (optional)"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Location/Link</Text>
            <Input
              value={form.details?.locationOrLink || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, locationOrLink: text })}
              placeholder="Room or Zoom link"
              placeholderTextColor={theme.textSecondary}
            />
            {/* RepeatPatternSelector and end date picker can be added here */}
          </>
        )}
        {form.type === 'program' && (
          <>
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Program Title</Text>
            <Input
              value={form.details?.programTitle || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, programTitle: text })}
              placeholder="e.g. AWS Cloud Bootcamp"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Link</Text>
            <Input
              value={form.details?.link || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, link: text })}
              placeholder="Registration or info link (optional)"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Organizer</Text>
            <Input
              value={form.details?.organizer || ''}
              onChangeText={(text: string) => handleInputChange('details', { ...form.details, organizer: text })}
              placeholder="e.g. Tech Society (optional)"
              placeholderTextColor={theme.textSecondary}
            />
            {/* Duration (start/end date) pickers can be added here */}
          </>
        )}
        {/* Date and Time Picker */}
        <DateTimePicker
          value={form.dateTime}
          onChange={(newDateTime) => {
            setForm(prev => ({ ...prev, dateTime: newDateTime }));
          }}
          label="Date & Time"
          onPickerModeChange={mode => setIsTimePickerOpen(mode === 'time')}
        />
        {/* Color Selector */}
        <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Color</Text>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: getColorHex(color),
                marginRight: 10,
                borderWidth: form.color === color ? 2 : 0,
                borderColor: form.color === color ? theme.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
                onPress={() => handleInputChange('color', color)}
                accessibilityRole="button"
              accessibilityLabel={color}
              >
              {form.color === color && <Ionicons name="checkmark" size={18} color={theme.text} />}
            </TouchableOpacity>
          ))}
          </View>
        {/* Reminders */}
        <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>Reminders</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {REMINDER_OPTIONS.map((reminder) => (
            <TouchableOpacity
              key={reminder.value}
              style={{
                backgroundColor: form.reminders.includes(reminder.value) ? theme.accent : theme.input,
                borderRadius: 16,
                paddingVertical: 6,
                paddingHorizontal: 14,
                marginRight: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: form.reminders.includes(reminder.value) ? theme.accent : theme.inputBorder,
              }}
              onPress={() => toggleReminder(reminder.value)}
              accessibilityRole="button"
              accessibilityLabel={reminder.label}
            >
              <Text style={{ color: form.reminders.includes(reminder.value) ? theme.background : theme.textSecondary }}>{reminder.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Submit Button */}
        <Button
          title={isSubmitting ? 'Adding...' : 'Add Task'}
          onPress={handleSubmit}
          disabled={isSubmitting}
        />
        </View>
      </ScrollView>
    </BottomModal>
    <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthSuccess={handleAuthSuccess} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    minWidth: 110,
    marginBottom: SPACING.sm,
  },
  selectedType: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  typeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  selectedTypeText: {
    color: COLORS.white,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  dateTimeText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  selectedColor: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    shadowOpacity: 0.15,
    elevation: 2,
  },
  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  repeatText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reminderText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
}); 