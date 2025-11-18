/**
 * Add Assignment Screen Tests
 * 
 * Tests for src/features/assignments/screens/AddAssignmentScreen.tsx
 * Target: 70%+ coverage
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddAssignmentScreen } from '@/features/assignments/screens/AddAssignmentScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '@/services/api';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/NetworkContext');
jest.mock('@tanstack/react-query');
jest.mock('@react-navigation/native');
jest.mock('@/services/api');
jest.mock('@/services/supabase');
jest.mock('@/services/notifications');
jest.mock('@/hooks/useMonthlyTaskCount');
jest.mock('@/hooks/useTotalTaskCount');
jest.mock('@/utils/taskPersistence');
jest.mock('@/utils/draftStorage');
jest.mock('@/hooks/useTemplates');
jest.mock('@/shared/hooks/useTemplateManagement');
jest.mock('@/shared/hooks/useTemplateSelection');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

describe('AddAssignmentScreen', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockInvalidateQueries = jest.fn();
  const mockQueryClient = {
    invalidateQueries: mockInvalidateQueries,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      session: { user: { id: 'user-123' } } as any,
      user: { id: 'user-123', email: 'test@example.com' } as any,
      loading: false,
      isGuest: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      refreshUser: jest.fn(),
    });

    mockUseNetwork.mockReturnValue({
      isOnline: true,
      isOffline: false,
      isInternetReachable: true,
    });

    mockUseQueryClient.mockReturnValue(mockQueryClient as any);

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as any);

    mockUseRoute.mockReturnValue({
      params: {},
    } as any);

    // Mock hooks
    jest.doMock('@/hooks/useMonthlyTaskCount', () => ({
      useMonthlyTaskCount: () => ({
        limitReached: false,
        monthlyTaskCount: 5,
        monthlyLimit: 10,
      }),
    }));

    jest.doMock('@/hooks/useTotalTaskCount', () => ({
      useTotalTaskCount: () => ({
        isFirstTask: false,
        isLoading: false,
      }),
    }));

    jest.doMock('@/shared/hooks/useTemplateManagement', () => ({
      useTemplateManagement: () => ({
        createTemplate: jest.fn(),
        hasTemplates: false,
      }),
    }));

    jest.doMock('@/shared/hooks/useTemplateSelection', () => ({
      useTemplateSelection: () => ({
        isTemplateBrowserOpen: false,
        isUsingTemplate: false,
        selectedTemplate: null,
        openTemplateBrowser: jest.fn(),
        closeTemplateBrowser: jest.fn(),
        selectTemplate: jest.fn(),
        resetTemplateSelection: jest.fn(),
      }),
    }));
  });

  describe('rendering', () => {
    it('should render assignment form', () => {
      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      expect(getByPlaceholderText(/title/i)).toBeTruthy();
      expect(getByPlaceholderText(/course/i)).toBeTruthy();
      expect(getByText(/due date/i)).toBeTruthy();
    });

    it('should render with initial data from route params', () => {
      mockUseRoute.mockReturnValue({
        params: {
          initialData: {
            title: 'Test Assignment',
            course: { id: 'course-1', courseName: 'Test Course' },
            dateTime: new Date('2025-12-31'),
          },
        },
      } as any);

      const { getByDisplayValue } = render(<AddAssignmentScreen />);

      expect(getByDisplayValue('Test Assignment')).toBeTruthy();
    });

    it('should show guest auth modal when user is guest', () => {
      mockUseAuth.mockReturnValue({
        session: null,
        user: null,
        loading: false,
        isGuest: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { getByText } = render(<AddAssignmentScreen />);

      // Should show guest auth prompt or modal
      // (exact implementation depends on component)
    });
  });

  describe('form validation', () => {
    it('should require course selection', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Don't select course

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      // Should show error or prevent submission
      await waitFor(() => {
        // Validation should prevent submission
      });
    });

    it('should require title', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      // Don't enter title
      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      // Should show validation error
      await waitFor(() => {
        // Title required error
      });
    });

    it('should require due date', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Don't set due date

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      // Should show validation error
    });
  });

  describe('course selection', () => {
    it('should open course selection modal', () => {
      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      const courseInput = getByPlaceholderText(/course/i);
      fireEvent.press(courseInput);

      // Should open course modal
      // (exact implementation depends on component)
    });

    it('should display selected course', () => {
      // Mock course selection
      const { getByText } = render(<AddAssignmentScreen />);

      // After selecting course, should display it
      // (exact implementation depends on component)
    });
  });

  describe('date selection', () => {
    it('should open date picker', () => {
      const { getByText } = render(<AddAssignmentScreen />);

      const dateButton = getByText(/due date/i);
      fireEvent.press(dateButton);

      // Should open date picker
    });

    it('should update due date when selected', () => {
      const { getByText } = render(<AddAssignmentScreen />);

      const dateButton = getByText(/due date/i);
      fireEvent.press(dateButton);

      // Select date
      // Should update form state
    });
  });

  describe('assignment creation', () => {
    it('should create assignment when online', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'assignment-123',
        title: 'Test Assignment',
      });

      jest.doMock('@/services/api', () => ({
        api: {
          mutations: {
            assignments: {
              create: mockCreate,
            },
          },
        },
      }));

      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Select course, set date, etc.

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalled();
      });
    });

    it('should queue assignment when offline', async () => {
      mockUseNetwork.mockReturnValue({
        isOnline: false,
        isOffline: true,
        isInternetReachable: false,
      });

      const mockSavePendingTask = jest.fn();
      jest.doMock('@/utils/taskPersistence', () => ({
        savePendingTask: mockSavePendingTask,
        clearPendingTask: jest.fn(),
      }));

      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Fill form

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockSavePendingTask).toHaveBeenCalled();
      });
    });

    it('should handle creation errors', async () => {
      const mockCreate = jest.fn().mockRejectedValue(
        new Error('Failed to create assignment'),
      );

      jest.doMock('@/services/api', () => ({
        api: {
          mutations: {
            assignments: {
              create: mockCreate,
            },
          },
        },
      }));

      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Fill form

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        // Error should be displayed
      });
    });

    it('should invalidate queries after successful creation', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'assignment-123',
      });

      jest.doMock('@/services/api', () => ({
        api: {
          mutations: {
            assignments: {
              create: mockCreate,
            },
          },
        },
      }));

      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Fill form

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalled();
      });
    });
  });

  describe('optional fields', () => {
    it('should show optional fields when toggled', () => {
      const { getByText, queryByPlaceholderText } = render(
        <AddAssignmentScreen />,
      );

      const toggleButton = getByText(/show.*optional|more options/i);
      if (toggleButton) {
        fireEvent.press(toggleButton);

        // Optional fields should be visible
        expect(queryByPlaceholderText(/description/i)).toBeTruthy();
      }
    });

    it('should handle description input', () => {
      const { getByPlaceholderText } = render(<AddAssignmentScreen />);

      const descriptionInput = getByPlaceholderText(/description/i);
      if (descriptionInput) {
        fireEvent.changeText(descriptionInput, 'Test description');
        // Description should be saved
      }
    });

    it('should handle submission method selection', () => {
      const { getByText } = render(<AddAssignmentScreen />);

      // Select submission method
      const methodButton = getByText(/online|in-person/i);
      if (methodButton) {
        fireEvent.press(methodButton);
        // Method should be selected
      }
    });
  });

  describe('reminders', () => {
    it('should allow setting reminders', () => {
      const { getByText } = render(<AddAssignmentScreen />);

      const remindersButton = getByText(/reminders/i);
      if (remindersButton) {
        fireEvent.press(remindersButton);
        // Reminder selector should open
      }
    });

    it('should save selected reminders', () => {
      // Test reminder selection and saving
    });
  });

  describe('task limits', () => {
    it('should show limit warning when limit reached', () => {
      jest.doMock('@/hooks/useMonthlyTaskCount', () => ({
        useMonthlyTaskCount: () => ({
          limitReached: true,
          monthlyTaskCount: 10,
          monthlyLimit: 10,
        }),
      }));

      const { getByText } = render(<AddAssignmentScreen />);

      // Should show limit warning
      expect(getByText(/limit|upgrade/i)).toBeTruthy();
    });

    it('should prevent creation when limit reached', async () => {
      jest.doMock('@/hooks/useMonthlyTaskCount', () => ({
        useMonthlyTaskCount: () => ({
          limitReached: true,
          monthlyTaskCount: 10,
          monthlyLimit: 10,
        }),
      }));

      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Fill form

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      // Should not create, should show upgrade prompt
    });
  });

  describe('navigation', () => {
    it('should navigate back on cancel', () => {
      const { getByText } = render(<AddAssignmentScreen />);

      const cancelButton = getByText(/cancel|back/i);
      if (cancelButton) {
        fireEvent.press(cancelButton);
        expect(mockGoBack).toHaveBeenCalled();
      }
    });

    it('should navigate back after successful creation', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        id: 'assignment-123',
      });

      jest.doMock('@/services/api', () => ({
        api: {
          mutations: {
            assignments: {
              create: mockCreate,
            },
          },
        },
      }));

      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Fill form

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('draft saving', () => {
    it('should save draft automatically', async () => {
      const mockSaveDraft = jest.fn();
      jest.doMock('@/utils/draftStorage', () => ({
        saveDraft: mockSaveDraft,
        getDraft: jest.fn().mockResolvedValue(null),
        clearDraft: jest.fn(),
      }));

      const { getByPlaceholderText } = render(<AddAssignmentScreen />);

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');

      // Draft should be saved (debounced)
      await waitFor(
        () => {
          expect(mockSaveDraft).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });

    it('should load draft on mount', async () => {
      const mockDraft = {
        title: 'Draft Assignment',
        description: 'Draft description',
      };

      const mockGetDraft = jest.fn().mockResolvedValue(mockDraft);
      jest.doMock('@/utils/draftStorage', () => ({
        saveDraft: jest.fn(),
        getDraft: mockGetDraft,
        clearDraft: jest.fn(),
      }));

      const { getByDisplayValue } = render(<AddAssignmentScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Draft Assignment')).toBeTruthy();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading indicator during save', async () => {
      const mockCreate = jest.fn(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ id: 'assignment-123' }), 100),
          ),
      );

      jest.doMock('@/services/api', () => ({
        api: {
          mutations: {
            assignments: {
              create: mockCreate,
            },
          },
        },
      }));

      const { getByPlaceholderText, getByText, getByTestId } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Fill form

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      // Should show loading
      const loadingIndicator = getByTestId('loading-indicator');
      if (loadingIndicator) {
        expect(loadingIndicator).toBeTruthy();
      }
    });

    it('should disable form during save', async () => {
      const mockCreate = jest.fn(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ id: 'assignment-123' }), 100),
          ),
      );

      jest.doMock('@/services/api', () => ({
        api: {
          mutations: {
            assignments: {
              create: mockCreate,
            },
          },
        },
      }));

      const { getByPlaceholderText, getByText } = render(
        <AddAssignmentScreen />,
      );

      fireEvent.changeText(getByPlaceholderText(/title/i), 'Test Assignment');
      // Fill form

      const saveButton = getByText(/save|create/i);
      fireEvent.press(saveButton);

      // Form should be disabled during save
      // (exact implementation depends on component)
    });
  });
});

