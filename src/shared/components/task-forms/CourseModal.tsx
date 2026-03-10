import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Course } from '@/types';
import { Button } from '@/shared/components/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { FONT_SIZES, FONT_WEIGHTS, SPACING, COLORS } from '@/constants/theme';

interface CourseModalProps {
  visible: boolean;
  courses: Course[];
  selectedCourse: Course | null;
  onSelect: (course: Course) => void;
  onClose: () => void;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const CourseModal: React.FC<CourseModalProps> = ({
  visible,
  courses,
  selectedCourse,
  onSelect,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleAddCourse = () => {
    onClose();
    navigation.navigate('AddCourseFlow');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#1C252E' : '#FFFFFF',
            },
          ]}
          onStartShouldSetResponder={() => true}>
          <Text
            style={[
              styles.modalTitle,
              { color: isDark ? '#FFFFFF' : '#111418' },
            ]}>
            Select Course
          </Text>
          <ScrollView style={styles.coursesList}>
            {courses.length === 0 ? (
              <View style={styles.noCourses}>
                <Text
                  style={[
                    styles.noCoursesText,
                    { color: isDark ? '#FFFFFF' : '#111418' },
                  ]}>
                  No courses yet
                </Text>
                <Button
                  title="Add a Course"
                  onPress={handleAddCourse}
                  variant="primary"
                />
              </View>
            ) : (
              courses.map(course => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    styles.courseOption,
                    selectedCourse?.id === course.id &&
                      styles.courseOptionSelected,
                    {
                      backgroundColor:
                        selectedCourse?.id === course.id
                          ? COLORS.primary + '1A'
                          : 'transparent',
                      borderColor:
                        selectedCourse?.id === course.id
                          ? COLORS.primary
                          : isDark
                            ? '#374151'
                            : '#E5E7EB',
                    },
                  ]}
                  onPress={() => {
                    onSelect(course);
                    onClose();
                  }}>
                  <Text
                    style={[
                      styles.courseOptionName,
                      {
                        color:
                          selectedCourse?.id === course.id
                            ? COLORS.primary
                            : isDark
                              ? '#FFFFFF'
                              : '#111418',
                        fontWeight:
                          selectedCourse?.id === course.id
                            ? FONT_WEIGHTS.bold
                            : FONT_WEIGHTS.normal,
                      },
                    ]}>
                    {course.courseName}
                  </Text>
                  {course.courseCode && (
                    <Text
                      style={[
                        styles.courseOptionCode,
                        {
                          color: isDark ? '#9CA3AF' : '#6B7280',
                        },
                      ]}>
                      {course.courseCode}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  coursesList: {
    maxHeight: 400,
  },
  noCourses: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  noCoursesText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
  courseOption: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  courseOptionSelected: {
    borderWidth: 2,
  },
  courseOptionName: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  courseOptionCode: {
    fontSize: FONT_SIZES.sm,
  },
});
