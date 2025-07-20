import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BaseModal from './BaseModal';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { DateTimePicker } from '../DateTimePicker';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../AuthModal';

const TASK_TYPES = [
  { value: 'assignment', label: 'Assignment', color: 'yellow' },
  { value: 'exam', label: 'Exam', color: 'red' },
  { value: 'lecture', label: 'Lecture', color: 'purple' },
  { value: 'program', label: 'Program', color: 'blue' },
];

const TASK_COLORS: { [key: string]: string } = {
  yellow: '#FFD600',
  red: '#F44336',
  purple: '#9C27B0',
  blue: '#2196F3',
  green: '#4CAF50',
};

const REMINDER_OPTIONS = [
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hr', label: '1 hour before' },
  { value: '24hr', label: '24 hours before' },
];

const REPEAT_PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'custom', label: 'Custom Days' },
];

const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isOddity?: boolean; // Pass user plan
  weeklyCount?: number; // For Origin plan
  activeCount?: number; // For Oddity plan
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ visible, onClose, onSubmit, isOddity, weeklyCount = 0, activeCount = 0 }) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [type, setType] = useState('assignment');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [reminders, setReminders] = useState<string[]>([]);
  const [repeatPattern, setRepeatPattern] = useState('none');
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; date?: string; time?: string } >({});
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);
  const [limitModal, setLimitModal] = useState(false);

  // Plan enforcement
  const ORIGIN_LIMIT = 14;
  const ODDITY_LIMIT = 35;

  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!date) e.date = 'Date is required';
    if (!time) e.time = 'Time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDone = () => {
    if (!validate()) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Plan enforcement
    if (!isOddity && weeklyCount >= ORIGIN_LIMIT) {
      setLimitModal(true);
      return;
    }
    if (isOddity && activeCount >= ODDITY_LIMIT) {
      setLimitModal(true);
      return;
    }
    // Compose datetime
    const taskDate = new Date(date);
    taskDate.setHours(time.getHours());
    taskDate.setMinutes(time.getMinutes());
    taskDate.setSeconds(0);
    // Compose reminders
    const allReminders = [
      ...reminders,
    ];
    // Compose repeat
    let repeat: any = null;
    if (type === 'lecture' && repeatPattern !== 'none') {
      repeat = {
        pattern: repeatPattern,
        days: repeatPattern === 'custom' ? customDays : undefined,
        endDate: repeatEndDate,
      };
    }
    onSubmit({
      type,
      title,
      date: taskDate,
      color: selectedColor,
      reminders: allReminders,
      repeat,
    });
    setShowConfirm(true);
  };

  const handleDismiss = () => {
    setShowConfirm(false);
    onClose();
    setType('assignment');
    setTitle('');
    setDate(new Date());
    setTime(new Date());
    setSelectedColor('yellow');
    setReminders([]);
    setRepeatPattern('none');
    setCustomDays([]);
    setRepeatEndDate(null);
    setErrors({});
    setShowTypeDropdown(false);
    setShowRepeatDropdown(false);
    setLimitModal(false);
  };

  const getTypeColor = (typeValue: string) => {
    const found = TASK_TYPES.find(t => t.value === typeValue);
    return found ? TASK_COLORS[found.color] : TASK_COLORS['green'];
  };

  return (
    <>
      <BaseModal visible={visible} title="Add Task or Event" onClose={onClose} wide>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Type</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
            <Text style={styles.selectorText}>{TASK_TYPES.find(t => t.value === type)?.label}</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showTypeDropdown && (
            <View style={styles.dropdown}>
              {TASK_TYPES.map(t => (
                <TouchableOpacity key={t.value} style={styles.dropdownItem} onPress={() => { setType(t.value); setSelectedColor(t.color); setShowTypeDropdown(false); }}>
                  <Text style={styles.dropdownText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Submit research draft"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={COLORS.textSecondary}
          />
          {errors.title && <Text style={styles.error}>{errors.title}</Text>}

          {/* Apple-style Date & Time Picker */}
          <DateTimePicker
            value={new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes())}
            onChange={(newDateTime) => {
              setDate(new Date(newDateTime.getFullYear(), newDateTime.getMonth(), newDateTime.getDate()));
              setTime(new Date(newDateTime.getFullYear(), newDateTime.getMonth(), newDateTime.getDate(), newDateTime.getHours(), newDateTime.getMinutes()));
            }}
            label="Date & Time"
          />

          <Text style={styles.label}>Color Label</Text>
          <View style={styles.colorRow}>
            {Object.entries(TASK_COLORS).map(([key, color]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedColor(key)}
                style={[styles.colorDot, { backgroundColor: color }, selectedColor === key && styles.activeDot]}
              >
                {selectedColor === key && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Reminder Timing</Text>
          <View style={styles.reminderRow}>
            {REMINDER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.reminderBtn, reminders.includes(opt.value) && styles.reminderBtnActive]}
                onPress={() =>
                  setReminders(reminders.includes(opt.value)
                    ? reminders.filter(r => r !== opt.value)
                    : [...reminders, opt.value])
                }
              >
                <Text style={[styles.reminderText, reminders.includes(opt.value) && styles.reminderTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Repeat Pattern for Lectures */}
          {type === 'lecture' && (
            <>
              <Text style={styles.label}>Repeat Pattern</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowRepeatDropdown(!showRepeatDropdown)}>
                <Text style={styles.selectorText}>{REPEAT_PATTERNS.find(r => r.value === repeatPattern)?.label}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {showRepeatDropdown && (
                <View style={styles.dropdown}>
                  {REPEAT_PATTERNS.filter(r => r.value !== 'none').map(r => (
                    <TouchableOpacity key={r.value} style={styles.dropdownItem} onPress={() => { setRepeatPattern(r.value); setShowRepeatDropdown(false); }}>
                      <Text style={styles.dropdownText}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {repeatPattern === 'custom' && (
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map(day => (
                    <TouchableOpacity
                      key={day.value}
                      style={[styles.weekdayBtn, customDays.includes(day.value) && styles.weekdayBtnActive]}
                      onPress={() =>
                        setCustomDays(customDays.includes(day.value)
                          ? customDays.filter(d => d !== day.value)
                          : [...customDays, day.value])
                      }
                    >
                      <Text style={[styles.weekdayText, customDays.includes(day.value) && styles.weekdayTextActive]}>{day.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.label}>Repeat End Date (Optional)</Text>
              <TouchableOpacity style={styles.selector} onPress={() => {
                // For now, just set a default end date 30 days from now
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 30);
                setRepeatEndDate(endDate);
              }}>
                <Text style={styles.selectorText}>{repeatEndDate ? repeatEndDate.toLocaleDateString() : 'Set End Date (30 days)'}</Text>
                <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </BaseModal>
      {/* Auth Modal for sign-in gating */}
      <AuthModal 
        visible={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onAuthSuccess={() => {
          setShowAuthModal(false);
          // Retry the submission after successful auth
          handleDone();
        }}
      />
      {/* Plan Limit Modal */}
      <BaseModal visible={limitModal} title={isOddity ? 'You’ve got 35 active items.' : 'You’ve planned 14 things this week!'} onClose={handleDismiss} wide>
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, color: COLORS.text, marginBottom: 16 }}>
            {isOddity
              ? 'You’ve hit the current limit for active items. Complete or remove some to continue.'
              : 'You’ve reached your free planning limit for this week. Unlock extended planning + the full AI guide for just GHS 5/month.'}
          </Text>
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </BaseModal>
      {/* Confirmation Modal */}
      <BaseModal visible={showConfirm} title="Task Added!" onClose={handleDismiss} wide>
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, color: COLORS.text, marginBottom: 16 }}>Your task was added successfully.</Text>
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  form: { gap: 12, paddingBottom: 32 },
  label: { fontSize: FONT_SIZES.sm, color: COLORS.text, fontWeight: '500', marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 8, padding: 10, fontSize: FONT_SIZES.md, color: COLORS.text, backgroundColor: COLORS.card },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: COLORS.card },
  selectorText: { fontSize: FONT_SIZES.md, color: COLORS.text },
  colorRow: { flexDirection: 'row', marginVertical: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  activeDot: { borderWidth: 2, borderColor: COLORS.primary },
  reminderRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  reminderBtn: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, marginBottom: 8, backgroundColor: COLORS.card },
  reminderBtnActive: { backgroundColor: COLORS.primary },
  reminderText: { color: COLORS.text, fontSize: 15 },
  reminderTextActive: { color: '#fff', fontWeight: '700' },
  customReminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  customReminderText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 2 },
  dropdown: { backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gray200, marginBottom: 8, marginTop: 2 },
  dropdownItem: { padding: 12 },
  dropdownText: { fontSize: 16, color: COLORS.text },
  weekdaysRow: { flexDirection: 'row', marginVertical: 8 },
  weekdayBtn: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginRight: 6, backgroundColor: COLORS.card },
  weekdayBtnActive: { backgroundColor: COLORS.primary },
  weekdayText: { color: COLORS.text, fontSize: 15 },
  weekdayTextActive: { color: '#fff', fontWeight: '700' },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 18 },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: COLORS.error, fontSize: 13, marginTop: 2 },
  dismissBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  dismissText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default AddTaskModal; 