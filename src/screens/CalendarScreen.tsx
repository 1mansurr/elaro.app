import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Dimensions, LayoutAnimation, UIManager, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useWeekDates } from '../hooks/useWeekDates';
import { useCelebrationAnimation } from '../hooks/useCelebrationAnimation';
import { AddOptionModal } from '../components/AddOptionModal';
import { FloatingAddButton } from '../components/FloatingAddButton';
import { CalendarItem } from '../constants/calendar';
import { styles } from '../styles/CalendarScreen.styles';
import { useTheme } from '../contexts/ThemeContext';
import { CalendarItemModal } from '../components/calendar/CalendarItemModal';
import { taskService } from '../services/supabase';
import { sessionService } from '../services/supabase'; // Added import for sessionService
import { shouldDecrementUsageOnDelete } from '../utils/dateUtils';
import { AuthModal } from '../components/AuthModal';

import AddStudySessionModal from '../components/modals/AddStudySessionModal';
import AddTaskModal from '../components/modals/AddTaskModal';

const EVENT_COLORS = (theme: any) => ({
  exam: theme.red400,
  program: theme.purple400,
  study: theme.blue400,
  assignment: theme.orange400,
  lecture: theme.green400,
  default: theme.gray400,
});

const { height } = Dimensions.get('window');

const VIEW_MODE_KEY = 'calendar_view_mode';

