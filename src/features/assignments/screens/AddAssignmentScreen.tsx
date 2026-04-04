import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { useDeviceId } from '@/hooks/useDeviceId';
import { useNetwork } from '@/contexts/NetworkContext';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notifications';
import { mapErrorCodeToMessage, getErrorTitle } from '@/utils/errorMapping';
import { SPACING } from '@/constants/theme';
import { saveDraft, getDraft, clearDraft } from '@/utils/draftStorage';
import { debounce } from '@/utils/debounce';
import { TemplateBrowserModal } from '@/shared/components/TemplateBrowserModal';
import { EmptyStateModal } from '@/shared/components/EmptyStateModal';
import {
  generateTemplateName,
  clearDateFields,
  canSaveAsTemplate,
} from '@/shared/utils/templateUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import {
  TaskTemplateSection,
  TaskFormFooter,
} from '@/shared/components/task-forms';
import { useReminders } from '@/shared/hooks/task-forms';
import { useTaskTemplate } from '@/shared/hooks/task-forms';
import {
  AssignmentFormHeader,
  AssignmentRequiredFields,
  AssignmentOptionalFields,
  ReminderModal,
} from './components';

type SubmissionMethod = 'Online' | 'In-person' | null;
type AddAssignmentScreenNavigationProp =
  StackNavigationProp<RootStackParamList>;
type AddAssignmentScreenRouteProp = RouteProp<
  RootStackParamList,
  'AddAssignmentFlow'
>;

