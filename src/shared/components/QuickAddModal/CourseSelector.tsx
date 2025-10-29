import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DialogModal } from '@/shared/components/ModalVariants';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '@/types';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, COMPONENT_TOKENS, SHADOWS, BORDER_RADIUS } from '@/constants/theme';

interface CourseSelectorProps {
  selectedCourse: Course | null;
  courses: Course[];
  isLoadingCourses: boolean;
  showCourseModal: boolean;
  onCourseSelect: (course: Course) => void;
  onShowCourseModal: (show: boolean) => void;
  onAddCourse: () => void;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  selectedCourse,
  courses,
  isLoadingCourses,
  showCourseModal,
  onCourseSelect,
  onShowCourseModal,
  onAddCourse,
}) => {
  return (
    <>
      {/* Course Selection */}
      <Text style={styles.label}>Course *</Text>
      <TouchableOpacity 
        style={styles.selectButton} 
        onPress={() => onShowCourseModal(true)}
        disabled={isLoadingCourses}
      >
        <Text style={[
          styles.selectButtonText, 
          selectedCourse && styles.selectButtonTextSelected
        ]}>
          {isLoadingCourses 
            ? 'Loading courses...' 
            : selectedCourse 
              ? selectedCourse.courseName 
              : 'Select Course'
          }
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
      </TouchableOpacity>

      {/* Course Selection Modal */}
      <DialogModal
        isVisible={showCourseModal}
        onClose={() => onShowCourseModal(false)}
      >
        <View style={styles.courseModalContent}>
          <Text style={styles.courseModalTitle}>Select Course</Text>
          <ScrollView style={styles.coursesList}>
            {courses.length === 0 ? (
              <View style={styles.noCourses}>
                <Text style={styles.noCoursesText}>No courses yet</Text>
                <Text style={styles.noCoursesSubtext}>
                  Close this and add a course first
                </Text>
              </View>
            ) : (
              courses.map(course => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    styles.courseOption,
                    selectedCourse?.id === course.id && styles.courseOptionSelected,
                  ]}
                  onPress={() => {
                    onCourseSelect(course);
                    onShowCourseModal(false);
                  }}
                >
                  <Text style={styles.courseOptionName}>{course.courseName}</Text>
                  {course.courseCode && (
                    <Text style={styles.courseOptionCode}>{course.courseCode}</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <View style={styles.courseModalActions}>
            <TouchableOpacity
              style={styles.courseModalButton}
              onPress={() => onShowCourseModal(false)}
            >
              <Text style={styles.courseModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.courseModalButton, styles.courseModalButtonPrimary]}
              onPress={() => {
                onAddCourse();
                onShowCourseModal(false);
              }}
            >
              <Text style={[styles.courseModalButtonText, styles.courseModalButtonTextPrimary]}>
                Add Course
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </DialogModal>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: COMPONENT_TOKENS.courseSelector.borderWidth,
    borderColor: COMPONENT_TOKENS.courseSelector.borderColor,
    borderRadius: COMPONENT_TOKENS.courseSelector.borderRadius,
    padding: COMPONENT_TOKENS.courseSelector.padding,
    marginBottom: SPACING.xs,
    backgroundColor: COMPONENT_TOKENS.courseSelector.backgroundColor,
  },
  selectButtonText: {
    fontSize: FONT_SIZES.md,
    color: COMPONENT_TOKENS.courseSelector.textColor,
  },
  selectButtonTextSelected: {
    color: COMPONENT_TOKENS.courseSelector.selectedTextColor,
  },
  courseModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseModalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.xl,
    alignSelf: 'center',
    marginTop: '20%',
  },
  courseModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  coursesList: {
    maxHeight: 200,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  courseOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'COLORS.border',
  },
  courseOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  courseOptionName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
  },
  courseOptionCode: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    marginTop: 2,
  },
  noCourses: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  noCoursesText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  noCoursesSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray,
    textAlign: 'center',
  },
  courseModalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  courseModalButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  courseModalButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  courseModalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text,
  },
  courseModalButtonTextPrimary: {
    color: COLORS.white,
  },
});

export default CourseSelector;
