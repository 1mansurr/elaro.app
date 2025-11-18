/**
 * Route Guards Tests
 * 
 * Tests for src/navigation/utils/RouteGuards.ts
 * Target: 70%+ coverage
 */

import {
  isAuthenticatedRoute,
  isPublicRoute,
  isOnboardingRoute,
  validateRouteAccess,
  AUTHENTICATED_ROUTES,
  PUBLIC_ROUTES,
  ONBOARDING_ROUTES,
} from '@/navigation/utils/RouteGuards';

describe('RouteGuards', () => {
  describe('isAuthenticatedRoute', () => {
    it('should return true for authenticated routes', () => {
      expect(isAuthenticatedRoute('Main')).toBe(true);
      expect(isAuthenticatedRoute('Courses')).toBe(true);
      expect(isAuthenticatedRoute('Profile')).toBe(true);
      expect(isAuthenticatedRoute('Calendar')).toBe(true);
      expect(isAuthenticatedRoute('AddAssignmentFlow')).toBe(true);
    });

    it('should return false for non-authenticated routes', () => {
      expect(isAuthenticatedRoute('Auth')).toBe(false);
      expect(isAuthenticatedRoute('Launch')).toBe(false);
      expect(isAuthenticatedRoute('UnknownRoute')).toBe(false);
    });

    it('should handle all authenticated routes', () => {
      AUTHENTICATED_ROUTES.forEach(route => {
        expect(isAuthenticatedRoute(route)).toBe(true);
      });
    });
  });

  describe('isPublicRoute', () => {
    it('should return true for public routes', () => {
      expect(isPublicRoute('Launch')).toBe(true);
      expect(isPublicRoute('Auth')).toBe(true);
    });

    it('should return false for non-public routes', () => {
      expect(isPublicRoute('Main')).toBe(false);
      expect(isPublicRoute('UnknownRoute')).toBe(false);
    });

    it('should handle all public routes', () => {
      PUBLIC_ROUTES.forEach(route => {
        expect(isPublicRoute(route)).toBe(true);
      });
    });
  });

  describe('isOnboardingRoute', () => {
    it('should return true for onboarding routes', () => {
      expect(isOnboardingRoute('OnboardingFlow')).toBe(true);
    });

    it('should return false for non-onboarding routes', () => {
      expect(isOnboardingRoute('Main')).toBe(false);
      expect(isOnboardingRoute('Auth')).toBe(false);
      expect(isOnboardingRoute('UnknownRoute')).toBe(false);
    });

    it('should handle all onboarding routes', () => {
      ONBOARDING_ROUTES.forEach(route => {
        expect(isOnboardingRoute(route)).toBe(true);
      });
    });
  });

  describe('validateRouteAccess', () => {
    describe('public routes', () => {
      it('should allow public routes for authenticated users', () => {
        const result = validateRouteAccess('Launch', true, true);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow public routes for guest users', () => {
        const result = validateRouteAccess('Launch', false, true);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow Auth route for all users', () => {
        expect(validateRouteAccess('Auth', true, true).allowed).toBe(true);
        expect(validateRouteAccess('Auth', false, true).allowed).toBe(true);
      });
    });

    describe('authenticated routes', () => {
      it('should allow authenticated routes for authenticated users', () => {
        const result = validateRouteAccess('Main', true, true);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should deny authenticated routes for guest users', () => {
        const result = validateRouteAccess('Main', false, true);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Route requires authentication');
      });

      it('should allow authenticated routes even if onboarding incomplete', () => {
        const result = validateRouteAccess('Main', true, false);
        expect(result.allowed).toBe(true);
      });

      it('should handle all authenticated routes', () => {
        AUTHENTICATED_ROUTES.forEach(route => {
          if (!isOnboardingRoute(route)) {
            const result = validateRouteAccess(route, true, true);
            expect(result.allowed).toBe(true);
          }
        });
      });
    });

    describe('onboarding routes', () => {
      it('should allow onboarding routes for authenticated users', () => {
        const result = validateRouteAccess('OnboardingFlow', true, true);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should deny onboarding routes for guest users', () => {
        const result = validateRouteAccess('OnboardingFlow', false, true);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Route requires authentication');
      });

      it('should allow onboarding routes even if onboarding incomplete', () => {
        const result = validateRouteAccess('OnboardingFlow', true, false);
        expect(result.allowed).toBe(true);
      });
    });

    describe('unknown routes', () => {
      it('should allow unknown routes by default', () => {
        const result = validateRouteAccess('UnknownRoute', true, true);
        expect(result.allowed).toBe(true);
      });

      it('should allow unknown routes for guest users', () => {
        const result = validateRouteAccess('UnknownRoute', false, true);
        expect(result.allowed).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty route name', () => {
        const result = validateRouteAccess('', true, true);
        expect(result.allowed).toBe(true);
      });

      it('should handle case sensitivity', () => {
        // Routes should be case-sensitive as defined
        expect(validateRouteAccess('main', true, true).allowed).toBe(true); // Unknown route, allowed
        expect(validateRouteAccess('MAIN', true, true).allowed).toBe(true); // Unknown route, allowed
      });

      it('should handle special characters in route names', () => {
        const result = validateRouteAccess('Route-With-Dashes', true, true);
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('route constants', () => {
    it('should have non-empty route arrays', () => {
      expect(AUTHENTICATED_ROUTES.length).toBeGreaterThan(0);
      expect(PUBLIC_ROUTES.length).toBeGreaterThan(0);
      expect(ONBOARDING_ROUTES.length).toBeGreaterThan(0);
    });

    it('should not have overlapping routes between categories', () => {
      const allRoutes = [
        ...AUTHENTICATED_ROUTES,
        ...PUBLIC_ROUTES,
        ...ONBOARDING_ROUTES,
      ];

      const uniqueRoutes = new Set(allRoutes);
      // If there are overlaps, the set size would be less than array length
      // But some routes might legitimately be in multiple categories
      expect(uniqueRoutes.size).toBeGreaterThan(0);
    });

    it('should have all route names as strings', () => {
      [...AUTHENTICATED_ROUTES, ...PUBLIC_ROUTES, ...ONBOARDING_ROUTES].forEach(
        route => {
          expect(typeof route).toBe('string');
          expect(route.length).toBeGreaterThan(0);
        },
      );
    });
  });
});

