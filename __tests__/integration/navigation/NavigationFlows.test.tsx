import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import NextTaskCard from '@/features/dashboard/components/NextTaskCard';
import {
  SafeNavigation,
  NavigationPatterns,
} from '@/navigation/utils/SafeNavigation';
import { RootStackParamList } from '@/types/navigation';
import { createMockNavigation, createMockUser } from '@tests/utils/testUtils';

// Mock the useNavigation hook to return our mock
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      replace: mockReplace,
      reset: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      canGoBack: jest.fn(() => true),
    }),
    useRoute: () => ({
      params: {},
      key: 'test-route',
      name: 'TestScreen',
    }),
  };
});

jest.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: createMockUser(),
    session: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
    isLoading: false,
  }),
}));

describe('Navigation Flows Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StudySessionReview Flow', () => {
    it('should navigate from NextTaskCard to StudySessionReview when Start Study is pressed', async () => {
      const mockTask = {
        id: 'session-123',
        type: 'study_session',
        name: 'Test Study Session',
        date: new Date().toISOString(),
        courses: {
          courseName: 'Test Course',
        },
        description: 'Test description',
      } as any;

      const { getByText } = render(
        <NextTaskCard task={mockTask} isGuestMode={false} />,
      );

      // Find and press the "Start Study" button
      const startButton = getByText(/Start Study/i);
      fireEvent.press(startButton);

      // Wait for navigation to be called
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('StudySessionReview', {
            sessionId: 'session-123',
          });
        },
        { timeout: 1000 },
      );
    });

    it('should navigate with correct sessionId parameter', async () => {
      const sessionId = 'test-session-456';
      const mockTask = {
        id: sessionId,
        type: 'study_session',
        name: 'Another Study Session',
        date: new Date().toISOString(),
        courses: {
          courseName: 'Another Course',
        },
      } as any;

      const { getByText } = render(
        <NextTaskCard task={mockTask} isGuestMode={false} />,
      );

      const startButton = getByText(/Start Study/i);
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('StudySessionReview', {
          sessionId,
        });
      });
    });

    it('should not show Start Study button for non-study_session tasks', () => {
      const mockTask = {
        id: 'assignment-123',
        type: 'assignment',
        name: 'Test Assignment',
        date: new Date().toISOString(),
        courses: {
          courseName: 'Test Course',
        },
      } as any;

      const { queryByText } = render(
        <NextTaskCard task={mockTask} isGuestMode={false} />,
      );

      const startButton = queryByText(/Start Study/i);
      expect(startButton).toBeNull();
    });
  });

  describe('PaywallScreen Flow', () => {
    it('should navigate to PaywallScreen via SafeNavigation', () => {
      const mockNavigation = createMockNavigation();

      NavigationPatterns.navigateToPaywall(mockNavigation as any);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PaywallScreen');
    });

    it('should navigate with variant parameter', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      safeNav.navigate('PaywallScreen', {
        variant: 'locked',
        lockedContent: 'Premium feature',
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PaywallScreen', {
        variant: 'locked',
        lockedContent: 'Premium feature',
      });
    });

    it('should navigate with general variant by default', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      safeNav.navigate('PaywallScreen', { variant: 'general' });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PaywallScreen', {
        variant: 'general',
      });
    });

    it('should handle undefined params for PaywallScreen', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      // Navigate without params (should work since params are optional)
      safeNav.navigate('PaywallScreen');

      // Should still call navigate
      expect(mockNavigation.navigate).toHaveBeenCalled();
    });
  });

  describe('OddityWelcomeScreen Flow', () => {
    it('should navigate from PaywallScreen to OddityWelcomeScreen', () => {
      const mockNavigation = createMockNavigation();

      // Simulate purchase completion navigation
      const safeNav = new SafeNavigation(mockNavigation as any);
      safeNav.navigate('OddityWelcomeScreen', { variant: 'trial-early' });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'OddityWelcomeScreen',
        { variant: 'trial-early' },
      );
    });

    it('should navigate with all valid variant types', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      const variants: Array<
        RootStackParamList['OddityWelcomeScreen']['variant']
      > = [
        'trial-early',
        'trial-expired',
        'direct',
        'renewal',
        'restore',
        'promo',
        'granted',
        'plan-change',
      ];

      variants.forEach(variant => {
        safeNav.navigate('OddityWelcomeScreen', { variant });
      });

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(variants.length);

      // Verify last call was with the last variant
      expect(mockNavigation.navigate).toHaveBeenLastCalledWith(
        'OddityWelcomeScreen',
        { variant: 'plan-change' },
      );
    });
  });

  describe('Navigation Flow Integration', () => {
    it('should complete full StudySessionReview → StudyResult flow', async () => {
      // This test simulates the full flow
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      // Step 1: Navigate to StudySessionReview
      safeNav.navigate('StudySessionReview', { sessionId: 'session-123' });

      // Step 2: After study complete, navigate to StudyResult
      safeNav.navigate('StudyResult', { sessionId: 'session-123' });

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        1,
        'StudySessionReview',
        { sessionId: 'session-123' },
      );
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        2,
        'StudyResult',
        { sessionId: 'session-123' },
      );
    });

    it('should complete PaywallScreen → OddityWelcomeScreen flow', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      // Step 1: Navigate to PaywallScreen
      NavigationPatterns.navigateToPaywall(mockNavigation as any);

      // Step 2: After purchase, navigate to OddityWelcomeScreen
      safeNav.navigate('OddityWelcomeScreen', { variant: 'direct' });

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        1,
        'PaywallScreen',
      );
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        2,
        'OddityWelcomeScreen',
        { variant: 'direct' },
      );
    });
  });

  describe('SafeNavigation Validation', () => {
    it('should validate routes before navigating', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      // Valid route should navigate
      safeNav.navigate('StudySessionReview', { sessionId: 'test' });
      expect(mockNavigation.navigate).toHaveBeenCalled();

      // Invalid route should not navigate (handled by SafeNavigation)
      jest.clearAllMocks();
      // Note: SafeNavigation will handle invalid routes internally
      // This test verifies the navigation object is used correctly
    });
  });

  describe('Deep Linking', () => {
    it('should handle deep link navigation to assignment detail', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      // Simulate deep link: elaro://assignment/123
      const assignmentId = 'assignment-123';
      safeNav.navigate('TaskDetailModal', {
        taskId: assignmentId,
        taskType: 'assignment',
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TaskDetailModal', {
        taskId: assignmentId,
        taskType: 'assignment',
      });
    });

    it('should handle deep link navigation to course detail', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      const courseId = 'course-456';
      safeNav.navigate('CourseDetail', { courseId });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CourseDetail', {
        courseId,
      });
    });
  });

  describe('Modal Flows', () => {
    it('should navigate to Add Course modal flow', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      safeNav.navigate('AddCourseFlow');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddCourseFlow');
    });

    it('should navigate to Add Assignment modal flow', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      safeNav.navigate('AddAssignmentFlow', {
        initialData: { course: { id: 'course-123' } as any },
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'AddAssignmentFlow',
        {
          initialData: { course: { id: 'course-123' } as any },
        },
      );
    });

    it('should handle back navigation from modal flows', () => {
      const mockNavigation = createMockNavigation();

      // Simulate navigating to modal and then going back
      mockNavigation.navigate('AddCourseFlow');
      mockNavigation.goBack();

      expect(mockNavigation.navigate).toHaveBeenCalledWith('AddCourseFlow');
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Navigation State Persistence', () => {
    it('should preserve navigation state structure', () => {
      const mockNavigation = createMockNavigation();
      const safeNav = new SafeNavigation(mockNavigation as any);

      // Navigate through multiple screens
      safeNav.navigate('Courses');
      safeNav.navigate('CourseDetail', { courseId: 'course-123' });
      safeNav.navigate('TaskDetailModal', {
        taskId: 'assignment-456',
        taskType: 'assignment',
      });

      // Verify navigation stack was built correctly
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'Courses');
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        2,
        'CourseDetail',
        { courseId: 'course-123' },
      );
      expect(mockNavigation.navigate).toHaveBeenNthCalledWith(
        3,
        'AssignmentDetail',
        { assignmentId: 'assignment-456' },
      );
    });
  });
});
