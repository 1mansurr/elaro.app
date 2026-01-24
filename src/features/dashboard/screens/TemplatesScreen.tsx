import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  PanGestureHandler,
  State,
  GestureHandlerGestureEvent,
  GestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList, FlowInitialData, Course } from '@/types';
import {
  useTemplates,
  useDeleteTemplate,
  TaskTemplate,
} from '@/hooks/useTemplates';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  SHADOWS,
  BORDER_RADIUS,
} from '@/constants/theme';
import { showToast } from '@/utils/showToast';

type TemplatesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width: screenWidth } = Dimensions.get('window');
const EDGE_SWIPE_THRESHOLD = 50;

// Map Material Symbols to Ionicons and colors
const getTemplateTypeInfo = (taskType: string) => {
  switch (taskType) {
    case 'assignment':
      return {
        icon: 'document-text-outline' as const,
        iconColor: COLORS.primary,
        bgColor: '#DBEAFE', // blue-100
        label: 'Assignment Template',
      };
    case 'lecture':
      return {
        icon: 'tv-outline' as const, // slideshow equivalent
        iconColor: '#9333EA', // purple-600
        bgColor: '#F3E8FF', // purple-100
        label: 'Lecture Template',
      };
    case 'study_session':
      return {
        icon: 'people-outline' as const, // groups equivalent
        iconColor: '#10B981', // green-600
        bgColor: '#D1FAE5', // green-100
        label: 'Study Session Template',
      };
    default:
      return {
        icon: 'document-outline' as const,
        iconColor: COLORS.gray,
        bgColor: '#F3F4F6',
        label: 'Template',
      };
  }
};

