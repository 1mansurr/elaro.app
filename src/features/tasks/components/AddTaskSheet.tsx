import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import RNModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceId } from '@/hooks/useDeviceId';
import { useNetwork } from '@/contexts/NetworkContext';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import {
  Input,
  CardBasedDateTimePicker,
  TemplateCard,
  ReminderChip,
} from '@/shared/components';
import { api } from '@/services/api';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { formatReminderLabel, REMINDER_OPTIONS } from '@/utils/reminderUtils';
import { TaskType } from './TypeSelectorField';
import { RecurringReminder, TaskTypeDefinition } from '@/types/entities';
import { CreateTypeSheet } from './CreateTypeSheet';
import { CustomTaskForm } from './CustomTaskForm';

const RECURRING_OPTIONS: Array<{ value: RecurringReminder; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_3_days', label: 'Every 3 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
];

interface AddTaskSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: () => void;
}

// ─── Assignment form ──────────────────────────────────────────────────────────

type SubmissionMethod = 'Online' | 'In-person' | null;

const AssignmentForm: React.FC<{ onSave: () => void; onClose: () => void }> = ({
  onSave,
  onClose,
}) => {
  const deviceId = useDeviceId();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [submissionMethod, setSubmissionMethod] =
    useState<SubmissionMethod>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionVenue, setSubmissionVenue] = useState('');
  const [reminders, setReminders] = useState<number[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isFormValid = title.trim().length > 0 && dueDate > new Date();

  const handleDateChange = (date: Date) => {
    const next = new Date(date);
    next.setHours(dueDate.getHours());
    next.setMinutes(dueDate.getMinutes());
    setDueDate(next);
  };

  const handleTimeChange = (time: Date) => {
    const next = new Date(dueDate);
    next.setHours(time.getHours());
    next.setMinutes(time.getMinutes());
    setDueDate(next);
  };

  const handleSelectReminder = (minutes: number) => {
    if (reminders.includes(minutes)) {
      setReminders(reminders.filter(r => r !== minutes));
    } else if (reminders.length < 2) {
      setReminders([...reminders, minutes].sort((a, b) => a - b));
    }
    setShowReminderModal(false);
  };

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setIsSaving(true);
    try {
      await api.mutations.assignments.create(
        {
          title: title.trim(),
          description: description.trim(),
          submission_method: submissionMethod || undefined,
          submission_link:
            submissionMethod === 'Online' ? submissionLink.trim() : undefined,
          submission_venue:
            submissionMethod === 'In-person'
              ? submissionVenue.trim()
              : undefined,
          due_date: dueDate.toISOString(),
          reminders,
        },
        isOnline,
        deviceId || '',
      );
      const { invalidateTaskQueries } =
        await import('@/utils/queryInvalidation');
      await invalidateTaskQueries(queryClient, 'assignment');
      onSave();
    } catch (error) {
      console.error('Failed to create assignment:', error);
      Alert.alert(getErrorTitle(error), mapErrorCodeToMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Title */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Assignment Title</Text>
          <Text style={styles.charCount}>{title.length}/35</Text>
        </View>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., History Essay"
          maxLength={35}
        />
      </View>

      {/* Due Date & Time */}
      <View style={styles.field}>
        <CardBasedDateTimePicker
          date={dueDate}
          time={dueDate}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          label="Due Date & Time"
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Add notes or details..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          maxLength={500}
        />
      </View>

      {/* Submission Method */}
      <View style={styles.field}>
        <Text style={styles.label}>Submission Method</Text>
        <View style={styles.methodRow}>
          {(['Online', 'In-person'] as SubmissionMethod[]).map(method => (
            <TouchableOpacity
              key={method!}
              style={[
                styles.methodChip,
                submissionMethod === method && styles.methodChipSelected,
              ]}
              onPress={() =>
                setSubmissionMethod(submissionMethod === method ? null : method)
              }
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.methodChipText,
                  submissionMethod === method && styles.methodChipTextSelected,
                ]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {submissionMethod === 'Online' && (
          <Input
            value={submissionLink}
            onChangeText={setSubmissionLink}
            placeholder="Submission URL"
            style={{ marginTop: SPACING.sm }}
          />
        )}
        {submissionMethod === 'In-person' && (
          <Input
            value={submissionVenue}
            onChangeText={setSubmissionVenue}
            placeholder="Venue / Location"
            style={{ marginTop: SPACING.sm }}
          />
        )}
      </View>

      {/* Reminders */}
      <ReminderSection
        reminders={reminders}
        onRemove={m => setReminders(reminders.filter(r => r !== m))}
        onAdd={() => setShowReminderModal(true)}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!isFormValid || isSaving}
        activeOpacity={0.8}>
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Assignment</Text>
        )}
      </TouchableOpacity>

      <ReminderPickerModal
        visible={showReminderModal}
        reminders={reminders}
        onSelect={handleSelectReminder}
        onClose={() => setShowReminderModal(false)}
      />
    </>
  );
};

