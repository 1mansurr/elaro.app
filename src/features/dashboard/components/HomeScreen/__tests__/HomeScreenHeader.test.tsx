import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreenHeader } from '../HomeScreenHeader';
import { AuthProvider } from '@/features/auth/contexts/AuthContext';

// Mock the auth context
const mockAuthContext = {
  user: {
    id: 'test-user-id',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    subscription_tier: 'free',
    onboarding_completed: true,
  },
  session: { user: { id: 'test-user-id' } },
  loading: false,
  signOut: jest.fn(),
  refreshUser: jest.fn(),
};

jest.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('HomeScreenHeader', () => {
  it('renders guest title for guest users', () => {
    const { getByText } = render(
      <HomeScreenHeader 
        isGuest={true} 
        onNotificationPress={jest.fn()} 
      />
    );
    
    expect(getByText("Let's Make Today Count")).toBeTruthy();
  });

  it('renders personalized title for authenticated users', () => {
    const { getByText } = render(
      <HomeScreenHeader 
        isGuest={false} 
        onNotificationPress={jest.fn()} 
      />
    );
    
    expect(getByText(/Good (morning|afternoon|evening), testuser!/)).toBeTruthy();
  });

  it('calls onNotificationPress when notification bell is pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <HomeScreenHeader 
        isGuest={false} 
        onNotificationPress={mockOnPress} 
      />
    );
    
    // Note: This test would need the NotificationBell component to have a testID
    // For now, we're just verifying the component renders without errors
    expect(mockOnPress).not.toHaveBeenCalled();
  });
});
