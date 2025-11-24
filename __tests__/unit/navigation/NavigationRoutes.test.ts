import { RootStackParamList } from '@/types/navigation';
import { NavigationValidation } from '@/navigation/utils/SafeNavigation';

describe('Navigation Routes Validation', () => {
  describe('StudySessionReview Route', () => {
    it('should be a valid route in RootStackParamList', () => {
      const routeName = 'StudySessionReview';
      expect(NavigationValidation.isValidRoute(routeName)).toBe(true);
    });

    it('should accept sessionId parameter', () => {
      const validParams: RootStackParamList['StudySessionReview'] = {
        sessionId: 'test-session-123',
      };
      expect(validParams.sessionId).toBeDefined();
      expect(validParams.sessionId).toBe('test-session-123');
    });

    it('should require sessionId parameter (TypeScript validation)', () => {
      // TypeScript should catch this at compile time
      // This test ensures the type is properly defined
      const validParams: RootStackParamList['StudySessionReview'] = {
        sessionId: 'required-session-id',
      };
      expect(typeof validParams.sessionId).toBe('string');
    });
  });

  describe('PaywallScreen Route', () => {
    it('should be a valid route in RootStackParamList', () => {
      const routeName = 'PaywallScreen';
      expect(NavigationValidation.isValidRoute(routeName)).toBe(true);
    });

    it('should accept optional variant parameter', () => {
      const paramsWithVariant: RootStackParamList['PaywallScreen'] = {
        variant: 'locked',
        lockedContent: 'Premium feature',
      };
      expect(paramsWithVariant.variant).toBe('locked');
      expect(paramsWithVariant.lockedContent).toBe('Premium feature');
    });

    it('should accept variant only', () => {
      const paramsVariantOnly: RootStackParamList['PaywallScreen'] = {
        variant: 'general',
      };
      expect(paramsVariantOnly.variant).toBe('general');
    });

    it('should accept undefined params', () => {
      const paramsUndefined: RootStackParamList['PaywallScreen'] = undefined;
      expect(paramsUndefined).toBeUndefined();
    });

    it('should accept empty object when undefined', () => {
      // This tests that navigation can be called without params
      const params: RootStackParamList['PaywallScreen'] = undefined;
      expect(params).toBeUndefined();
    });
  });

  describe('OddityWelcomeScreen Route', () => {
    it('should be a valid route in RootStackParamList', () => {
      const routeName = 'OddityWelcomeScreen';
      expect(NavigationValidation.isValidRoute(routeName)).toBe(true);
    });

    it('should accept variant parameter', () => {
      const validParams: RootStackParamList['OddityWelcomeScreen'] = {
        variant: 'trial-early',
      };
      expect(validParams.variant).toBe('trial-early');
    });

    it('should accept all valid variant types', () => {
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
        const params: RootStackParamList['OddityWelcomeScreen'] = { variant };
        expect(params.variant).toBe(variant);
      });
    });
  });

  describe('Route Type Safety', () => {
    it('should validate all three routes exist in NavigationValidation', () => {
      const routes = [
        'StudySessionReview',
        'PaywallScreen',
        'OddityWelcomeScreen',
      ];

      routes.forEach(route => {
        expect(NavigationValidation.isValidRoute(route)).toBe(true);
      });
    });

    it('should reject invalid route names', () => {
      const invalidRoutes = [
        'InvalidRoute',
        'NonExistentScreen',
        'OldTaskCreationFlow',
      ];

      invalidRoutes.forEach(route => {
        expect(NavigationValidation.isValidRoute(route)).toBe(false);
      });
    });
  });
});
