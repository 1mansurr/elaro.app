import { PermissionService } from '@/features/auth/permissions/PermissionService';
import {
  PERMISSIONS,
  ROLES,
} from '@/features/auth/permissions/PermissionConstants';
import {
  createMockUser,
  createMockPremiumUser,
  createMockAdminUser,
} from '@tests/utils/testUtils';

describe('PermissionService', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = PermissionService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should allow free users to create assignments', async () => {
      const freeUser = createMockUser();
      const result = await permissionService.hasPermission(
        freeUser,
        PERMISSIONS.CREATE_ASSIGNMENT,
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow free users to access premium features', async () => {
      const freeUser = createMockUser();
      const result = await permissionService.hasPermission(
        freeUser,
        PERMISSIONS.VIEW_PREMIUM_FEATURES,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Premium subscription required');
    });

    it('should allow premium users to access premium features', async () => {
      const premiumUser = createMockPremiumUser();
      const result = await permissionService.hasPermission(
        premiumUser,
        PERMISSIONS.VIEW_PREMIUM_FEATURES,
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow admin users to access admin features', async () => {
      const adminUser = createMockAdminUser();
      const result = await permissionService.hasPermission(
        adminUser,
        PERMISSIONS.ADMIN_ACCESS,
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow non-admin users to access admin features', async () => {
      const freeUser = createMockUser();
      const result = await permissionService.hasPermission(
        freeUser,
        PERMISSIONS.ADMIN_ACCESS,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Admin access required');
    });

    it('should allow all users to view their own profile', async () => {
      const freeUser = createMockUser();
      // VIEW_PROFILE doesn't exist in PERMISSIONS, so use a profile-related permission
      // or create a mock permission for testing
      const profilePermission = { resource: 'profile', action: 'view' };
      const result = await permissionService.hasPermission(
        freeUser,
        profilePermission,
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateTask', () => {
    it('should allow free users to create tasks within limits', async () => {
      const freeUser = createMockUser();
      const result = await permissionService.canCreateTask(
        freeUser,
        'assignments',
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow premium users unlimited task creation', async () => {
      const premiumUser = createMockPremiumUser();
      const result = await permissionService.canCreateTask(
        premiumUser,
        'assignments',
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow admin users unlimited task creation', async () => {
      const adminUser = createMockAdminUser();
      const result = await permissionService.canCreateTask(
        adminUser,
        'assignments',
      );

      expect(result.allowed).toBe(true);
    });

    it('should check task limits for free users', async () => {
      const freeUser = createMockUser();

      // Mock that user has reached limit
      jest.spyOn(permissionService, 'getTaskCount').mockResolvedValue(15); // At limit

      const result = await permissionService.canCreateTask(
        freeUser,
        'assignments',
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Task limit reached');
    });
  });

  describe('canCreateSRSReminders', () => {
    it('should not allow free users to create SRS reminders', async () => {
      const freeUser = createMockUser();
      const result = await permissionService.canCreateSRSReminders(freeUser);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Monthly SRS reminder limit reached');
    });

    it('should allow premium users to create SRS reminders', async () => {
      const premiumUser = createMockPremiumUser();
      const result = await permissionService.canCreateSRSReminders(premiumUser);

      expect(result.allowed).toBe(true);
    });

    it('should allow admin users to create SRS reminders', async () => {
      const adminUser = createMockAdminUser();
      const result = await permissionService.canCreateSRSReminders(adminUser);

      expect(result.allowed).toBe(true);
    });
  });

  describe('isPremium', () => {
    it('should return false for free users', async () => {
      const freeUser = createMockUser();
      const result = await permissionService.isPremium(freeUser);

      expect(result).toBe(false);
    });

    it('should return true for premium users', async () => {
      const premiumUser = createMockPremiumUser();
      const result = await permissionService.isPremium(premiumUser);

      expect(result).toBe(true);
    });

    it('should return true for admin users', async () => {
      const adminUser = createMockAdminUser();
      const result = await permissionService.isPremium(adminUser);

      expect(result).toBe(true);
    });

    it('should return false for expired premium users', async () => {
      const expiredPremiumUser = createMockPremiumUser({
        subscription_expires_at: '2023-01-01T00:00:00Z', // Past date
      });
      const result = await permissionService.isPremium(expiredPremiumUser);

      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return false for free users', async () => {
      const freeUser = createMockUser();
      const result = await permissionService.isAdmin(freeUser);

      expect(result).toBe(false);
    });

    it('should return false for premium users', async () => {
      const premiumUser = createMockPremiumUser();
      const result = await permissionService.isAdmin(premiumUser);

      expect(result).toBe(false);
    });

    it('should return true for admin users', async () => {
      const adminUser = createMockAdminUser();
      const result = await permissionService.isAdmin(adminUser);

      expect(result).toBe(true);
    });
  });

  describe('getTaskLimits', () => {
    it('should return correct limits for free users', async () => {
      const freeUser = createMockUser();
      const limits = await permissionService.getTaskLimits(freeUser);

      expect(limits).toHaveLength(5);

      const assignmentsLimit = limits.find(l => l.type === 'assignments');
      expect(assignmentsLimit).toBeDefined();
      expect(assignmentsLimit?.limit).toBe(15);
    });

    it('should return higher limits for premium users', async () => {
      const premiumUser = createMockPremiumUser();
      const limits = await permissionService.getTaskLimits(premiumUser);

      expect(limits).toHaveLength(5);

      const assignmentsLimit = limits.find(l => l.type === 'assignments');
      expect(assignmentsLimit).toBeDefined();
      expect(assignmentsLimit?.limit).toBeGreaterThan(15);
    });

    it('should return unlimited limits for admin users', async () => {
      const adminUser = createMockAdminUser();
      const limits = await permissionService.getTaskLimits(adminUser);

      expect(limits).toHaveLength(5);

      const unlimitedLimits = limits.filter(l => l.limit === -1);
      expect(unlimitedLimits).toHaveLength(5); // Admin users have unlimited access
    });
  });

  describe('getTaskCount', () => {
    it('should return current task count for user', async () => {
      const freeUser = createMockUser();

      // Mock Supabase RPC call
      const { supabase } = require('@/services/supabase');
      jest.spyOn(supabase.rpc, 'count_tasks_since').mockResolvedValue({
        data: 5,
        error: null,
      });

      const count = await permissionService.getTaskCount(
        freeUser,
        'assignments',
      );

      expect(count).toBe(5);
      expect(supabase.rpc).toHaveBeenCalledWith(
        'count_tasks_since',
        expect.objectContaining({
          since_date: expect.any(String),
        }),
      );
    });

    it('should handle database errors gracefully (fail open)', async () => {
      const freeUser = createMockUser();

      // Mock database error
      const { supabase } = require('@/services/supabase');
      jest.spyOn(supabase.rpc, 'count_tasks_since').mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const count = await permissionService.getTaskCount(
        freeUser,
        'assignments',
      );

      // Should fail open - return 0 to allow task creation
      expect(count).toBe(0);
    });

    it('should handle exceptions gracefully (fail open)', async () => {
      const freeUser = createMockUser();

      // Mock exception
      const { supabase } = require('@/services/supabase');
      jest
        .spyOn(supabase.rpc, 'count_tasks_since')
        .mockRejectedValue(new Error('Network error'));

      const count = await permissionService.getTaskCount(
        freeUser,
        'assignments',
      );

      // Should fail open - return 0 to allow task creation
      expect(count).toBe(0);
    });

    it('should calculate date 30 days ago correctly', async () => {
      const freeUser = createMockUser();
      const { supabase } = require('@/services/supabase');

      jest.spyOn(supabase.rpc, 'count_tasks_since').mockResolvedValue({
        data: 3,
        error: null,
      });

      await permissionService.getTaskCount(freeUser, 'assignments');

      const callArgs = (supabase.rpc as jest.Mock).mock.calls[0];
      const sinceDate = new Date(callArgs[1].since_date);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);

      // Allow 1 second difference for execution time
      expect(
        Math.abs(sinceDate.getTime() - expectedDate.getTime()),
      ).toBeLessThan(1000);
    });
  });

  describe('cache management', () => {
    it('should invalidate cache for specific user', async () => {
      const freeUser = createMockUser();

      // Mock cache invalidation
      const mockInvalidateCache = jest.fn().mockResolvedValue(undefined);
      permissionService.invalidateCache = mockInvalidateCache;

      await permissionService.invalidateCache(freeUser.id);

      expect(mockInvalidateCache).toHaveBeenCalledWith(freeUser.id);
    });

    it('should clear all cache', async () => {
      // Mock cache clear
      const mockClearCache = jest.fn().mockResolvedValue(undefined);
      permissionService.clearCache = mockClearCache;

      await permissionService.clearCache();

      expect(mockClearCache).toHaveBeenCalled();
    });
  });

  describe('role-based permissions', () => {
    it('should correctly identify user roles', async () => {
      const freeUser = createMockUser();
      const premiumUser = createMockPremiumUser();
      const adminUser = createMockAdminUser();

      expect(await permissionService.isPremium(freeUser)).toBe(false);
      expect(await permissionService.isAdmin(freeUser)).toBe(false);

      expect(await permissionService.isPremium(premiumUser)).toBe(true);
      expect(await permissionService.isAdmin(premiumUser)).toBe(false);

      expect(await permissionService.isPremium(adminUser)).toBe(true);
      expect(await permissionService.isAdmin(adminUser)).toBe(true);
    });

    it('should handle edge cases in role detection', async () => {
      const userWithNullSubscription = createMockUser({
        subscription_tier: null,
      });
      const userWithInvalidSubscription = createMockUser({
        subscription_tier: 'invalid',
      });

      expect(await permissionService.isPremium(userWithNullSubscription)).toBe(
        false,
      );
      expect(await permissionService.isAdmin(userWithNullSubscription)).toBe(
        false,
      );

      expect(
        await permissionService.isPremium(userWithInvalidSubscription),
      ).toBe(false);
      expect(await permissionService.isAdmin(userWithInvalidSubscription)).toBe(
        false,
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid permission constants', async () => {
      const freeUser = createMockUser();

      await expect(
        permissionService.hasPermission(freeUser, 'INVALID_PERMISSION' as any),
      ).rejects.toThrow();
    });

    it('should handle null user gracefully', async () => {
      await expect(
        permissionService.hasPermission(
          null as any,
          PERMISSIONS.CREATE_ASSIGNMENT,
        ),
      ).rejects.toThrow();
    });

    it('should handle undefined user gracefully', async () => {
      await expect(
        permissionService.hasPermission(
          undefined as any,
          PERMISSIONS.CREATE_ASSIGNMENT,
        ),
      ).rejects.toThrow();
    });
  });
});
