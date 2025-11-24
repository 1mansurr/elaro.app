// Mock for contexts
export const useAuth = () => ({
  user: {
    id: 'test-user-id',
    username: 'testuser',
    first_name: 'Test',
    subscription_tier: 'free',
    subscription_status: 'active',
  },
  session: { user: { id: 'test-user-id' } },
  refreshUser: jest.fn(),
});

export const useTheme = () => ({
  theme: 'light',
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
  },
});

export const useToast = () => ({
  showToast: jest.fn(),
});
