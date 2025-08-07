import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { AuthPromptModal } from '../components/AuthPromptModal';
import { SaveConfirmationModal } from '../components/SaveConfirmationModal';
import StreakCounter from '../components/Dashboard/StreakCounter';

type EventType = 'Assignment' | 'Test' | 'Event';

const HomeScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  // --- Start: Modal and Form State ---
  const [isModalVisible, setModalVisible] = useState(false);
  const [isAuthModalVisible, setAuthModalVisible] = useState(false);
  const [isSaveConfirmVisible, setSaveConfirmVisible] = useState(false);

  const [selectedType, setSelectedType] = useState<EventType>('Assignment');
  const [title, setTitle] = useState('');
  const [about, setAbout] = useState('');
  // We'll use today's date by default when saving from home screen
  const [selectedDate] = useState(new Date());
  // --- End: Modal and Form State ---

  // --- Start: Modal Logic ---
  const handleSave = () => {
    setModalVisible(false); // Close the main modal first

    if (user) {
      console.log('User is authenticated. Saving data from Home screen...');
      console.log({ type: selectedType, title, about, date: selectedDate });
      setSaveConfirmVisible(true); // Show confirmation modal
    } else {
      console.log(
        'User is not authenticated. Showing auth prompt from Home screen.',
      );
      setAuthModalVisible(true); // Show auth prompt
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
        {types.map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              { backgroundColor: theme.card },
              selectedType === type && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setSelectedType(type)}>
            <Text
              style={[
                styles.typeButtonText,
                { color: theme.text },
                selectedType === type && { color: 'white' },
              ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderModalContent = () => (
    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
      <Text style={[styles.modalTitle, { color: theme.text }]}>
        Add to Calendar
      </Text>
      {renderTypeSelection()}
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.textSecondary,
            backgroundColor: theme.card,
          },
        ]}
        placeholder="Title"
        placeholderTextColor={theme.textSecondary}
        value={title}
        onChangeText={setTitle}
      />
      {selectedType === 'Assignment' && (
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              color: theme.text,
              borderColor: theme.textSecondary,
              backgroundColor: theme.card,
            },
          ]}
          placeholder="About this assignment..."
          placeholderTextColor={theme.textSecondary}
          multiline
          value={about}
          onChangeText={setAbout}
        />
      )}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.primary }]}
        onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
  // --- End: Modal Logic ---

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Home</Text>
        <View style={styles.headerIcons}>
          <StreakCounter />
          <TouchableOpacity>
            <Ionicons
              name="search"
              size={24}
              color={theme.text}
              style={styles.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.text}
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.scrollView}>
        {/* Placeholder for Home screen content */}
        <View style={styles.content}>
          <Text testID="welcomeMessage" style={{ color: theme.text }}>
            Welcome, {user ? user.name : 'Guest'}
          </Text>
          <Text style={{ color: theme.textSecondary, marginTop: 10 }}>
            Your upcoming tasks will appear here.
          </Text>
        </View>
      </ScrollView>
      {/* The floating action button now triggers our new modal */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={openAddModal}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      {/* --- Start: Modals --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>{renderModalContent()}</View>
      </Modal>
      <AuthPromptModal
        visible={isAuthModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSignIn={() => {
          setAuthModalVisible(false);
          navigation.navigate('SignIn');
        }}
        onSignUp={() => {
          setAuthModalVisible(false);
          navigation.navigate('SignUp');
        }}
        title="Save Your Progress"
        message="Create an account or sign in to ensure your tasks and events are saved."
      />
      <SaveConfirmationModal
        visible={isSaveConfirmVisible}
        onClose={() => setSaveConfirmVisible(false)}
      />
      {/* --- End: Modals --- */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  icon: { marginLeft: 16 },
  scrollView: { flex: 1 },
  content: {
    padding: 20,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  // --- Start: Modal Styles (copied from CalendarScreen) ---
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonText: { fontWeight: 'bold' },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: { height: 100, paddingTop: 15, textAlignVertical: 'top' },
  saveButton: {
    marginTop: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // --- End: Modal Styles ---
});

export default HomeScreen;
