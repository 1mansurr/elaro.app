# Getting Started Guide

## Overview

This guide will help you get the ELARO application up and running for local development.

## Prerequisites

- **Node.js**: v18 or higher (v20 recommended)
- **npm**: v9 or higher
- **Expo CLI**: Latest version
- **Supabase CLI**: Latest version
- **iOS Simulator** (for iOS development) or **Android Emulator** (for Android development)

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd ELARO-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your configuration:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Error Tracking
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Analytics
EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
```

### 4. Link to Supabase Project

```bash
# Get your project reference from Supabase Dashboard
supabase link --project-ref YOUR_PROJECT_REF
```

### 5. Start Development Server

```bash
# Start for all platforms
npm start

# Or start for specific platform
npm run start:ios      # iOS only
npm run start:android   # Android only
```

### 6. Run on Device/Simulator

```bash
# iOS
npm run ios

# Android
npm run android
```

## Database Setup

For detailed database setup instructions, see [Database Setup Guide](./DATABASE_SETUP.md).

**Quick Start:**

```bash
# Start local Supabase (optional, for local development)
supabase start

# Apply migrations
supabase db reset
```

## Project Structure

```
src/
├── features/           # Feature-based modules
│   ├── auth/          # Authentication
│   ├── assignments/   # Assignment management
│   ├── courses/       # Course management
│   ├── dashboard/     # Home screen
│   └── ...
├── shared/            # Shared components and utilities
│   ├── components/   # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   └── services/     # Shared services
├── navigation/        # App navigation
├── types/             # TypeScript types
└── contexts/          # React contexts
```

## Development Workflow

### Adding a New Feature

1. **Create feature directory:**

   ```bash
   mkdir src/features/your-new-feature
   ```

2. **Follow standard structure:**

   ```
   src/features/your-new-feature/
   ├── components/
   ├── hooks/
   ├── screens/
   ├── services/
   └── index.ts
   ```

3. **Update navigation** in `src/navigation/`

4. **Export from feature** via `index.ts`

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

## Common Tasks

### Creating a Migration

```bash
# Make changes to local database
# Then generate migration
supabase db diff -f descriptive_name

# Test migration
supabase db reset
```

### Building for Production

```bash
# iOS
npm run build:ios

# Android
npm run build:android
```

## Troubleshooting

### Metro Cache Issues

```bash
npx expo start --clear
```

### Native Dependencies Issues

```bash
npm run prebuild:clean
npm install
```

### iOS Build Issues

```bash
rm -rf ios/build
cd ios && pod install
npm run build:ios
```

### Android Build Issues

```bash
rm -rf android/build android/app/build
npm run build:android
```

## Next Steps

- Read [Architecture Documentation](./ARCHITECTURE.md)
- Review [Development Guidelines](./README.md#development-guidelines)
- Check [UI/UX Guide](./docs/DEVELOPMENT/UI_UX_GUIDE.md)
- Explore [Testing Guide](./docs/DEVELOPMENT/TESTING.md)

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)

## Getting Help

If you encounter issues:

1. Check this guide first
2. Review troubleshooting section
3. Check [Documentation Index](./docs/README.md)
4. Contact the development team
