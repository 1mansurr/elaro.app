import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, FONT_WEIGHTS, SHADOWS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../components';
import { useTheme } from '../contexts/ThemeContext';

const EVENT_TYPES = ['assignment', 'exam', 'meeting', 'deadline'] as const;

export default function AddEventScreen() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<typeof EVENT_TYPES[number]>('assignment');
  const [date, setDate] = useState(new Date());
  const [repeat, setRepeat] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title for your event.');
      return;
    }

    console.log('Saving event:', { title, type, date, repeat, reminder });
    navigation.goBack();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.gray100,
      backgroundColor: theme.card,
      ...SHADOWS.sm,
    },
    iconButton: {
      padding: SPACING.sm,
      minWidth: 50,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: FONT_WEIGHTS.semibold as any,
      // color: COLORS.text,
    },
    saveText: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.semibold as any,
      // color: COLORS.primary,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    label: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.medium as any,
      marginBottom: SPACING.sm,
      // color: COLORS.text,
      marginTop: SPACING.lg,
    },
    typeRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      flexWrap: 'wrap',
      marginBottom: SPACING.lg,
    },
    typeOption: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: theme.gray100,
      backgroundColor: theme.card,
      ...SHADOWS.xs,
    },
    typeSelected: {
      backgroundColor: COLORS.primary + '10',
      borderColor: COLORS.primary,
    },
    typeText: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.medium as any,
      // color: COLORS.text,
      textTransform: 'capitalize',
    },
    typeTextSelected: {
      fontWeight: FONT_WEIGHTS.semibold as any,
      color: COLORS.primary,
    },
    toggleGroup: {
      marginTop: SPACING.lg,
      backgroundColor: theme.card,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      ...SHADOWS.sm,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    toggleContent: {
      flex: 1,
      marginRight: SPACING.md,
    },
    toggleLabel: {
      fontSize: FONT_SIZES.md,
      fontWeight: FONT_WEIGHTS.medium as any,
      // color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    toggleCaption: {
      fontSize: FONT_SIZES.sm,
      // color: COLORS.textSecondary,
    },
    bottomSpacing: {
      height: SPACING.xl,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>New Task or Event</Text>
        <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
          <Text style={[styles.saveText, { color: theme.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Midterm Exam"
          required
        />

        {/* Type */}
        <Text style={[styles.label, { color: theme.text }]}>Type</Text>
        <View style={styles.typeRow}>
          {EVENT_TYPES.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.typeOption,
                type === option && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
              ]}
              onPress={() => setType(option)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${option} type`}
              accessibilityState={{ selected: type === option }}
            >
              <Text style={[
                styles.typeText,
                type === option && { color: theme.primary },
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date & Time */}
        <Input
          label="Date & Time"
          value={date.toLocaleString()}
          onFocus={() => setShowPicker(true)}
          editable={false}
          leftIcon="calendar"
          rightIcon="chevron-forward"
        />

        {/* Toggles */}
        <View style={styles.toggleGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Repeat</Text>
              <Text style={styles.toggleCaption}>Set up recurring event</Text>
            </View>
            <Switch
              value={repeat}
              onValueChange={setRepeat}
              trackColor={{ false: theme.gray100, true: theme.primary + '40' }}
              thumbColor={repeat ? theme.primary : theme.gray}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Reminder</Text>
              <Text style={styles.toggleCaption}>Get notified before event</Text>
            </View>
            <Switch
              value={reminder}
              onValueChange={setReminder}
              trackColor={{ false: theme.gray100, true: theme.primary + '40' }}
              thumbColor={reminder ? theme.primary : theme.gray}
            />
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(_, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}
    </SafeAreaView>
  );
} 