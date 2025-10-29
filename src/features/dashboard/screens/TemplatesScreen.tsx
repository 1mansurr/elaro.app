import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { RootStackParamList } from '@/types';
import { useTemplates, useDeleteTemplate, TaskTemplate } from '@/hooks/useTemplates';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/constants/theme';
import { showToast } from '@/utils/showToast';

type TemplatesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const TemplatesScreen = () => {
  const navigation = useNavigation<TemplatesScreenNavigationProp>();
  const { data: templates, isLoading, isError, refetch, isRefetching } = useTemplates();
  const deleteTemplateMutation = useDeleteTemplate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TaskTemplate | null>(null);

  const handleRefresh = () => {
    refetch();
  };

  const handleUseTemplate = (template: TaskTemplate) => {
    // Create initial data from template
    const initialData = {
      course: template.template_data.course || null,
      title: template.template_data.title || '',
      dateTime: template.template_data.dateTime || new Date(),
      description: template.template_data.description || '',
      // Assignment-specific
      submissionMethod: template.template_data.submissionMethod || null,
      submissionLink: template.template_data.submissionLink || '',
      // Lecture-specific
      endTime: template.template_data.endTime || null,
      recurrence: template.template_data.recurrence || 'none',
      // Study Session-specific
      hasSpacedRepetition: template.template_data.hasSpacedRepetition || false,
      // Common
      reminders: template.template_data.reminders || [120],
    };

    // Navigate to appropriate modal based on task type
    switch (template.task_type) {
      case 'assignment':
        navigation.navigate('AddAssignmentFlow', { initialData });
        break;
      case 'lecture':
        navigation.navigate('AddLectureFlow', { initialData });
        break;
      case 'study_session':
        navigation.navigate('AddStudySessionFlow', { initialData });
        break;
    }
  };

  const handleDeleteTemplate = (template: TaskTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!templateToDelete) return;

    deleteTemplateMutation.mutate(templateToDelete.id, {
      onSuccess: () => {
        showToast({ type: 'success', message: 'Template deleted' });
        setShowDeleteModal(false);
        setTemplateToDelete(null);
      },
      onError: (error) => {
        showToast({ type: 'error', message: 'Failed to delete template' });
        console.error('Delete template error:', error);
      },
    });
  };

  const getTaskTypeInfo = (taskType: string) => {
    switch (taskType) {
      case 'assignment':
        return { icon: 'document-text' as const, color: '#FF9500', label: 'Assignment' };
      case 'lecture':
        return { icon: 'school' as const, color: COLORS.primary, label: 'Lecture' };
      case 'study_session':
        return { icon: 'book' as const, color: '#34C759', label: 'Study Session' };
      default:
        return { icon: 'document' as const, color: COLORS.gray, label: 'Task' };
    }
  };

  const renderTemplate = ({ item }: { item: TaskTemplate }) => {
    const typeInfo = getTaskTypeInfo(item.task_type);
    const createdAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

    return (
      <View style={styles.templateCard}>
        <View style={styles.templateContent}>
          <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
            <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
          </View>
          
          <View style={styles.templateInfo}>
            <Text style={styles.templateName} numberOfLines={2}>
              {item.template_name}
            </Text>
            <Text style={styles.templateType}>{typeInfo.label}</Text>
            {item.template_data.course && (
              <Text style={styles.templateCourse} numberOfLines={1}>
                {item.template_data.course.courseName}
              </Text>
            )}
            <Text style={styles.templateCreatedAt}>Created {createdAgo}</Text>
          </View>

          <View style={styles.templateActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.useButton]}
              onPress={() => handleUseTemplate(item)}
            >
              <Ionicons name="play" size={16} color="white" />
              <Text style={styles.useButtonText}>Use</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteTemplate(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="library-outline" size={64} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No Templates</Text>
      <Text style={styles.emptyMessage}>
        Create templates from your tasks to save time on repetitive work. Templates remember your course, reminders, and other settings.
      </Text>
      <TouchableOpacity
        style={styles.createFirstTemplateButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.createFirstTemplateButtonText}>Create Your First Template</Text>
      </TouchableOpacity>
    </View>
  );

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray} />
        <Text style={styles.errorTitle}>Failed to Load Templates</Text>
        <Text style={styles.errorMessage}>Please try again later.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Templates {templates?.length ? `(${templates.length})` : ''}
        </Text>
      </View>

      {/* Info Banner */}
      {templates && templates.length > 0 && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoBannerText}>
            Tap "Use" to create a new task with this template's settings.
          </Text>
        </View>
      )}

      {/* Templates List */}
      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Template</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{templateToDelete?.template_name}"? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmDelete}
                disabled={deleteTemplateMutation.isPending}
              >
                <Text style={styles.confirmButtonText}>
                  {deleteTemplateMutation.isPending ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5FF',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: 8,
    gap: SPACING.xs,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 18,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  templateCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  templateContent: {
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: 4,
  },
  templateType: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginBottom: 2,
  },
  templateCourse: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginBottom: 2,
  },
  templateCreatedAt: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  templateActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
    gap: 4,
  },
  useButton: {
    backgroundColor: COLORS.primary,
  },
  useButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    paddingTop: SPACING.xxl * 3,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  createFirstTemplateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  createFirstTemplateButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold as any,
  },
});

export default TemplatesScreen;