const TemplatesScreen = () => {
  const navigation = useNavigation<TemplatesScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    data: templates,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useTemplates();
  const deleteTemplateMutation = useDeleteTemplate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TaskTemplate | null>(
    null,
  );
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(
    null,
  );

  // Swipe from right edge to go back
  const edgeSwipeTranslateX = useRef(new Animated.Value(0)).current;
  const edgeSwipeOpacity = useRef(new Animated.Value(1)).current;

  const handleRefresh = () => {
    refetch();
  };

  const handleUseTemplate = (template: TaskTemplate) => {
    // Create initial data from template with proper type guards
    const courseData = template.template_data.course;
    const course: Course | undefined =
      courseData &&
      typeof courseData === 'object' &&
      'id' in courseData &&
      'courseName' in courseData
        ? (courseData as Course)
        : undefined;

    const titleData = template.template_data.title;
    const title: string = typeof titleData === 'string' ? titleData : '';

    const dateTimeData = template.template_data.dateTime;
    const dateTime: Date | string | undefined =
      dateTimeData instanceof Date
        ? dateTimeData
        : typeof dateTimeData === 'string'
          ? dateTimeData
          : dateTimeData
            ? new Date()
            : undefined;

    const initialData: FlowInitialData = {
      course,
      title,
      dateTime,
      description:
        typeof template.template_data.description === 'string'
          ? template.template_data.description
          : '',
      // Assignment-specific
      submissionMethod: template.template_data.submissionMethod || null,
      submissionLink:
        typeof template.template_data.submissionLink === 'string'
          ? template.template_data.submissionLink
          : '',
      // Lecture-specific
      endTime: template.template_data.endTime || null,
      recurrence:
        typeof template.template_data.recurrence === 'string'
          ? template.template_data.recurrence
          : 'none',
      // Study Session-specific
      hasSpacedRepetition: Boolean(template.template_data.hasSpacedRepetition),
      // Common
      reminders: Array.isArray(template.template_data.reminders)
        ? template.template_data.reminders
        : [120],
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

  const handleEditTemplate = (template: TaskTemplate) => {
    setPopoverVisible(false);
    // Navigate to edit flow with template data
    const initialData = {
      ...template.template_data,
      templateId: template.id,
    };
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
    setPopoverVisible(false);
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
      onError: error => {
        showToast({ type: 'error', message: 'Failed to delete template' });
        console.error('Delete template error:', error);
      },
    });
  };

  const handleOptionsPress = (template: TaskTemplate, event: any) => {
    event.persist?.();
    const { pageX, pageY } = event.nativeEvent || {};
    setSelectedTemplate(template);
    setPopoverPosition({ x: pageX || screenWidth - 100, y: pageY || 0 });
    setPopoverVisible(true);
  };

  // Handle swipe from right edge to go back
  const handleEdgeSwipe = (event: GestureHandlerGestureEvent) => {
    const translationX = event.nativeEvent.translationX as number;
    const x = event.nativeEvent.x as number;
    // Check if swipe starts from right edge (within 20px of right edge)
    if (x > screenWidth - 20 && translationX < 0) {
      const progress = Math.min(1, Math.abs(translationX) / screenWidth);
      edgeSwipeTranslateX.setValue(translationX);
      edgeSwipeOpacity.setValue(1 - progress * 0.5);
    }
  };

  const handleEdgeSwipeEnd = (event: GestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      const translationX = event.nativeEvent.translationX as number;
      if (Math.abs(translationX) > EDGE_SWIPE_THRESHOLD) {
        // Animate out and go back
        Animated.parallel([
          Animated.timing(edgeSwipeTranslateX, {
            toValue: -screenWidth,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(edgeSwipeOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          navigation.goBack();
          // Reset
          edgeSwipeTranslateX.setValue(0);
          edgeSwipeOpacity.setValue(1);
        });
      } else {
        // Snap back
        Animated.parallel([
          Animated.spring(edgeSwipeTranslateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }),
          Animated.spring(edgeSwipeOpacity, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
          }),
        ]).start();
      }
    }
  };

  const renderTemplate = ({ item }: { item: TaskTemplate }) => {
    const typeInfo = getTemplateTypeInfo(item.task_type);

    return (
      <View
        style={[
          styles.templateCard,
          {
            backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          },
        ]}>
        <View style={styles.templateHeader}>
          <View style={styles.templateLeft}>
            <View
              style={[styles.typeIcon, { backgroundColor: typeInfo.bgColor }]}>
              <Ionicons
                name={typeInfo.icon}
                size={20}
                color={typeInfo.iconColor}
              />
            </View>
            <View style={styles.templateInfo}>
              <Text
                style={[
                  styles.templateTypeLabel,
                  { color: isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                {typeInfo.label}
              </Text>
              <Text
                style={[
                  styles.templateName,
                  { color: isDark ? '#FFFFFF' : '#111418' },
                ]}
                numberOfLines={2}>
                {item.template_name}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={e => handleOptionsPress(item, e)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.useButton, { backgroundColor: COLORS.primary }]}
          onPress={() => handleUseTemplate(item)}>
          <Text style={styles.useButtonText}>Use Template</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="library-outline"
        size={64}
        color={isDark ? '#9CA3AF' : '#6B7280'}
      />
      <Text
        style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#111418' }]}>
        No Templates
      </Text>
      <Text
        style={[
          styles.emptyMessage,
          { color: isDark ? '#9CA3AF' : '#6B7280' },
        ]}>
        Create templates from your tasks to save time on repetitive work.
        Templates remember your course, reminders, and other settings.
      </Text>
    </View>
  );

  // Light mode default colors
  const bgColor = isDark ? '#101922' : '#F6F7F8';
  const surfaceColor = isDark ? '#1C252E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111418';
  const textSecondaryColor = isDark ? '#9CA3AF' : '#6B7280';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={textSecondaryColor}
        />
        <Text style={[styles.errorTitle, { color: textColor }]}>
          Failed to Load Templates
        </Text>
        <Text style={[styles.errorMessage, { color: textSecondaryColor }]}>
          Please try again later.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: COLORS.primary }]}
          onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <PanGestureHandler
      onGestureEvent={handleEdgeSwipe}
      onHandlerStateChange={handleEdgeSwipeEnd}
      activeOffsetX={-10}
      failOffsetY={[-10, 10]}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            transform: [{ translateX: edgeSwipeTranslateX }],
            opacity: edgeSwipeOpacity,
            paddingTop: insets.top,
          },
        ]}>
        {/* Description - Only show when templates exist */}
        {templates && templates.length > 0 && (
          <View style={styles.descriptionContainer}>
            <Text
              style={[styles.descriptionText, { color: textSecondaryColor }]}>
              Select a template to quickly create a new item with pre-filled
              details.
            </Text>
          </View>
        )}

        {/* Templates List */}
        <FlatList
          data={templates}
          renderItem={renderTemplate}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
        />

        {/* Popover Menu */}
        <Modal
          visible={popoverVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPopoverVisible(false)}>
          <TouchableOpacity
            style={styles.popoverOverlay}
            activeOpacity={1}
            onPress={() => setPopoverVisible(false)}>
            <View
              style={[
                styles.popoverContent,
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                  top: popoverPosition.y,
                  right: screenWidth - popoverPosition.x - 100,
                },
              ]}>
              <TouchableOpacity
                style={styles.popoverItem}
                onPress={() =>
                  selectedTemplate && handleEditTemplate(selectedTemplate)
                }>
                <Ionicons name="pencil-outline" size={18} color={textColor} />
                <Text style={[styles.popoverText, { color: textColor }]}>
                  Edit
                </Text>
              </TouchableOpacity>
              <View
                style={[
                  styles.popoverDivider,
                  { backgroundColor: borderColor },
                ]}
              />
              <TouchableOpacity
                style={styles.popoverItem}
                onPress={() =>
                  selectedTemplate && handleDeleteTemplate(selectedTemplate)
                }>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.popoverText, { color: '#EF4444' }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                },
              ]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Delete Template
              </Text>
              <Text
                style={[styles.modalMessage, { color: textSecondaryColor }]}>
                Are you sure you want to delete "
                {templateToDelete?.template_name}
                "? This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    { borderColor: borderColor },
                  ]}
                  onPress={() => setShowDeleteModal(false)}>
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmDelete}
                  disabled={deleteTemplateMutation.isPending}>
                  <Text style={styles.confirmButtonText}>
                    {deleteTemplateMutation.isPending
                      ? 'Deleting...'
                      : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  descriptionContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  descriptionText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    paddingHorizontal: SPACING.xs,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  templateCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.xs,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  templateLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: SPACING.md,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  templateInfo: {
    flex: 1,
  },
  templateTypeLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 20,
  },
  optionsButton: {
    padding: SPACING.xs,
    marginTop: -SPACING.xs,
    marginRight: -SPACING.xs,
  },
  useButton: {
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  useButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
  },
  errorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  popoverContent: {
    position: 'absolute',
    minWidth: 120,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    ...SHADOWS.lg,
    paddingVertical: 4,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  popoverText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  popoverDivider: {
    height: 1,
    marginVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  modalMessage: {
    fontSize: FONT_SIZES.md,
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
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  confirmButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});

export default TemplatesScreen;