// ─── Study Session form ───────────────────────────────────────────────────────

const StudySessionForm: React.FC<{
  onSave: () => void;
  onClose: () => void;
}> = ({ onSave }) => {
  const deviceId = useDeviceId();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState('');
  const [sessionDate, setSessionDate] = useState<Date | null>(null);
  const [hasPickedDate, setHasPickedDate] = useState(false);
  const [hasPickedTime, setHasPickedTime] = useState(false);
  const [description, setDescription] = useState('');
  const [hasSpacedRepetition, setHasSpacedRepetition] = useState(false);
  const [recurringReminder, setRecurringReminder] =
    useState<RecurringReminder | null>(null);
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [hasPickedEndDate, setHasPickedEndDate] = useState(false);
  const [reminders, setReminders] = useState<number[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isFormValid =
    topic.trim().length > 0 && sessionDate && hasPickedDate && hasPickedTime;

  const handleDateChange = (date: Date) => {
    const next = new Date(date);
    if (sessionDate) {
      next.setHours(sessionDate.getHours());
      next.setMinutes(sessionDate.getMinutes());
    }
    setSessionDate(next);
    setHasPickedDate(true);
  };

  const handleTimeChange = (time: Date) => {
    const next = sessionDate ? new Date(sessionDate) : new Date();
    next.setHours(time.getHours());
    next.setMinutes(time.getMinutes());
    setSessionDate(next);
    setHasPickedTime(true);
    if (!hasPickedDate) setHasPickedDate(true);
  };

  const handleSelectReminder = (minutes: number) => {
    if (reminders.includes(minutes)) {
      setReminders(reminders.filter(r => r !== minutes));
    } else if (reminders.length < 2) {
      setReminders([...reminders, minutes].sort((a, b) => a - b));
    }
    setShowReminderModal(false);
  };

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setIsSaving(true);
    try {
      await api.mutations.studySessions.create(
        {
          topic: topic.trim(),
          notes: description.trim(),
          session_date: sessionDate
            ? sessionDate.toISOString()
            : new Date().toISOString(),
          has_spaced_repetition: hasSpacedRepetition,
          reminders,
          recurring_reminder: recurringReminder,
          recurring_reminder_end_date: recurringEndDate?.toISOString() ?? null,
        },
        isOnline,
        deviceId || '',
      );
      const { invalidateTaskQueries } =
        await import('@/utils/queryInvalidation');
      await invalidateTaskQueries(queryClient, 'study_session');
      onSave();
    } catch (error) {
      console.error('Failed to create study session:', error);
      Alert.alert(getErrorTitle(error), mapErrorCodeToMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Topic */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Topic</Text>
          <Text style={styles.charCount}>{topic.length}/35</Text>
        </View>
        <Input
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g., Chapter 5 Review"
          maxLength={35}
        />
      </View>

      {/* Session Date & Time */}
      <View style={styles.field}>
        <CardBasedDateTimePicker
          date={sessionDate || new Date()}
          time={sessionDate}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          label="Session Date & Time"
        />
      </View>

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Add notes, key points, or details..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          maxLength={500}
        />
      </View>

      {/* Spaced Repetition */}
      <View
        style={[styles.field, recurringReminder ? { opacity: 0.4 } : null]}
        pointerEvents={recurringReminder ? 'none' : 'auto'}>
        <TemplateCard
          title="Spaced Repetition"
          description="Get reminders to review at optimal intervals"
          value={hasSpacedRepetition}
          onValueChange={value => {
            setHasSpacedRepetition(value);
            if (value) {
              setRecurringReminder(null);
              setRecurringEndDate(null);
              setHasPickedEndDate(false);
            }
          }}
          icon="repeat-outline"
          iconColor={COLORS.primary}
          iconBgColor="#E5E7EB"
        />
      </View>

      {/* Recurring Reminder */}
      <View
        style={[styles.field, hasSpacedRepetition ? { opacity: 0.4 } : null]}
        pointerEvents={hasSpacedRepetition ? 'none' : 'auto'}>
        <Text style={styles.label}>Recurring Reminder</Text>
        <View style={styles.recurringPillsRow}>
          {RECURRING_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.recurringPill,
                recurringReminder === opt.value && styles.recurringPillSelected,
              ]}
              onPress={() => {
                if (recurringReminder === opt.value) {
                  setRecurringReminder(null);
                  setRecurringEndDate(null);
                  setHasPickedEndDate(false);
                } else {
                  setRecurringReminder(opt.value);
                }
              }}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.recurringPillText,
                  recurringReminder === opt.value &&
                    styles.recurringPillTextSelected,
                ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {recurringReminder && (
          <TouchableOpacity
            style={styles.endDateButton}
            onPress={() => setShowEndDatePicker(true)}
            activeOpacity={0.7}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.endDateButtonText}>
              {hasPickedEndDate && recurringEndDate
                ? `Ends ${format(recurringEndDate, 'MMM dd, yyyy')}`
                : 'Set end date'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showEndDatePicker && (
        <DateTimePicker
          value={recurringEndDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            if (Platform.OS === 'android') setShowEndDatePicker(false);
            if (event.type === 'set' && date) {
              setRecurringEndDate(date);
              setHasPickedEndDate(true);
              if (Platform.OS === 'ios') setShowEndDatePicker(false);
            } else if (event.type === 'dismissed') {
              setShowEndDatePicker(false);
            }
          }}
        />
      )}

      {/* Reminders */}
      <ReminderSection
        reminders={reminders}
        onRemove={m => setReminders(reminders.filter(r => r !== m))}
        onAdd={() => setShowReminderModal(true)}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!isFormValid || isSaving}
        activeOpacity={0.8}>
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Session</Text>
        )}
      </TouchableOpacity>

      <ReminderPickerModal
        visible={showReminderModal}
        reminders={reminders}
        onSelect={handleSelectReminder}
        onClose={() => setShowReminderModal(false)}
      />
    </>
  );
};

