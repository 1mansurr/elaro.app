import { NavigationValidation } from '@/navigation/utils/SafeNavigation';

/**
 * Route Registration Validation Tests
 *
 * These tests ensure that all critical navigation routes are properly registered
 * in the navigation system. This is important for runtime navigation validation.
 */
describe('Route Registration Validation', () => {
  describe('Critical Study Flow Routes', () => {
    it('should have StudySessionReview registered', () => {
      expect(NavigationValidation.isValidRoute('StudySessionReview')).toBe(
        true,
      );
    });

    it('should have StudyResult registered', () => {
      expect(NavigationValidation.isValidRoute('StudyResult')).toBe(true);
    });
  });

  describe('Subscription Flow Routes', () => {
    it('should have PaywallScreen registered', () => {
      expect(NavigationValidation.isValidRoute('PaywallScreen')).toBe(true);
    });

    it('should have OddityWelcomeScreen registered', () => {
      expect(NavigationValidation.isValidRoute('OddityWelcomeScreen')).toBe(
        true,
      );
    });
  });

  describe('Deprecated Routes Cleanup', () => {
    it('should not have TaskCreationFlow registered (should be removed)', () => {
      expect(NavigationValidation.isValidRoute('TaskCreationFlow')).toBe(false);
    });
  });

  describe('All New Routes Registered', () => {
    it('should validate all routes from navigation audit are registered', () => {
      const requiredRoutes = [
        'StudySessionReview',
        'PaywallScreen',
        'OddityWelcomeScreen',
      ];

      requiredRoutes.forEach(route => {
        expect(NavigationValidation.isValidRoute(route)).toBe(true);
      });
    });
  });
});
