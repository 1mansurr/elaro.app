import { PermissionService } from './PermissionService';
import { PERMISSIONS, type Permission } from './PermissionConstants';
import type { User } from '@/types';

type NavigateFn = (route: string, params?: any) => void;

export async function ensurePermissionOrPaywall(
  user: User | null,
  permission: Permission,
  navigate: NavigateFn,
  paywallParams?: { variant?: 'locked' | 'general'; lockedContent?: string },
): Promise<boolean> {
  if (!user) {
    navigate('Auth', { mode: 'signin' });
    return false;
  }
  const svc = PermissionService.getInstance();
  const result = await svc.hasPermission(user, permission);
  if (!result.allowed) {
    navigate('PaywallScreen', paywallParams ?? { variant: 'locked' });
    return false;
  }
  return true;
}

export function requirePremium(navigate: NavigateFn, user: User | null) {
  return ensurePermissionOrPaywall(
    user,
    PERMISSIONS.VIEW_PREMIUM_FEATURES,
    navigate,
    { variant: 'locked' },
  );
}

export function requireAdmin(navigate: NavigateFn, user: User | null) {
  return ensurePermissionOrPaywall(user, PERMISSIONS.ADMIN_ACCESS, navigate);
}
