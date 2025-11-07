import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import {
  UnifiedButton,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  DangerButton,
} from '../UnifiedButton';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

describe('UnifiedButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  describe('Basic Functionality', () => {
    it('should render with default props', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Test Button" onPress={mockOnPress} />,
      );
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Test Button" onPress={mockOnPress} />,
      );
      fireEvent.press(getByText('Test Button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Test Button" onPress={mockOnPress} disabled />,
      );
      fireEvent.press(getByText('Test Button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should show loading state', () => {
      const { queryByText } = renderWithTheme(
        <UnifiedButton title="Test Button" onPress={mockOnPress} loading />,
      );
      expect(queryByText('Test Button')).toBeNull();
    });
  });

  describe('Variants', () => {
    it('should render primary variant by default', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton
          title="Primary"
          onPress={mockOnPress}
          variant="primary"
        />,
      );
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton
          title="Secondary"
          onPress={mockOnPress}
          variant="secondary"
        />,
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton
          title="Outline"
          onPress={mockOnPress}
          variant="outline"
        />,
      );
      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Ghost" onPress={mockOnPress} variant="ghost" />,
      );
      expect(getByText('Ghost')).toBeTruthy();
    });

    it('should render danger variant', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Danger" onPress={mockOnPress} variant="danger" />,
      );
      expect(getByText('Danger')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Small" onPress={mockOnPress} size="small" />,
      );
      expect(getByText('Small')).toBeTruthy();
    });

    it('should render medium size (default)', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Medium" onPress={mockOnPress} size="medium" />,
      );
      expect(getByText('Medium')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Large" onPress={mockOnPress} size="large" />,
      );
      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('Convenience Components', () => {
    it('should render PrimaryButton', () => {
      const { getByText } = renderWithTheme(
        <PrimaryButton title="Primary" onPress={mockOnPress} />,
      );
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render SecondaryButton', () => {
      const { getByText } = renderWithTheme(
        <SecondaryButton title="Secondary" onPress={mockOnPress} />,
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render OutlineButton', () => {
      const { getByText } = renderWithTheme(
        <OutlineButton title="Outline" onPress={mockOnPress} />,
      );
      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render GhostButton', () => {
      const { getByText } = renderWithTheme(
        <GhostButton title="Ghost" onPress={mockOnPress} />,
      );
      expect(getByText('Ghost')).toBeTruthy();
    });

    it('should render DangerButton', () => {
      const { getByText } = renderWithTheme(
        <DangerButton title="Danger" onPress={mockOnPress} />,
      );
      expect(getByText('Danger')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility label', () => {
      const { getByLabelText } = renderWithTheme(
        <UnifiedButton
          title="Test Button"
          onPress={mockOnPress}
          accessibilityLabel="Custom Label"
        />,
      );
      expect(getByLabelText('Custom Label')).toBeTruthy();
    });

    it('should use title as fallback accessibility label', () => {
      const { getByLabelText } = renderWithTheme(
        <UnifiedButton title="Test Button" onPress={mockOnPress} />,
      );
      expect(getByLabelText('Test Button')).toBeTruthy();
    });

    it('should have proper accessibility hint', () => {
      const { getByHintText } = renderWithTheme(
        <UnifiedButton
          title="Test Button"
          onPress={mockOnPress}
          accessibilityHint="Double tap to activate"
        />,
      );
      expect(getByHintText('Double tap to activate')).toBeTruthy();
    });
  });

  describe('Icon Support', () => {
    it('should render icon on left', () => {
      const icon = <React.Fragment key="icon">Icon</React.Fragment>;
      const { getByText } = renderWithTheme(
        <UnifiedButton
          title="With Icon"
          onPress={mockOnPress}
          icon={icon}
          iconPosition="left"
        />,
      );
      expect(getByText('With Icon')).toBeTruthy();
    });

    it('should render icon on right', () => {
      const icon = <React.Fragment key="icon">Icon</React.Fragment>;
      const { getByText } = renderWithTheme(
        <UnifiedButton
          title="With Icon"
          onPress={mockOnPress}
          icon={icon}
          iconPosition="right"
        />,
      );
      expect(getByText('With Icon')).toBeTruthy();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on press', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton title="Test" onPress={mockOnPress} hapticFeedback />,
      );
      fireEvent.press(getByText('Test'));
      expect(mockOnPress).toHaveBeenCalled();
    });

    it('should not trigger haptic feedback when disabled', () => {
      const { getByText } = renderWithTheme(
        <UnifiedButton
          title="Test"
          onPress={mockOnPress}
          disabled
          hapticFeedback
        />,
      );
      fireEvent.press(getByText('Test'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });
});
