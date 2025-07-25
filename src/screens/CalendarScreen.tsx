import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { WeekStrip } from '../components/calendar/WeekStrip';
import { AuthPromptModal } from '../components/AuthPromptModal';
import { SaveConfirmationModal } from '../components/SaveConfirmationModal';

type EventType = 'Assignment' | 'Test' | 'Event';

function getWeekDates(date: Date): Date[] {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - startOfWeek.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

const CalendarScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [isAuthModalVisible, setAuthModalVisible] = useState(false);
  const [isSaveConfirmVisible, setSaveConfirmVisible] = useState(false);
  
  // State for the form inside the modal
  const [selectedType, setSelectedType] = useState<EventType>('Assignment');
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSave = () => {
    setModalVisible(false);
    if (user) {
      console.log("User is authenticated. Saving data...");
      console.log({ type: selectedType, title, about, date: selectedDate });
      setSaveConfirmVisible(true);
    } else {
      console.log("User is not authenticated. Showing auth prompt.");
      setAuthModalVisible(true);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAbout('');
    setSelectedType('Assignment');
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const renderTypeSelection = () => {
    const types: EventType[] = ['Assignment', 'Test', 'Event'];
    return (
      <View style={styles.typeContainer}>
        {types.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              { backgroundColor: theme.card },
              selectedType === type && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text style={[styles.typeButtonText, { color: theme.text }, selectedType === type && { color: 'white' }]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderModalContent = () => (
    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
      <Text style={[styles.modalTitle, { color: theme.text }]}>Add to Calendar</Text>
      {renderTypeSelection()}
      <TextInput
        style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.card }]}
        placeholder="Title"
        placeholderTextColor={theme.textSecondary}
        value={title}
        onChangeText={setTitle}
      />
      {selectedType === 'Assignment' && (
        <TextInput
          style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.card }]}
          placeholder="About this assignment..."
          placeholderTextColor={theme.textSecondary}
          multiline
          value={about}
          onChangeText={setAbout}
        />
      )}
      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Calendar</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity><Ionicons name="search" size={24} color={theme.text} style={styles.icon} /></TouchableOpacity>
          <TouchableOpacity><Ionicons name="notifications-outline" size={24} color={theme.text} style={styles.icon} /></TouchableOpacity>
        </View>
      </View>
      <WeekStrip
        weekDates={getWeekDates(selectedDate)}
        selectedDate={selectedDate}
        onDatePress={handleDateSelect}
        scheduleData={[]}
        viewMode="daily"
      />
      <ScrollView style={styles.scrollView}>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 20 }}>
          Content for {selectedDate.toDateString()}
        </Text>
      </ScrollView>
      <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={openAddModal}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>{renderModalContent()}</View>
      </Modal>
      <AuthPromptModal
        visible={isAuthModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSignIn={() => { setAuthModalVisible(false); navigation.navigate('SignIn'); }}
        onSignUp={() => { setAuthModalVisible(false); navigation.navigate('SignUp'); }}
        title="Save Your Progress"
        message="Create an account or sign in to ensure your tasks and events are saved."
      />
      <SaveConfirmationModal
        visible={isSaveConfirmVisible}
        onClose={() => setSaveConfirmVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  icon: { marginLeft: 16 },
  scrollView: { flex: 1 },
  addButton: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', padding: 20, borderRadius: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  typeButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  typeButtonText: { fontWeight: 'bold' },
  input: { width: '100%', height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
  textArea: { height: 100, paddingTop: 15, textAlignVertical: 'top' },
  saveButton: { marginTop: 10, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, width: '100%' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});

export default CalendarScreen;

