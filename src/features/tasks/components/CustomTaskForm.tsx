import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import uuid from 'react-native-uuid';
import { useQueryClient } from '@tanstack/react-query';
import { FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { CardBasedDateTimePicker } from '@/shared/components';
import { TaskTypeDefinition, CustomField } from '@/types';
import { api } from '@/services/api';
import { invalidateTaskQueries } from '@/utils/queryInvalidation';

interface CustomTaskFormProps {
  taskType: TaskTypeDefinition;
  deviceId: string;
  onSave: () => void;
  onClose: () => void;
}

type FieldValues = Record<string, string | boolean | null>;

export const CustomTaskForm: React.FC<CustomTaskFormProps> = ({
  taskType,
  deviceId,
  onSave,
  onClose,
}) => {
  const queryClient = useQueryClient();

  // Default fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [hasPickedDate, setHasPickedDate] = useState(false);
  const [hasPickedTime, setHasPickedTime] = useState(false);

  // Extra field values keyed by field.id
  const [fieldValues, setFieldValues] = useState<FieldValues>(() => {
    const init: FieldValues = {};
    for (const f of taskType.fields) {
      init[f.id] = f.fieldType === 'checkbox' ? false : '';
    }
    return init;
  });

  const [isSaving, setIsSaving] = useState(false);

  const isFormValid = title.trim().length > 0 && hasPickedDate && hasPickedTime;

  const handleDateChange = (date: Date) => {
    const next = new Date(date);
    next.setHours(dueDate.getHours());
    next.setMinutes(dueDate.getMinutes());
    setDueDate(next);
    setHasPickedDate(true);
  };

  const handleTimeChange = (time: Date) => {
    const next = new Date(dueDate);
    next.setHours(time.getHours());
    next.setMinutes(time.getMinutes());
    setDueDate(next);
    setHasPickedTime(true);
    if (!hasPickedDate) setHasPickedDate(true);
  };

  const setField = (fieldId: string, value: string | boolean) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setIsSaving(true);
    try {
      await api.mutations.customTasks.create({
        id: uuid.v4() as string,
        user_id: deviceId,
        task_type_id: taskType.id,
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate.toISOString(),
        metadata: fieldValues,
      });
      await invalidateTaskQueries(queryClient, 'custom');
      onSave();
    } catch (error) {
      Alert.alert('Error', 'Failed to save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Title */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Title</Text>
          <Text style={styles.charCount}>{title.length}/35</Text>
        </View>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder={`${taskType.name} title`}
          placeholderTextColor="#9CA3AF"
          maxLength={35}
        />
      </View>

      {/* Date & Time */}
      <View style={styles.field}>
        <CardBasedDateTimePicker
          date={dueDate}
          time={dueDate}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
          label="Date & Time"
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

      {/* Extra fields */}
      {taskType.fields.map(field => (
        <ExtraFieldInput
          key={field.id}
          field={field}
          value={
            fieldValues[field.id] ??
            (field.fieldType === 'checkbox' ? false : '')
          }
          onChange={value => setField(field.id, value)}
          accentColor={taskType.color}
        />
      ))}

      {/* Save button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: isFormValid ? taskType.color : '#D1D5DB' },
        ]}
        onPress={handleSave}
        disabled={!isFormValid || isSaving}
        activeOpacity={0.8}>
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save {taskType.name}</Text>
        )}
      </TouchableOpacity>
    </>
  );
};

// ─── Extra field renderer ─────────────────────────────────────────────────────

const ExtraFieldInput: React.FC<{
  field: CustomField;
  value: string | boolean | null;
  onChange: (value: string | boolean) => void;
  accentColor: string;
}> = ({ field, value, onChange, accentColor }) => {
  const [extraDate, setExtraDate] = useState<Date>(new Date());

  switch (field.fieldType) {
    case 'datetime':
      return (
        <View style={styles.field}>
          <CardBasedDateTimePicker
            date={extraDate}
            time={extraDate}
            onDateChange={d => {
              const next = new Date(d);
              next.setHours(extraDate.getHours());
              next.setMinutes(extraDate.getMinutes());
              setExtraDate(next);
              onChange(next.toISOString());
            }}
            onTimeChange={t => {
              const next = new Date(extraDate);
              next.setHours(t.getHours());
              next.setMinutes(t.getMinutes());
              setExtraDate(next);
              onChange(next.toISOString());
            }}
            label={field.label}
          />
        </View>
      );

    case 'checkbox':
      return (
        <View style={styles.field}>
          <View style={styles.checkboxRow}>
            <Text style={styles.label}>{field.label}</Text>
            <Switch
              value={!!value}
              onValueChange={onChange}
              trackColor={{ false: '#E5E7EB', true: accentColor + '80' }}
              thumbColor={value ? accentColor : '#9CA3AF'}
            />
          </View>
        </View>
      );

    case 'location':
      return (
        <View style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.iconInput}>
            <Ionicons name="location-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.iconInputText}
              value={typeof value === 'string' ? value : ''}
              onChangeText={onChange as (v: string) => void}
              placeholder="Enter location"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      );

    case 'url':
      return (
        <View style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.iconInput}>
            <Ionicons name="link-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.iconInputText}
              value={typeof value === 'string' ? value : ''}
              onChangeText={onChange as (v: string) => void}
              placeholder="https://"
              placeholderTextColor="#9CA3AF"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </View>
      );

    default:
      return null;
  }
};

const styles = StyleSheet.create({
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
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: '#111418',
    backgroundColor: '#FFFFFF',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: '#FFFFFF',
  },
  iconInputText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: '#111418',
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: '#FFFFFF',
  },
});
