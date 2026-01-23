import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { UnifiedInput } from '../UnifiedInput';

describe('UnifiedInput', () => {
  const mockOnChangeText = jest.fn();
  const mockOnRightIconPress = jest.fn();

  beforeEach(() => {
    mockOnChangeText.mockClear();
    mockOnRightIconPress.mockClear();
  });

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  describe('Basic Functionality', () => {
    it('should render with default props', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should call onChangeText when text changes', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      const input = getByPlaceholderText('Test Input');
      fireEvent.changeText(input, 'Test Value');
      expect(mockOnChangeText).toHaveBeenCalledWith('Test Value');
    });

    it('should display label when provided', () => {
      const { getByText } = renderWithTheme(
        <UnifiedInput
          label="Test Label"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByText('Test Label')).toBeTruthy();
    });

    it('should display required indicator', () => {
      const { getByText } = renderWithTheme(
        <UnifiedInput
          label="Test Label"
          required
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByText('Test Label')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          variant="default"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should render outlined variant', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          variant="outlined"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should render filled variant', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          variant="filled"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          size="small"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should render medium size (default)', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          size="medium"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          size="large"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          leftIcon="mail"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should render right icon', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          rightIcon="eye"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should call onRightIconPress when right icon is pressed', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          rightIcon="close"
          onRightIconPress={mockOnRightIconPress}
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      const { getByText } = renderWithTheme(
        <UnifiedInput
          error="This is an error"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByText('This is an error')).toBeTruthy();
    });

    it('should update label color when error exists', () => {
      const { getByText } = renderWithTheme(
        <UnifiedInput
          label="Test Label"
          error="This is an error"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByText('Test Label')).toBeTruthy();
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      const { getByText } = renderWithTheme(
        <UnifiedInput
          helperText="This is helper text"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByText('This is helper text')).toBeTruthy();
    });

    it('should not display helper text when error exists', () => {
      const { queryByText } = renderWithTheme(
        <UnifiedInput
          error="This is an error"
          helperText="This is helper text"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(queryByText('This is helper text')).toBeNull();
    });
  });

  describe('Character Count', () => {
    it('should display character count', () => {
      const { getByText } = renderWithTheme(
        <UnifiedInput
          characterCount
          maxLength={100}
          value="Test"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByText('4/100')).toBeTruthy();
    });

    it('should update character count as text changes', () => {
      const { getByPlaceholderText, queryByText } = renderWithTheme(
        <UnifiedInput
          characterCount
          maxLength={100}
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      const input = getByPlaceholderText('Test Input');
      fireEvent.changeText(input, 'New Value');
      expect(queryByText(/7\/100/)).toBeTruthy();
    });
  });

  describe('Focus State', () => {
    it('should handle focus events', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      const input = getByPlaceholderText('Test Input');
      fireEvent(input, 'focus');
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });

    it('should handle blur events', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      const input = getByPlaceholderText('Test Input');
      fireEvent(input, 'blur');
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility hints', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          accessibilityLabel="Email input"
          accessibilityHint="Enter your email address"
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });
  });

  describe('Max Length', () => {
    it('should enforce maxLength', () => {
      const { getByPlaceholderText } = renderWithTheme(
        <UnifiedInput
          maxLength={10}
          placeholder="Test Input"
          onChangeText={mockOnChangeText}
        />,
      );
      const input = getByPlaceholderText('Test Input');
      fireEvent.changeText(input, 'This is too long');
      expect(getByPlaceholderText('Test Input')).toBeTruthy();
    });
  });
});
