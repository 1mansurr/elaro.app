import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { SPACING, FONT_SIZES, BORDER_RADIUS, FONT_WEIGHTS } from '../constants/theme';
import { Button, Input } from '../components';
import { useTheme } from '../contexts/ThemeContext';

const SPACED_REPETITION_SCHEDULE = {
  free: [0, 1, 3, 7],
  oddity: [0, 1, 3, 7, 14, 30, 60, 120, 180],
};

const AnimatedTouchable = ({ children, onPress, style, disabled = false }: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => !disabled && Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
        onPressOut={() => !disabled && Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        style={style}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function AddStudyScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  const [course, setCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('green');
  const [useRepetition, setUseRepetition] = useState(false);
  const [reminders, setReminders] = useState<{
    thirtyMin: boolean;
    twentyFourHr: boolean;
    oneWeek: boolean;
  }>({
    thirtyMin: false,
    twentyFourHr: false,
    oneWeek: false,
  });
  const [errors, setErrors] = useState<{ course?: string; topic?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOddityUser = true; // Replace with context state later

  const STUDY_COLORS = {
    green: theme.green,
    blue: theme.blue,
    purple: theme.purple,
    gold: theme.orange,
    pink: theme.pink,
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: useRepetition ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    // No setTimeout/setInterval in this effect, nothing to clean up here.
  }, [useRepetition]);

  // TODO: If you add any setTimeout or setInterval in the future, clean them up here.

  const validate = () => {
    const e: { course?: string; topic?: string } = {};
    if (!course.trim()) e.course = 'Course is required';
    if (!topic.trim()) e.topic = 'Topic is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    // Clean up: If this component unmounts before the promise resolves, avoid setting state
    let isMounted = true;
    await new Promise(res => setTimeout(res, 800));
    if (!isMounted) return;

    const session = {
      course: course.trim(),
      topic: topic.trim(),
      date,
      color: selectedColor,
      useRepetition,
      reminders,
      spacedRepetitionSchedule: useRepetition ? SPACED_REPETITION_SCHEDULE[isOddityUser ? 'oddity' : 'free'] : null,
    };

    console.log('Saved session:', session);
    setIsSubmitting(false);
    Alert.alert('Success', '✅ Study session created', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
    return () => { isMounted = false; };
  };

  const toggleReminder = (key: keyof typeof reminders) => setReminders(p => ({ ...p, [key]: !p[key] }));
  const reminderCount = Object.values(reminders).filter(Boolean).length;

  const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray100,
      backgroundColor: theme.card,
    },
    title: { 
      fontSize: FONT_SIZES.lg, 
      fontWeight: FONT_WEIGHTS.semibold as any, 
      // color: COLORS.text,
    },
    saveBtn: {
      // color: COLORS.primary,
      backgroundColor: theme.primary,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
    },
    saveText: { 
      // color: COLORS.primary,
      color: theme.white,
      fontWeight: FONT_WEIGHTS.semibold as any,
      fontSize: FONT_SIZES.md,
    },
    scroll: { 
      padding: SPACING.lg, 
      gap: SPACING.md,
    },
    colorRow: { 
      flexDirection: 'row', 
      gap: SPACING.sm, 
      marginBottom: SPACING.lg,
    },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeDot: { 
      borderColor: theme.text,
    },
    section: { 
      marginTop: SPACING.lg,
    },
    sectionTitle: { 
      fontSize: FONT_SIZES.md, 
      fontWeight: FONT_WEIGHTS.semibold as any, 
      color: theme.text,
      marginBottom: SPACING.sm,
    },
    label: { 
      fontSize: FONT_SIZES.md, 
      fontWeight: FONT_WEIGHTS.medium as any, 
      color: theme.text,
    },
    caption: { 
      fontSize: FONT_SIZES.sm, 
      color: theme.textSecondary,
      marginTop: SPACING.xs,
    },
    fade: { 
      marginTop: SPACING.sm,
    },
    rowBetween: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between',
    },
    reminderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    reminderText: { 
      fontSize: FONT_SIZES.md, 
      color: theme.text,
    },
    activeReminder: { 
      backgroundColor: theme.primary + '10',
      borderRadius: BORDER_RADIUS.sm, 
      paddingHorizontal: SPACING.sm,
    },
    activeText: { 
      fontWeight: FONT_WEIGHTS.semibold as any, 
      color: theme.primary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>New Study</Text>
        <AnimatedTouchable onPress={handleSave} disabled={isSubmitting} style={styles.saveBtn}>
          <Text style={[styles.saveText, { color: theme.primary }]}>{isSubmitting ? 'Saving...' : 'Save'}</Text>
        </AnimatedTouchable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Input
          label="Course"
          leftIcon="school"
          value={course}
          onChangeText={setCourse}
          placeholder="e.g. Biology"
          error={errors.course}
          required
        />

        <Input
          label="Topic"
          leftIcon="document-text"
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. Nervous System"
          error={errors.topic}
          required
        />

        <Input
          label="Date & Time"
          leftIcon="calendar"
          value={`${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          onFocus={() => setShowPicker(true)}
          editable={false}
          required
          rightIcon="chevron-forward"
        />

        <View style={styles.colorRow}>
          {Object.entries(STUDY_COLORS).map(([key, color]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedColor(key)}
              style={[styles.colorDot, { backgroundColor: color }, selectedColor === key && styles.activeDot]}
            >
              {selectedColor === key && <Ionicons name="checkmark" size={14} color={theme.white} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spaced Repetition</Text>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Enable Repetition</Text>
              <Text style={styles.caption}>Boost retention with smart intervals</Text>
            </View>
            <Switch
              value={useRepetition}
              onValueChange={setUseRepetition}
              trackColor={{ false: theme.gray100, true: theme.primary + '40' }}
              thumbColor={useRepetition ? theme.primary : theme.gray}
            />
          </View>

          {useRepetition && (
            <Animated.View style={[styles.fade, { opacity: fadeAnim }]}>
              <Text style={styles.caption}>
                {SPACED_REPETITION_SCHEDULE[isOddityUser ? 'oddity' : 'free']
                  .map(day => (day === 0 ? 'Today' : `Day ${day}`))
                  .join(', ')}
              </Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders ({reminderCount})</Text>
          {([
            ['thirtyMin', '30 min before'] as const,
            ['twentyFourHr', '24 hrs before'] as const,
            ['oneWeek', '1 week before'] as const,
          ]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.reminderItem, reminders[key] && styles.activeReminder]}
              onPress={() => toggleReminder(key)}
            >
              <Ionicons
                name={reminders[key] ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={reminders[key] ? theme.primary : theme.gray}
              />
              <Text style={[styles.reminderText, reminders[key] && styles.activeText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(_, d) => {
            setShowPicker(false);
            if (d) setDate(d);
          }}
        />
      )}
    </SafeAreaView>
  );
} 