const AddAssignmentScreen = () => {
  const navigation = useNavigation<AddAssignmentScreenNavigationProp>();
  const route = useRoute<AddAssignmentScreenRouteProp>();
  const deviceId = useDeviceId();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Get initial data from Quick Add if available
  const initialData = route.params?.initialData;
  const taskToEdit = initialData?.taskToEdit || null;

  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [dueDate, setDueDate] = useState<Date>(() => {
    if (initialData?.dateTime) {
      return initialData.dateTime instanceof Date
        ? initialData.dateTime
        : new Date(initialData.dateTime);
    }
    return new Date();
  });
  const [description, setDescription] = useState('');
  const [submissionMethod, setSubmissionMethod] =
    useState<SubmissionMethod>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionVenue, setSubmissionVenue] = useState('');

  // Reminders hook - no preselected reminders
  const { reminders, addReminder, removeReminder, setReminders } = useReminders(
    {
      maxReminders: 2,
      initialReminders: [],
    },
  );

  // Template hook
  const {
    isTemplateBrowserOpen,
    selectedTemplate,
    openTemplateBrowser,
    closeTemplateBrowser,
    handleTemplateSelect,
    handleSaveAsTemplate,
    hasTemplates,
    handleMyTemplatesPress,
  } = useTaskTemplate({
    taskType: 'assignment',
    onTemplateDataLoad: templateData => {
      if (templateData.title) {
        setTitle(templateData.title);
      }
      if (templateData.description) {
        setDescription(templateData.description);
      }
      if (templateData.submission_method) {
        setSubmissionMethod(templateData.submission_method);
      }
      if (templateData.submission_link) {
        setSubmissionLink(templateData.submission_link);
      }
      if (templateData.reminders) {
        setReminders(templateData.reminders);
      }
    },
  });

  // UI state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showEmptyStateModal, setShowEmptyStateModal] = useState(false);

  // Populate form from taskToEdit if present (for editing)
  useEffect(() => {
    if (taskToEdit && taskToEdit.type === 'assignment') {
      setTitle(taskToEdit.title || taskToEdit.name || '');
      if (taskToEdit.date) {
        setDueDate(new Date(taskToEdit.date));
      }
      if (taskToEdit.description) {
        setDescription(taskToEdit.description);
      }
      if ((taskToEdit as any).submission_method) {
        setSubmissionMethod((taskToEdit as any).submission_method);
      }
      if ((taskToEdit as any).submission_link) {
        setSubmissionLink((taskToEdit as any).submission_link);
      }
    }
  }, [taskToEdit]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (initialData || taskToEdit) return;

      const draft = await getDraft('assignment');
      if (draft) {
        if (draft.title) {
          setTitle(draft.title);
        }
        if (draft.dateTime) {
          setDueDate(new Date(draft.dateTime));
        }
        if (draft.description) {
          setDescription(draft.description);
        }
        if (draft.submissionMethod) {
          setSubmissionMethod(draft.submissionMethod);
        }
        if (draft.submissionLink) {
          setSubmissionLink(draft.submissionLink);
        }
        if (draft.submissionVenue) {
          setSubmissionVenue(draft.submissionVenue);
        }
        if (draft.reminders) {
          setReminders(draft.reminders);
        }
      }
    };

    loadDraft();
  }, [initialData, taskToEdit, setReminders]);

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    if (!title) return;

    const debouncedSave = debounce(() => {
      saveDraft('assignment', {
        title,
        dateTime: dueDate,
        description,
        submissionMethod,
        submissionLink,
        submissionVenue,
        reminders,
      });
    }, 1000);

    debouncedSave.debounced();

    return () => {
      debouncedSave.cancel();
    };
  }, [
    title,
    dueDate,
    description,
    submissionMethod,
    submissionLink,
    submissionVenue,
    reminders,
  ]);

  const handleDateChange = (date: Date) => {
    const newDueDate = new Date(date);
    newDueDate.setHours(dueDate.getHours());
    newDueDate.setMinutes(dueDate.getMinutes());
    setDueDate(newDueDate);
  };

  const handleTimeChange = (time: Date) => {
    const newDueDate = new Date(dueDate);
    newDueDate.setHours(time.getHours());
    newDueDate.setMinutes(time.getMinutes());
    setDueDate(newDueDate);
  };

  const handleAddReminder = () => {
    setShowReminderModal(true);
  };

  const handleSelectReminder = (minutes: number) => {
    if (reminders.includes(minutes)) {
      removeReminder(minutes);
    } else {
      addReminder(minutes);
    }
    setShowReminderModal(false);
  };

  // Check if form is valid
  const isFormValid = title.trim().length > 0 && dueDate > new Date();

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setIsSaving(true);

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        submission_method: submissionMethod || undefined,
        submission_link:
          submissionMethod === 'Online' ? submissionLink.trim() : undefined,
        submission_venue:
          submissionMethod === 'In-person' ? submissionVenue.trim() : undefined,
        due_date: dueDate.toISOString(),
        reminders,
      };

      const isEditing = taskToEdit && taskToEdit.id;
      let savedTaskId: string;

      if (isEditing) {
        const { isTempId, resolveTaskId } = await import('@/utils/taskCache');

        if (isTempId(taskToEdit.id)) {
          const realId = await resolveTaskId(taskToEdit.id, 'assignment');

          if (realId === taskToEdit.id) {
            Alert.alert(
              'Please Wait',
              'This task is still syncing. Please wait a moment before editing, or go online to sync first.',
            );
            setIsSaving(false);
            return;
          }

          taskToEdit.id = realId;
        }

        if (taskToEdit.id) {
          try {
            await notificationService.cancelItemReminders(taskToEdit.id);
          } catch (notifError) {
            console.warn('Failed to cancel old notifications:', notifError);
          }
        }

        await api.mutations.assignments.update(
          taskToEdit.id!,
          taskData,
          isOnline,
          deviceId || '',
        );
        savedTaskId = taskToEdit.id!;
      } else {
        const assignment = await api.mutations.assignments.create(
          taskData,
          isOnline,
          deviceId || '',
        );
        savedTaskId = assignment.id;

        if (saveAsTemplate && canSaveAsTemplate(taskData, 'assignment')) {
          try {
            await handleSaveAsTemplate(
              taskData,
              generateTemplateName(title.trim()),
            );
          } catch (templateError) {
            console.error('Error saving template:', templateError);
          }
        }
      }

      // Schedule local notifications (at due time + any advance reminders)
      try {
        await notificationService.scheduleTaskReminders({
          taskId: savedTaskId,
          title: title.trim(),
          taskDate: dueDate,
          reminderOffsets: reminders,
          type: 'assignment',
        });
      } catch (notifError) {
        console.warn('Failed to schedule notifications:', notifError);
      }

      const { invalidateTaskQueries } =
        await import('@/utils/queryInvalidation');
      await invalidateTaskQueries(queryClient, 'assignment');

      await clearDraft('assignment');

      Alert.alert(
        'Success',
        isEditing
          ? 'Assignment updated successfully!'
          : 'Assignment created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      const isEditing = taskToEdit && taskToEdit.id;
      console.error(
        `Failed to ${isEditing ? 'update' : 'create'} assignment:`,
        error,
      );
      const errorTitle = getErrorTitle(error);
      const errorMessage = mapErrorCodeToMessage(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    clearDraft('assignment');
    navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#101922' : '#F6F7F8',
          paddingTop: insets.top,
        },
      ]}>
      <AssignmentFormHeader
        onClose={handleClose}
        onTemplatePress={() =>
          handleMyTemplatesPress(() => setShowEmptyStateModal(true))
        }
        hasTemplates={hasTemplates}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}>
        <AssignmentRequiredFields
          title={title}
          onTitleChange={setTitle}
          dueDate={dueDate}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
        />

        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
          ]}
        />

        <AssignmentOptionalFields
          description={description}
          onDescriptionChange={setDescription}
          submissionMethod={submissionMethod}
          submissionLink={submissionLink}
          submissionVenue={submissionVenue}
          onSubmissionMethodChange={setSubmissionMethod}
          onSubmissionLinkChange={setSubmissionLink}
          onSubmissionVenueChange={setSubmissionVenue}
          reminders={reminders}
          onRemindersChange={setReminders}
          onAddReminder={handleAddReminder}
        />

        <TaskTemplateSection
          taskType="assignment"
          onTemplateSelect={handleTemplateSelect}
          onSaveAsTemplate={() => setSaveAsTemplate(true)}
          canSaveAsTemplate={canSaveAsTemplate(
            {
              title,
              due_date: dueDate,
              description,
              submission_method: submissionMethod,
              submission_link: submissionLink,
              submission_venue: submissionVenue,
              reminders,
            },
            'assignment',
          )}
          hasTemplates={hasTemplates}
          onMyTemplatesPress={() =>
            handleMyTemplatesPress(() => setShowEmptyStateModal(true))
          }
          selectedTemplate={selectedTemplate}
        />
      </ScrollView>

      <TaskFormFooter
        isValid={!!isFormValid}
        onSave={handleSave}
        isSaving={isSaving}
        saveButtonText="Save Assignment"
      />

      {/* Modals */}
      <ReminderModal
        visible={showReminderModal}
        selectedReminders={reminders}
        onSelect={handleSelectReminder}
        onClose={() => setShowReminderModal(false)}
        maxReminders={2}
      />

      <TemplateBrowserModal
        visible={isTemplateBrowserOpen}
        onClose={closeTemplateBrowser}
        onSelectTemplate={handleTemplateSelect}
        currentTaskType="assignment"
      />

      <EmptyStateModal
        visible={showEmptyStateModal}
        onClose={() => setShowEmptyStateModal(false)}
        message="You don't have any templates. You can add a template using the toggle at the latter part of the task addition."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.md,
  },
});

export default AddAssignmentScreen;
