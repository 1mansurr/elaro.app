import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BottomModal } from './BottomModal';
import { Button } from './Button';
import { AuthModal } from './AuthModal';
import { useTheme } from '../contexts/ThemeContext';
import { sessionService, srService, supabase } from '../services/supabase';
import { notificationService } from '../services/notifications';
import { useAuth } from '../contexts/AuthContext';
import { AddSessionForm, ColorOption, ReminderTime } from '../types';
import { Picker } from '@react-native-picker/picker';
import { DateTimePicker } from './DateTimePicker';

interface AddSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COLOR_OPTIONS: ColorOption[] = [
  'green',
  'blue',
  'purple',
  'orange',
  'yellow',
  'pink',
];
const REMINDER_OPTIONS: { value: ReminderTime; label: string }[] = [
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hr', label: '1 hour before' },
  { value: '24hr', label: '24 hours before' },
];

// Locally override AddSessionForm type to allow string reminders
// (ReminderTime | string)[]
type AddSessionFormWithCustomReminders = Omit<AddSessionForm, 'reminders'> & {
  reminders: (ReminderTime | string)[];
};

export const AddSessionModal: React.FC<AddSessionModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [form, setForm] = useState<AddSessionFormWithCustomReminders>({
    course: '',
    topic: '',
    dateTime: new Date(),
    color: 'green',
    spacedRepetition: false,
    reminders: [],
  });

  // Remove any old custom calendar or time picker code and state
  // Only use the new DateTimePicker for date/time selection
  // Remove date and time state if not needed

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const { theme, isDark } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  // Helper to get color hex for color options
  const getColorHex = (color: string) => {
    if ((theme as any)[color]) return (theme as any)[color];
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

  const handleInputChange = (
    field: keyof AddSessionFormWithCustomReminders,
    value: any,
  ) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // When either date or time changes, update form.dateTime
  useEffect(() => {
    const combined = new Date(form.dateTime);
    combined.setHours(form.dateTime.getHours());
    combined.setMinutes(form.dateTime.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    setForm(prev => ({ ...prev, dateTime: combined }));
  }, [form.dateTime]);

  const validateForm = (): boolean => {
    if (!form.course.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return false;
    }
    if (!form.topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return false;
    }
    if (form.dateTime <= new Date()) {
      Alert.alert('Error', 'Please select a future date and time');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Create the study session
      const session = await sessionService.createSession({
        user_id: user.id,
        course: form.course.trim(),
        topic: form.topic.trim(),
        date_time: form.dateTime.toISOString(),
        color: form.color,
        spaced_repetition_enabled: form.spacedRepetition,
        reminders: form.reminders.filter(
          r => typeof r !== 'string',
        ) as ReminderTime[],
        completed: false,
      });

      // Schedule reminders if any
      const builtinReminders = form.reminders.filter(
        r => typeof r !== 'string',
      ) as ReminderTime[];
      if (builtinReminders.length > 0) {
        await notificationService.scheduleItemReminders({
          itemId: session.id,
          itemTitle: `${form.course}: ${form.topic}`,
          itemType: 'Study Session',
          dateTime: form.dateTime,
          reminderTimes: builtinReminders,
        });
      }

      // Schedule spaced repetition reminders via Edge Function
      if (form.spacedRepetition) {
        const { error: functionError } = await supabase.functions.invoke(
          'schedule-reminders',
          {
            body: { session_id: session.id },
          },
        );
        if (functionError) {
          throw functionError;
        }
      }

      Alert.alert('Success', 'Study session created successfully!');
      onSuccess?.();
      onClose();

      // Reset form
      setForm({
        course: '',
        topic: '',
        dateTime: new Date(),
        color: 'green',
        spacedRepetition: false,
        reminders: [],
      });
    } catch (error) {
      console.error('Error creating study session:', error);
      Alert.alert('Error', 'Failed to create study session. Please try again.');
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
        title="Add Study Session"
        height={0.6}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          scrollEnabled={!isTimePickerOpen}>
          <View
            style={{
              width: Math.min(screenWidth * 0.96, 600),
              alignSelf: 'center',
            }}>
            {/* Course Input */}
            <Text
              style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
              Course *
            </Text>
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
              value={form.course}
              onChangeText={text => handleInputChange('course', text)}
              placeholder="e.g., Mathematics, Physics"
              placeholderTextColor={theme.textSecondary}
              accessibilityRole="text"
              accessibilityLabel="Course name input"
            />
            {/* Topic Input */}
            <Text
              style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
              Topic *
            </Text>
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
              value={form.topic}
              onChangeText={text => handleInputChange('topic', text)}
              placeholder="e.g., Calculus Basics, Newton's Laws"
              placeholderTextColor={theme.textSecondary}
              accessibilityRole="text"
              accessibilityLabel="Topic name input"
            />
            {/* Date and Time Picker */}
            <DateTimePicker
              value={form.dateTime}
              onChange={newDateTime => {
                setForm(prev => ({ ...prev, dateTime: newDateTime }));
              }}
              label="Date & Time"
              onPickerModeChange={mode => setIsTimePickerOpen(mode === 'time')}
            />
            {/* Color Selection */}
            <Text
              style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
              Color
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: getColorHex(color),
                    marginRight: 10,
                    borderWidth: form.color === color ? 2 : 0,
                    borderColor:
                      form.color === color ? theme.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => handleInputChange('color', color)}
                  accessibilityRole="button"
                  accessibilityLabel={color}>
                  {form.color === color && (
                    <Ionicons name="checkmark" size={18} color={theme.text} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {/* Reminders */}
            <Text
              style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>
              Reminders
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: 8,
              }}>
              {REMINDER_OPTIONS.map(reminder => (
                <TouchableOpacity
                  key={reminder.value}
                  style={{
                    backgroundColor: form.reminders.includes(reminder.value)
                      ? theme.accent
                      : theme.input,
                    borderRadius: 16,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    marginRight: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: form.reminders.includes(reminder.value)
                      ? theme.accent
                      : theme.inputBorder,
                  }}
                  onPress={() =>
                    handleInputChange('reminders', [
                      ...form.reminders,
                      reminder.value,
                    ])
                  }
                  accessibilityRole="button"
                  accessibilityLabel={reminder.label}>
                  <Text
                    style={{
                      color: form.reminders.includes(reminder.value)
                        ? theme.background
                        : theme.textSecondary,
                    }}>
                    {reminder.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Submit Button */}
            <Button
              title={isSubmitting ? 'Adding...' : 'Add Session'}
              onPress={handleSubmit}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </BottomModal>
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
};