function getHourLabel(hour: number) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function getEventColor(type: string, theme: any) {
  return EVENT_COLORS(theme)[type as keyof ReturnType<typeof EVENT_COLORS>] || EVENT_COLORS(theme).default;
}

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { theme } = useTheme();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  // Remove weekly view logic
  // Remove viewMode state and setViewMode, always use daily view
  // Remove weekly toggle button and renderWeekView
  // Only render daily view and week strip
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Remove hardcoded scheduleData and use real data from Supabase
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  // Refactor: extract fetchCalendarData so it can be called on demand
  const fetchCalendarData = async () => {
    if (!user) return;
    try {
      // Fetch study sessions
      const sessions = await sessionService.getUserSessions(user.id);
      const sessionItems: CalendarItem[] = sessions.map(session => ({
        id: session.id,
        title: session.topic ? `${session.course}: ${session.topic}` : session.course,
        type: 'study',
        time: session.date_time ? new Date(session.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day',
        date: session.date_time ? new Date(session.date_time).toDateString() : new Date().toDateString(),
        completed: !!session.completed,
        hasSpacedRepetition: !!session.spaced_repetition_enabled,
      }));
      // Fetch tasks/events
      const tasks = await taskService.getUserTasks(user.id);
      const taskItems: CalendarItem[] = tasks.map(task => ({
        id: task.id,
        title: task.title,
        type: task.type as CalendarItem['type'],
        time: task.date_time ? new Date(task.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day',
        date: task.date_time ? new Date(task.date_time).toDateString() : new Date().toDateString(),
        completed: !!task.completed,
        hasSpacedRepetition: false,
      }));
      setItems([...sessionItems, ...taskItems]);
      const [weekly, active] = await Promise.all([
        taskService.getWeeklyTaskCount(user.id),
        taskService.getActiveTasks(user.id),
      ]);
      setWeeklyCount(weekly);
      setActiveCount(active);
    } catch (error) {
      // Optionally show error
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [user]);

  // Add completion toggle logic
  const handleToggleComplete = (item: CalendarItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
    setShowItemModal(false);
  };

  const handleDelete = async (item: CalendarItem) => {
    if (!user) return;
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
              // Delete based on item type
              if (item.type === 'study') {
                await sessionService.deleteSession(item.id);
              } else if (
                item.type === 'assignment' ||
                item.type === 'exam' ||
                item.type === 'lecture' ||
                item.type === 'program'
              ) {
                await taskService.deleteTask(item.id);
              }
              setItems(prev => prev.filter(i => i.id !== item.id));
              setShowItemModal(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task.');
            }
          },
        },
      ]
    );
  };

  // Week strip logic
  const weekDates = useWeekDates();
  const today = new Date();

  // Filter events for selected date
  const dayItems = useMemo(() =>
    items.filter(item => item.date === selectedDate.toDateString()),
    [items, selectedDate]
  );

  // Timeline hours (0–23)
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

  // Current time indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isToday = selectedDate.toDateString() === now.toDateString();
  const timelineHeight = 60 * hours.length; // 60px per hour
  const currentTimeY = isToday ? ((currentHour - 6) * 60 + (currentMinute)) : null;

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Remove any remaining references to setViewMode and handleSetViewMode

  // --- WEEK VIEW ---
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday as first day
  const weekDatesArr = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const renderWeekStrip = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
      {weekDates.map(date => {
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const isToday = date.toDateString() === today.toDateString();
        return (
          <TouchableOpacity
            key={date.toDateString()}
            onPress={() => setSelectedDate(date)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 16,
              backgroundColor: isSelected ? theme.primary : isToday ? theme.blue100 : 'transparent',
              marginRight: 8,
            }}
          >
            <Text style={{ color: isSelected ? theme.white : theme.primary, fontWeight: '700', fontSize: 16 }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
            <Text style={{ color: isSelected ? theme.white : theme.primary, fontWeight: '400', fontSize: 13 }}>{date.getDate()}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderWeekView = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
      {/* Time column */}
      <View style={{ width: 60, alignItems: 'flex-end', paddingRight: 8 }}>
        {hours.map(hour => (
          <View key={hour} style={{ height: 60, justifyContent: 'flex-start' }}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>{getHourLabel(hour)}</Text>
          </View>
        ))}
      </View>
      {/* Day columns */}
      {weekDatesArr.map((date, dayIdx) => {
        const dayEvents = items.filter(item => item.date === date.toDateString());
        return (
          <View key={date.toDateString()} style={{ width: 120, borderLeftWidth: 1, borderColor: '#eee', paddingHorizontal: 8 }}>
            {/* Render events for this day, positioned by time (to be implemented) */}
            {hours.map((hour, hourIdx) => (
              <View key={hourIdx} style={{ height: 60, justifyContent: 'flex-start' }}>
                {/* Placeholder for events in this hour */}
                {/* TODO: Position events as rounded rectangles */}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );

  // Timeline event blocks
  const renderTimeline = () => (
    <View style={{ flexDirection: 'row', minHeight: 60 * hours.length, position: 'relative' }}>
      {/* Hours column */}
      <View style={{ width: 60, alignItems: 'flex-end', paddingRight: 8 }}>
        {hours.map(hour => (
          <View key={hour} style={{ height: 60, justifyContent: 'flex-start' }}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>{getHourLabel(hour)}</Text>
          </View>
        ))}
      </View>
      {/* Events column */}
      <View style={{ flex: 1, position: 'relative', minHeight: 60 * hours.length }}>
        {/* Current time indicator */}
        {/* Removed the current time indicator for a cleaner layout */}
        {/* Event blocks */}
        {items.filter(e => e.time !== 'All Day' && e.date === selectedDate.toDateString()).map(event => {
          // Parse event start and end
          const [startHour, startMin] = event.time.match(/\d+/g) ? event.time.match(/\d+/g)!.map(Number) : [6, 0];
          const startIsPM = event.time.includes('PM') && startHour !== 12;
          const start24 = startIsPM ? startHour + 12 : startHour;
          const startMinutes = (start24 - 6) * 60 + (event.time.includes(':') ? startMin : 0);
          const end24 = event.endTime ? (event.endTime.includes('PM') && Number(event.endTime.split(':')[0]) !== 12 ? Number(event.endTime.split(':')[0]) + 12 : Number(event.endTime.split(':')[0])) : start24 + 1;
          const endMinutes = event.endTime ? ((end24 - 6) * 60 + (event.endTime.includes(':') ? Number(event.endTime.split(':')[1]) : 0)) : startMinutes + 60;
          const blockHeight = Math.max(40, endMinutes - startMinutes);
          return (
            <TouchableOpacity
              key={event.id}
              style={{
                position: 'absolute',
                top: startMinutes,
                left: 0,
                right: 0,
                height: blockHeight,
                backgroundColor: getEventColor(event.type, theme),
                borderRadius: 10,
                padding: 10,
                marginRight: 8,
                zIndex: 3,
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => { setSelectedItem(event); setShowItemModal(true); }}
              onLongPress={() => { setSelectedItem(event); setShowItemModal(true); }}
              activeOpacity={0.85}
            >
              <Text style={{ color: theme.white, fontWeight: '700', fontSize: 15 }}>{event.title}</Text>
              <Text style={{ color: theme.white, fontSize: 12, marginTop: 2 }}>{event.time} {event.endTime ? `- ${event.endTime}` : ''}</Text>
            </TouchableOpacity>
          );
        })}
        {/* All day events */}
        {items.filter(e => e.time === 'All Day' && e.date === selectedDate.toDateString()).map(event => (
          <TouchableOpacity
            key={event.id}
            style={{
              marginBottom: 8,
              backgroundColor: getEventColor(event.type, theme),
              borderRadius: 10,
              padding: 10,
              marginRight: 8,
              marginTop: 8,
            }}
            onPress={() => { setSelectedItem(event); setShowItemModal(true); }}
            onLongPress={() => { setSelectedItem(event); setShowItemModal(true); }}
            activeOpacity={0.85}
          >
            <Text style={{ color: theme.white, fontWeight: '700', fontSize: 15 }}>{event.title} (All Day)</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const [showAddStudySessionModal, setShowAddStudySessionModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Only show week strip, no toggle */}
        {renderWeekStrip()}
      </View>
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={true} contentContainerStyle={{ minHeight: 60 * hours.length }}>
        {/* The main calendar/timeline view */}
        {renderTimeline()}
      </ScrollView>
      <FloatingAddButton 
        onPress={() => {
          setShowAddModal(true);
          setShowAddTaskModal(false);
          setShowAddStudySessionModal(false);
        }}
        icon="plus"
        size="large"
        gradient={false}
        backgroundColor={theme.blue600}
        iconColor={theme.white}
      />
      {/* CalendarItemModal for event details and completion */}
      <CalendarItemModal
        visible={showItemModal}
        item={selectedItem}
        onClose={() => setShowItemModal(false)}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDelete}
      />
      <AddOptionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddSession={() => {
          // Before opening, set all modals to false to prevent stacking
          setShowAddModal(false);
          setShowAddTaskModal(false);
          setShowAddStudySessionModal(false);
          // Clean up: Track timeout to clear if component unmounts
          let sessionTimeout: NodeJS.Timeout | null = setTimeout(() => setShowAddStudySessionModal(true), 250);
          // Cleanup: clear timeout if component unmounts
          return () => { if (sessionTimeout) clearTimeout(sessionTimeout); };
        }}
        onAddEvent={() => {
          // Before opening, set all modals to false to prevent stacking
          setShowAddModal(false);
          setShowAddTaskModal(false);
          setShowAddStudySessionModal(false);
          // Clean up: Track timeout to clear if component unmounts
          let eventTimeout: NodeJS.Timeout | null = setTimeout(() => setShowAddTaskModal(true), 250);
          // Cleanup: clear timeout if component unmounts
          return () => { if (eventTimeout) clearTimeout(eventTimeout); };
        }}
      />
      {/* Study Session Input Modal (bottom sheet, wide) */}
      <AddStudySessionModal
        visible={showAddStudySessionModal}
        onClose={() => setShowAddStudySessionModal(false)}
        onSubmit={() => { setShowAddStudySessionModal(false); fetchCalendarData(); }}
        isOddity={isSubscribed}
      />
      {/* Task/Event Input Modal (bottom sheet, wide) */}
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSubmit={() => { setShowAddTaskModal(false); fetchCalendarData(); }}
        isOddity={isSubscribed}
        weeklyCount={weeklyCount}
        activeCount={activeCount}
      />
      {/* AuthModal for guest sign-in prompt */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign In Required"
        message="Please sign in to add study sessions or tasks."
      />
      {/* ... CalendarItemModal and CelebrationToast ... */}
      {/* TODO: If you add more modal logic or async operations, ensure proper cleanup and only one modal open at a time. */}
    </SafeAreaView>
  );
}

