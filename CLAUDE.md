# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

ELARO is a React Native academic co-pilot app (iOS/Android/Web) for intelligent study planning and spaced repetition. Built with Expo SDK 52, React Native 0.76.9, and Supabase as the backend.

## Common Commands

```bash
# Development
npx expo start               # Start Expo dev server
npx expo start --ios         # iOS simulator
npx expo start --android     # Android emulator

# Code quality
npm run lint                 # ESLint check
npm run format               # Prettier format
npx tsc --noEmit             # TypeScript check (or npm run lint:typecheck)

# Tests
npm test                     # All Jest tests
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
npm run test:critical        # Auth/RLS/security tests (bail on first failure)

# E2E (Detox)
npm run e2e:build:ios && npm run e2e:test:ios
npm run e2e:test:lecture     # Feature-specific E2E
npm run e2e:test:calendar

# Build
npm run build:ios            # EAS production iOS build
npm run build:android        # EAS production Android build
```

### Running a single test file

```bash
npx jest path/to/file.test.ts
npx jest --testNamePattern="test name"
```

## Architecture

### Feature-Based Structure

Code lives in `src/features/` organized by domain (auth, assignments, calendar, courses, dashboard, lectures, notifications, onboarding, settings, srs, studySessions, subscription, task-creation, tasks, templates, user-profile). Each feature exposes its public API through an `index.ts`.

Shared cross-feature code lives in `src/shared/` (components, hooks, services).

### State Management

- **Server state:** React Query (`@tanstack/react-query`) for all Supabase data fetching
- **Global UI state:** React Context (`src/contexts/`)
- **Auth state:** Managed in `App.tsx` via Supabase auth listeners

### Navigation

React Navigation v6. Main entry: `src/navigation/AppNavigator.tsx`. Auth vs. authenticated split handled by `src/navigation/AuthenticatedNavigator.tsx`.

### Design System

All design tokens (colors, typography, spacing, animations) are centralized in `src/constants/theme.ts`. Always import from there — don't hardcode values.

Key exports:
- `COLORS` — full color palette
- `TYPOGRAPHY` — text styles
- `SPACING` — `{ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }`
- `ANIMATIONS` — standardized modal/sheet animation configs

### Backend (Supabase)

- PostgreSQL + Row-Level Security (RLS) — test RLS policies with `npm run test:rls`
- 98+ Edge Functions in `supabase/functions/` — shared utilities in `supabase/functions/_shared/`
- Auth: email/password + Apple Sign-In
- Environment vars: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`

### Path Aliases

TypeScript is configured with `@/*` mapping to `./` (root). Use `@/src/...` for imports.

### Testing Setup

- Jest preset: `jest-expo`, jsdom environment
- Supabase, React Navigation, React Query, AsyncStorage all auto-mocked via `jest.setup.js`
- Unit tests: `__tests__/unit/`
- Integration tests: `__tests__/integration/`
- E2E (Detox): `e2e/` — core journeys in `e2e/core-journeys/`
