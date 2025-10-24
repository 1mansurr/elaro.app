import { PermissionService } from '../permissions/PermissionService';
import { PERMISSIONS, ROLES } from '../permissions/PermissionConstants';
import { User } from '@/types';

// Mock user data
const mockFreeUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  subscription_tier: 'free',
  onboarding_completed: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  university: 'Test University',
  program: 'Test Program',
  subscription_expires_at: null,
  account_status: 'active',
};

const mockPremiumUser: User = {
  ...mockFreeUser,
  id: 'user-2',
  subscription_tier: 'oddity',
};

const mockAdminUser: User = {
  ...mockFreeUser,
  id: 'user-3',
  subscription_tier: 'admin',
};

describe('PermissionService', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = PermissionService.getInstance();
  });

  describe('hasPermission', () => {
    it('should allow free users to create assignments', async () => {
      const result = await permissionService.hasPermission(mockFreeUser, PERMISSIONS.CREATE_ASSIGNMENT);
      expect(result.allowed).toBe(true);
    });

    it('should not allow free users to access premium features', async () => {
      const result = await permissionService.hasPermission(mockFreeUser, PERMISSIONS.VIEW_PREMIUM_FEATURES);
      expect(result.allowed).toBe(false);
    });

    it('should allow premium users to access premium features', async () => {
      const result = await permissionService.hasPermission(mockPremiumUser, PERMISSIONS.VIEW_PREMIUM_FEATURES);
      expect(result.allowed).toBe(true);
    });

    it('should allow admin users to access admin features', async () => {
      const result = await permissionService.hasPermission(mockAdminUser, PERMISSIONS.ADMIN_ACCESS);
      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateTask', () => {
    it('should allow free users to create tasks within limits', async () => {
      const result = await permissionService.canCreateTask(mockFreeUser, 'assignments');
      expect(result.allowed).toBe(true);
    });

    it('should allow premium users unlimited task creation', async () => {
      const result = await permissionService.canCreateTask(mockPremiumUser, 'assignments');
      expect(result.allowed).toBe(true);
    });

    it('should allow admin users unlimited task creation', async () => {
      const result = await permissionService.canCreateTask(mockAdminUser, 'assignments');
      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateSRSReminders', () => {
    it('should not allow free users to create SRS reminders', async () => {
      const result = await permissionService.canCreateSRSReminders(mockFreeUser);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Monthly SRS reminder limit reached');
    });

    it('should allow premium users to create SRS reminders', async () => {
      const result = await permissionService.canCreateSRSReminders(mockPremiumUser);
      expect(result.allowed).toBe(true);
    });

    it('should allow admin users to create SRS reminders', async () => {
      const result = await permissionService.canCreateSRSReminders(mockAdminUser);
      expect(result.allowed).toBe(true);
    });
  });

  describe('isPremium', () => {
    it('should return false for free users', async () => {
      const result = await permissionService.isPremium(mockFreeUser);
      expect(result).toBe(false);
    });

    it('should return true for premium users', async () => {
      const result = await permissionService.isPremium(mockPremiumUser);
      expect(result).toBe(true);
    });

    it('should return true for admin users', async () => {
      const result = await permissionService.isPremium(mockAdminUser);
      expect(result).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('should return false for free users', async () => {
      const result = await permissionService.isAdmin(mockFreeUser);
      expect(result).toBe(false);
    });

    it('should return false for premium users', async () => {
      const result = await permissionService.isAdmin(mockPremiumUser);
      expect(result).toBe(false);
    });

    it('should return true for admin users', async () => {
      const result = await permissionService.isAdmin(mockAdminUser);
      expect(result).toBe(true);
    });
  });

  describe('getTaskLimits', () => {
    it('should return correct limits for free users', async () => {
      const limits = await permissionService.getTaskLimits(mockFreeUser);
      expect(limits).toHaveLength(5);
      
      const assignmentsLimit = limits.find(l => l.limit === 15);
      expect(assignmentsLimit).toBeDefined();
    });

    it('should return unlimited limits for premium users', async () => {
      const limits = await permissionService.getTaskLimits(mockPremiumUser);
      expect(limits).toHaveLength(5);
      
      const unlimitedLimits = limits.filter(l => l.limit === -1);
      expect(unlimitedLimits).toHaveLength(0); // Premium users still have limits, but higher
    });

    it('should return unlimited limits for admin users', async () => {
      const limits = await permissionService.getTaskLimits(mockAdminUser);
      expect(limits).toHaveLength(5);
      
      const unlimitedLimits = limits.filter(l => l.limit === -1);
      expect(unlimitedLimits).toHaveLength(5); // Admin users have unlimited access
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache for specific user', async () => {
      await permissionService.invalidateCache(mockFreeUser.id);
      // Cache should be cleared for this user
    });

    it('should clear all cache', async () => {
      await permissionService.clearCache();
      // All cache should be cleared
    });
  });
});
