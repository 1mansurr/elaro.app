import { renderHook } from '@testing-library/react-native';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Mock AuthContext properly
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useAuth } from '@/contexts/AuthContext';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useOnboardingStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return onboarding status from user', () => {
    mockUseAuth.mockReturnValue({
      user: { onboarding_completed: true } as any,
      session: null,
      loading: false,
    } as any);

    const { result } = renderHook(() => useOnboardingStatus());

    expect(result.current.isOnboardingComplete).toBe(true);
    expect(result.current.needsOnboarding).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle null user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
    } as any);

    const { result } = renderHook(() => useOnboardingStatus());

    expect(result.current.isOnboardingComplete).toBe(false);
    expect(result.current.needsOnboarding).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should detect when onboarding is needed', () => {
    mockUseAuth.mockReturnValue({
      user: { onboarding_completed: false } as any,
      session: {} as any,
      loading: false,
    } as any);

    const { result } = renderHook(() => useOnboardingStatus());

    expect(result.current.needsOnboarding).toBe(true);
    expect(result.current.isOnboardingComplete).toBe(false);
  });

  it('should handle loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
    } as any);

    const { result } = renderHook(() => useOnboardingStatus());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return user object', () => {
    const mockUser = { id: 'user-1', onboarding_completed: true };
    mockUseAuth.mockReturnValue({
      user: mockUser as any,
      session: {} as any,
      loading: false,
    } as any);

    const { result } = renderHook(() => useOnboardingStatus());

    expect(result.current.user).toBe(mockUser);
  });
});