// ─── Shared sub-components ────────────────────────────────────────────────────

const ReminderSection: React.FC<{
  reminders: number[];
  onRemove: (m: number) => void;
  onAdd: () => void;
}> = ({ reminders, onRemove, onAdd }) => (
  <View style={styles.field}>
    <View style={styles.reminderHeader}>
      <Text style={styles.label}>Reminders</Text>
      <Text style={styles.maxLabel}>Max 2</Text>
    </View>
    {reminders.length > 0 && (
      <View style={styles.remindersList}>
        {reminders.map(m => (
          <ReminderChip
            key={m}
            label={formatReminderLabel(m)}
            onRemove={() => onRemove(m)}
          />
        ))}
      </View>
    )}
    <TouchableOpacity
      style={[
        styles.addReminderButton,
        reminders.length >= 2 && { opacity: 0.5 },
      ]}
      onPress={onAdd}
      disabled={reminders.length >= 2}>
      <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
      <Text style={styles.addReminderText}>Add Reminder</Text>
    </TouchableOpacity>
  </View>
);

const ReminderPickerModal: React.FC<{
  visible: boolean;
  reminders: number[];
  onSelect: (m: number) => void;
  onClose: () => void;
}> = ({ visible, reminders, onSelect, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}>
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Select Reminder</Text>
        <Text style={styles.modalSubtitle}>Choose up to 2 reminders</Text>
        <ScrollView style={{ maxHeight: 300 }}>
          {REMINDER_OPTIONS.map(option => {
            const isSelected = reminders.includes(option.value);
            const isDisabled = !isSelected && reminders.length >= 2;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reminderOption,
                  isSelected && { backgroundColor: COLORS.primary + '1A' },
                  isDisabled && { opacity: 0.5 },
                ]}
                onPress={() => onSelect(option.value)}
                disabled={isDisabled}>
                <Text
                  style={[
                    styles.reminderOptionText,
                    { color: isSelected ? COLORS.primary : '#111418' },
                  ]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Task type options config — add new types here to extend ─────────────────

const TASK_TYPE_CONFIG: Array<{
  type: TaskType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}> = [
  {
    type: 'assignment',
    label: 'Assignment',
    icon: 'document-text-outline',
    color: '#E05252',
  },
  {
    type: 'study_session',
    label: 'Study Session',
    icon: 'book-outline',
    color: '#3DBF7A',
  },
];

// ─── Main Sheet ───────────────────────────────────────────────────────────────

type SheetMode =
  | { kind: 'picker' }
  | { kind: 'form'; taskType: TaskType; customTypeDef?: TaskTypeDefinition }
  | { kind: 'createType' }
  | { kind: 'editType'; typeDef: TaskTypeDefinition };

export const AddTaskSheet: React.FC<AddTaskSheetProps> = ({
  isVisible,
  onClose,
  onSave,
}) => {
  const deviceId = useDeviceId();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<SheetMode>({ kind: 'picker' });
  const [customTypes, setCustomTypes] = useState<TaskTypeDefinition[]>([]);

  // Load custom types whenever the sheet opens
  useEffect(() => {
    if (isVisible) {
      api.taskTypes
        .getAll()
        .then(setCustomTypes)
        .catch(() => {});
    }
  }, [isVisible]);

  const handleClose = () => {
    setMode({ kind: 'picker' });
    onClose();
  };

  const handleSave = () => {
    setMode({ kind: 'picker' });
    onSave();
  };

  const currentMode = mode;
  const isBuiltIn =
    currentMode.kind === 'form' &&
    (currentMode.taskType === 'assignment' ||
      currentMode.taskType === 'study_session');
  const selectedConfig =
    currentMode.kind === 'form'
      ? TASK_TYPE_CONFIG.find(t => t.type === currentMode.taskType)
      : undefined;
  const selectedCustomDef =
    currentMode.kind === 'form' ? currentMode.customTypeDef : undefined;

  const headerTitle =
    currentMode.kind === 'createType'
      ? 'Create Task Type'
      : currentMode.kind === 'editType'
        ? 'Edit Task Type'
        : (selectedCustomDef?.name ?? selectedConfig?.label ?? 'New Task');

  const isEditingType = currentMode.kind === 'editType';

  return (
    <RNModal
      isVisible={isVisible}
      onBackdropPress={handleClose}
      onSwipeComplete={handleClose}
      swipeDirection="down"
      style={styles.modal}
      backdropOpacity={0.5}
      propagateSwipe>
      {currentMode.kind === 'picker' ? (
        // ── Step 1: compact type picker ───────────────────────────────────────
        <View style={styles.pickerSheet}>
          <View style={styles.dragHandle} />
          <Text style={styles.pickerTitle}>What are you working on?</Text>
          <ScrollView
            style={styles.typeList}
            contentContainerStyle={styles.typeListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {TASK_TYPE_CONFIG.map(({ type, label, icon, color }) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typePill,
                  { backgroundColor: color, borderColor: color },
                ]}
                onPress={() => setMode({ kind: 'form', taskType: type })}
                activeOpacity={0.7}>
                <Ionicons name={icon} size={22} color="#FFFFFF" />
                <Text style={[styles.typePillLabel, { color: '#FFFFFF' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom types */}
            {customTypes.map(ct => (
              <TouchableOpacity
                key={ct.id}
                style={[
                  styles.typePill,
                  { backgroundColor: ct.color, borderColor: ct.color },
                ]}
                onPress={() =>
                  setMode({
                    kind: 'form',
                    taskType: 'custom',
                    customTypeDef: ct,
                  })
                }
                activeOpacity={0.7}>
                <Ionicons
                  name={
                    (ct.icon as React.ComponentProps<
                      typeof Ionicons
                    >['name']) ?? 'ellipse-outline'
                  }
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[styles.typePillLabel, { color: '#FFFFFF' }]}>
                  {ct.name}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Create Type */}
            <TouchableOpacity
              style={[styles.typePill, styles.createTypePill]}
              onPress={() => setMode({ kind: 'createType' })}
              activeOpacity={0.7}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
              <Text style={styles.createTypePillLabel}>Create Type</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : (
        // ── Step 2: expanded form / create-type / edit-type ───────────────────
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.sheetHeader}>
            <TouchableOpacity
              onPress={() => setMode({ kind: 'picker' })}
              style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{headerTitle}</Text>
            <View style={styles.headerRight}>
              {/* Pencil — only for custom task forms (not built-in types) */}
              {currentMode.kind === 'form' &&
                selectedCustomDef &&
                !isEditingType && (
                  <TouchableOpacity
                    onPress={() =>
                      setMode({ kind: 'editType', typeDef: selectedCustomDef })
                    }
                    style={styles.headerIconButton}>
                    <Ionicons name="pencil-outline" size={20} color="#374151" />
                  </TouchableOpacity>
                )}
              <TouchableOpacity
                onPress={handleClose}
                style={styles.headerIconButton}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {currentMode.kind === 'form' &&
              currentMode.taskType === 'assignment' && (
                <AssignmentForm
                  key="assignment"
                  onSave={handleSave}
                  onClose={handleClose}
                />
              )}
            {currentMode.kind === 'form' &&
              currentMode.taskType === 'study_session' && (
                <StudySessionForm
                  key="study_session"
                  onSave={handleSave}
                  onClose={handleClose}
                />
              )}
            {currentMode.kind === 'form' &&
              currentMode.taskType === 'custom' &&
              currentMode.customTypeDef && (
                <CustomTaskForm
                  key={currentMode.customTypeDef.id}
                  taskType={currentMode.customTypeDef}
                  deviceId={deviceId ?? ''}
                  onSave={handleSave}
                  onClose={handleClose}
                />
              )}

            {(currentMode.kind === 'createType' ||
              currentMode.kind === 'editType') && (
              <CreateTypeSheet
                existingType={
                  currentMode.kind === 'editType'
                    ? currentMode.typeDef
                    : undefined
                }
                deviceId={deviceId ?? ''}
                onSave={savedType => {
                  api.taskTypes.getAll().then(types => {
                    setCustomTypes(types);
                    queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
                  });
                  // After creating, go straight to the form for that type
                  if (currentMode.kind === 'createType') {
                    setMode({
                      kind: 'form',
                      taskType: 'custom',
                      customTypeDef: savedType,
                    });
                  } else {
                    setMode({ kind: 'picker' });
                  }
                }}
                onCancel={() => setMode({ kind: 'picker' })}
                onDelete={() => {
                  api.taskTypes.getAll().then(types => {
                    setCustomTypes(types);
                    queryClient.invalidateQueries({ queryKey: ['taskTypes'] });
                    queryClient.invalidateQueries({
                      queryKey: ['deletedItems'],
                    });
                  });
                  setMode({ kind: 'picker' });
                }}
              />
            )}
          </ScrollView>
        </View>
      )}
    </RNModal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  // ── Compact type picker ───────────────────────────────────────────────────
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 36,
  },
  pickerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#111418',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  typeList: {
    maxHeight: 340,
  },
  typeListContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  typePillLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  // ── Expanded form ─────────────────────────────────────────────────────────
  sheet: {
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#111418',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  createTypePill: {
    backgroundColor: '#5B8DEF',
    borderColor: '#5B8DEF',
  },
  createTypePillLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: '#374151',
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: '#6B7280',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: '#111418',
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: '#FFFFFF',
  },
  methodRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  methodChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  methodChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  methodChipText: {
    fontSize: FONT_SIZES.sm,
    color: '#6B7280',
  },
  methodChipTextSelected: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  maxLabel: {
    fontSize: FONT_SIZES.xs,
    color: '#6B7280',
  },
  remindersList: {
    marginBottom: SPACING.sm,
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  addReminderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.primary,
  },
  saveButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: SPACING.lg,
    backgroundColor: '#FFFFFF',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#111418',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: '#6B7280',
    marginBottom: SPACING.md,
  },
  reminderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: SPACING.xs,
  },
  reminderOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  recurringPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  recurringPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  recurringPillSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  recurringPillText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: '#6B7280',
  },
  recurringPillTextSelected: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  endDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primary + '0D',
    alignSelf: 'flex-start',
  },
  endDateButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.primary,
  },
});
