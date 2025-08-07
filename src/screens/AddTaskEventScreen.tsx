import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import {
  AnimatedTouchable,
  InputField,
  TypeSelector,
  RepeatPatternSelector,
} from '../components/events';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const AddTaskEventScreen = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Study');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [reminder, setReminder] = useState('30min');
  const [notes, setNotes] = useState('');
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatDays, setRepeatDays] = useState<string[]>([]);
  const [endDate, setEndDate] = useState(new Date());
  const [errors, setErrors] = useState<{
    title?: string;
    repeatDays?: string;
    endDate?: string;
  }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const { theme } = useTheme();

  const validate = () => {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (isRepeating && repeatDays.length === 0)
      errs.repeatDays = 'Select at least one repeat day';
    if (isRepeating && !endDate) errs.endDate = 'End date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    const data = {
      title: title.trim(),
      eventType,
      date,
      time,
      reminder,
      notes,
      repeatDays,
      endDate,
      isRepeating,
    };

    console.log('Saving task:', data);
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.gray100 },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close and go back">
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          New Task
        </Text>
        <AnimatedTouchable
          onPress={onSave}
          accessibilityLabel="Save task"
          accessibilityHint="Double tap to save the task">
          <Text style={[styles.saveText, { color: theme.primary }]}>Save</Text>
        </AnimatedTouchable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <InputField
          label="Title"
          icon="pencil"
          required
          error={errors.title}
          accessibilityLabel="Task title input">
          <TextInput
            style={[styles.textInput, { color: theme.text }]}
            placeholder="e.g. Read Chapter 4"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={theme.textSecondary}
          />
        </InputField>

        <InputField
          label="Type"
          icon="bookmark"
          accessibilityLabel="Event type selector">
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowTypeSelector(true)}>
            <Text style={styles.selectorText}>{eventType}</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </InputField>

        <InputField
          label="Date"
          icon="calendar"
          accessibilityLabel="Date picker">
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowDatePicker(true)}>
            <Text style={styles.selectorText}>{date.toLocaleDateString()}</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </InputField>

        <InputField
          label="Notes"
          icon="document-text"
          accessibilityLabel="Task notes input">
          <TextInput
            style={[styles.textInput, styles.notesInput, { color: theme.text }]}
            placeholder="Add any additional notes..."
            value={notes}
            onChangeText={setNotes}
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
          />
        </InputField>

        {eventType === 'Lecture' && (
          <RepeatPatternSelector
            selectedDays={repeatDays}
            onDaysChange={setRepeatDays}
            endDate={endDate}
            onEndDateChange={setEndDate}
            errors={errors}
          />
        )}
      </ScrollView>

      <TypeSelector
        selectedType={eventType}
        onSelect={setEventType}
        isVisible={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
      />

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold as any,
    // color: COLORS.text,
  },
  saveText: {
    // color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
    fontSize: FONT_SIZES.md,
  },
  content: {
    padding: SPACING.lg,
  },
  textInput: {
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    // color: COLORS.text,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  selectorText: {
    fontSize: FONT_SIZES.md,
    // color: COLORS.text,
  },
});

export default AddTaskEventScreen;
