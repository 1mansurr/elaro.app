import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BaseModal from './BaseModal';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';
import { DateTimePicker } from '../DateTimePicker';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../AuthModal';

const STUDY_COLORS = {
  green: '#4CAF50',
  blue: '#2196F3',
  purple: '#9C27B0',
  gold: '#FF9800',
  pink: '#E91E63',
};

const REMINDER_OPTIONS = [
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hr', label: '1 hour before' },
  { value: '24hr', label: '24 hours before' },
];

const SR_SCHEDULE_ORIGIN = [0, 1, 3, 7];
const SR_SCHEDULE_ODDITY = [0, 1, 3, 7, 14, 30, 60, 120, 180];

interface AddStudySessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isOddity?: boolean; // Pass user plan
}

const AddStudySessionModal: React.FC<AddStudySessionModalProps> = ({ visible, onClose, onSubmit, isOddity }) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [course, setCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState('green');
  const [useRepetition, setUseRepetition] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);
  const [customReminders, setCustomReminders] = useState<{ value: string; unit: string }[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ course?: string; topic?: string; date?: string; time?: string }>({});
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState('minutes');

  const validate = () => {
    const e: typeof errors = {};
    if (!course.trim()) e.course = 'Course is required';
    if (!topic.trim()) e.topic = 'Topic is required';
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
    // Compose datetime
    const sessionDate = new Date(date);
    sessionDate.setHours(time.getHours());
    sessionDate.setMinutes(time.getMinutes());
    sessionDate.setSeconds(0);
    // Compose reminders
    const allReminders = [
      ...reminders,
      ...customReminders.map(r => `${r.value} ${r.unit}`),
    ];
    // Compose SR schedule
    let srSchedule: number[] = [];
    if (useRepetition) {
      srSchedule = isOddity ? SR_SCHEDULE_ODDITY : SR_SCHEDULE_ORIGIN;
    }
    onSubmit({
      course,
      topic,
      date: sessionDate,
      color: selectedColor,
      spacedRepetition: useRepetition,
      reminders: allReminders,
      srSchedule,
    });
    setShowConfirm(true);
  };

  const handleDismiss = () => {
    setShowConfirm(false);
    onClose();
    setCourse('');
    setTopic('');
    setDate(new Date());
    setTime(new Date());
    setSelectedColor('green');
    setUseRepetition(false);
    setReminders([]);
    setCustomReminders([]);
    setErrors({});
    setCustomValue('');
    setCustomUnit('minutes');
  };

  const handleAddCustomReminder = () => {
    if (!customValue.trim() || isNaN(Number(customValue))) return;
    setCustomReminders([...customReminders, { value: customValue, unit: customUnit }]);
    setCustomValue('');
    setCustomUnit('minutes');
  };

  return (
    <>
      <BaseModal visible={visible} title="Add Study Session" onClose={onClose} wide>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Course</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Biology"
            value={course}
            onChangeText={setCourse}
            placeholderTextColor={COLORS.textSecondary}
          />
          {errors.course && <Text style={styles.error}>{errors.course}</Text>}

          <Text style={styles.label}>Topic</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Nervous System"
            value={topic}
            onChangeText={setTopic}
            placeholderTextColor={COLORS.textSecondary}
          />
          {errors.topic && <Text style={styles.error}>{errors.topic}</Text>}

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
            {Object.entries(STUDY_COLORS).map(([key, color]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedColor(key)}
                style={[styles.colorDot, { backgroundColor: color }, selectedColor === key && styles.activeDot]}
              >
                {selectedColor === key && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Spaced Repetition?</Text>
            <Switch
              value={useRepetition}
              onValueChange={setUseRepetition}
              trackColor={{ false: COLORS.gray100, true: COLORS.primary + '40' }}
              thumbColor={useRepetition ? COLORS.primary : COLORS.gray}
            />
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
          {/* Custom Reminders */}
          {customReminders.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {customReminders.map((r, i) => (
                <Text key={i} style={styles.customReminderText}>
                  Remind me {r.value} {r.unit} before
                </Text>
              ))}
            </View>
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
      {/* Confirmation Modal */}
      <BaseModal visible={showConfirm} title="Great! We’ll remind you at just the right times." onClose={handleDismiss} wide>
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, color: COLORS.text, marginBottom: 16 }}>Your study session was added successfully.</Text>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  reminderRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  reminderBtn: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, marginBottom: 8, backgroundColor: COLORS.card },
  reminderBtnActive: { backgroundColor: COLORS.primary },
  reminderText: { color: COLORS.text, fontSize: 15 },
  reminderTextActive: { color: '#fff', fontWeight: '700' },
  customReminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  customReminderText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 2 },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 18 },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: COLORS.error, fontSize: 13, marginTop: 2 },
  dismissBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  dismissText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default AddStudySessionModal; 