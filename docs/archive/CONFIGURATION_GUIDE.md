# Configuration Guide

## Overview

This guide documents all configuration files, environment variables, and their purposes in the ELARO app. Understanding configuration is essential for development, deployment, and troubleshooting.

---

## Configuration Files

### 1. `app.config.js`

**Purpose:** Expo app configuration - defines app metadata, build settings, and environment variables for runtime access.

**Location:** Root directory

**Key Sections:**

- App metadata (name, slug, version, scheme)
- Platform-specific configs (iOS, Android, Web)
- Expo plugins
- Environment variables (via `extra` object)
- Build settings

**Access in App:**

```typescript
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
```

**Environment Variables Used:**

- `APPLE_TEAM_ID` - Apple Team ID for iOS builds
- `EXPO_PUBLIC_IOS_BUILD_NUMBER` - iOS build number
- `EXPO_PUBLIC_ANDROID_VERSION_CODE` - Android version code
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` - RevenueCat Apple key
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry error tracking DSN
- `EXPO_PUBLIC_MIXPANEL_TOKEN` - Mixpanel analytics token
- `EXPO_PUBLIC_APP_NAME` - App name (default: 'Elaro')
- `EXPO_PUBLIC_APP_VERSION` - App version (default: '1.0.0')
- `NODE_ENV` - Environment (development/production)
- All `FIREBASE_*` variables for Firebase integration

**Notes:**

- Uses `dotenv` to load `.env` file
- Validates some required variables on startup
- `EXPO_PUBLIC_*` prefix means variable is exposed to client-side code
- Secrets should NEVER use `EXPO_PUBLIC_*` prefix

---

### 2. `tsconfig.json`

**Purpose:** TypeScript compiler configuration.

**Location:** Root directory

**Key Settings:**

- Path aliases (`@/*` → `src/*`)
- Strict mode enabled
- Module resolution settings
- Excluded directories

**Path Aliases:**

```json
{
  "paths": {
    "@/*": ["src/*"]
  }
}
```

**Usage:**

```typescript
// Instead of: import { User } from '../../../types';
import { User } from '@/types';
```

---

### 3. `babel.config.js`

**Purpose:** Babel transpilation configuration.

**Location:** Root directory

**Key Features:**

- Expo preset
- Module resolver for path aliases
- React Native Reanimated plugin

---

### 4. `eslint.config.js`

**Purpose:** ESLint code quality rules.

**Location:** Root directory

**Key Rules:**

- React/React Hooks rules
- TypeScript rules
- Custom rules for:
  - Component usage enforcement
  - Feature boundary enforcement
  - Path alias enforcement
  - Hardcoded values prevention

---

### 5. `package.json`

**Purpose:** Node.js dependencies and scripts.

**Location:** Root directory

**Key Sections:**

- Dependencies (production)
- DevDependencies (development)
- Scripts (build, test, lint, etc.)
- Project metadata

---

### 6. `.env` (Not in repo)

**Purpose:** Environment variables for local development.

**Location:** Root directory (create from `.env.example` if needed)

**Required Variables:**
See [Environment Variables](#environment-variables) section below.

**Security:**

- Never commit `.env` to version control
- Use `.env.example` as template
- Secrets go in Supabase Vault for production

---

### 7. `eas.json`

**Purpose:** Expo Application Services (EAS) build configuration.

**Location:** Root directory

**Key Settings:**

- Build profiles (development, preview, production)
- Platform-specific build settings
- Environment variable overrides

---

## Environment Variables

### Required for Development

Create a `.env` file in the root directory with these variables:

```bash
# Supabase (Required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Analytics (Required)
EXPO_PUBLIC_MIXPANEL_TOKEN=your-mixpanel-token

# Error Tracking (Optional but recommended)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# RevenueCat (Required for subscriptions)
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=your-revenuecat-apple-key

# Apple (Required for iOS builds)
APPLE_TEAM_ID=your-apple-team-id

# Build Info (Optional, defaults provided)
EXPO_PUBLIC_IOS_BUILD_NUMBER=1
EXPO_PUBLIC_ANDROID_VERSION_CODE=1
EXPO_PUBLIC_APP_NAME=Elaro
EXPO_PUBLIC_APP_VERSION=1.0.0

# Firebase (If using Firebase features)
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id

# Environment
NODE_ENV=development
```

### Variable Prefixes

#### `EXPO_PUBLIC_*`

- **Purpose:** Exposed to client-side code
- **Use:** Safe to use in React components
- **Example:** `EXPO_PUBLIC_SUPABASE_URL`
- **Warning:** Never put secrets here - they're visible in the bundle!

#### No Prefix

- **Purpose:** Build-time only, not exposed to client
- **Use:** In `app.config.js` for build configuration
- **Example:** `APPLE_TEAM_ID`, `NODE_ENV`

### Production Secrets

For production, use **Supabase Vault** for secrets:

- Database connection strings
- API secret keys
- Encryption keys
- Service credentials

These are NEVER exposed to the client.

---

## Configuration Validation

### Startup Validation

The app validates critical configuration on startup:

```typescript
// In App.tsx
const revenueCatApiKey =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
if (!revenueCatApiKey) {
  console.warn('⚠️ RevenueCat API key not found');
}
```

### Manual Validation Script

Create a validation script to check required variables:

```bash
# Check config
node scripts/validate-config.js
```

---

## Configuration by Environment

### Development

- Uses `.env` file
- Dev tools enabled
- Hot reload enabled
- Debug builds

### Staging

- Uses EAS secrets
- Production-like config
- Test data enabled

### Production

- Uses EAS secrets
- Optimized builds
- Error tracking enabled
- Analytics enabled

---

## Common Configuration Tasks

### Adding a New Environment Variable

1. **Add to `.env` file:**

   ```bash
   EXPO_PUBLIC_NEW_VAR=value
   ```

2. **Add to `app.config.js`:**

   ```javascript
   extra: {
     EXPO_PUBLIC_NEW_VAR: process.env.EXPO_PUBLIC_NEW_VAR,
   }
   ```

3. **Use in app:**

   ```typescript
   const value = Constants.expoConfig?.extra?.EXPO_PUBLIC_NEW_VAR;
   ```

4. **Add to `.env.example`** (if creating one):
   ```bash
   EXPO_PUBLIC_NEW_VAR=
   ```

### Updating Path Aliases

Edit `tsconfig.json`:

```json
{
  "paths": {
    "@/*": ["src/*"],
    "@components/*": ["src/shared/components/*"] // Example: new alias
  }
}
```

Update `babel.config.js` to match:

```javascript
alias: {
  '@': './src',
  '@components': './src/shared/components',
}
```

### Configuring Platform-Specific Settings

**iOS (`app.config.js`):**

```javascript
ios: {
  bundleIdentifier: 'com.elaro.app',
  buildNumber: process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER || '1',
  infoPlist: {
    NSUserTrackingUsageDescription: '...',
  },
}
```

**Android (`app.config.js`):**

```javascript
android: {
  package: 'com.elaro.app',
  versionCode: parseInt(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE || '1'),
  permissions: [
    'android.permission.CAMERA',
    // ...
  ],
}
```

---

## Troubleshooting

### Variable Not Found

**Problem:** `Constants.expoConfig?.extra?.VARIABLE` is undefined

**Solutions:**

1. Check variable is in `.env` file
2. Check variable is in `app.config.js` `extra` object
3. Restart Metro bundler: `npm start -- --clear`
4. Rebuild app: `npm run prebuild:clean`

### Path Aliases Not Working

**Problem:** `@/` imports not resolving

**Solutions:**

1. Check `tsconfig.json` paths configuration
2. Check `babel.config.js` module resolver
3. Restart TypeScript server (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")
4. Clear cache: `npm start -- --clear`

### Build Errors

**Problem:** Build fails with config errors

**Solutions:**

1. Validate all required variables are set
2. Check variable formats (strings, numbers, booleans)
3. Review `eas.json` for build-specific overrides
4. Check platform-specific requirements

---

## Security Best Practices

### ✅ DO

- Use `EXPO_PUBLIC_*` prefix only for safe, public values
- Store secrets in Supabase Vault for production
- Use `.env.example` as template (without real values)
- Validate required variables on startup
- Use environment-specific configs

### ❌ DON'T

- Commit `.env` file to version control
- Put secrets in `EXPO_PUBLIC_*` variables
- Hardcode API keys in source code
- Expose sensitive credentials to client
- Share `.env` files via insecure channels

---

## File Checklist

- [ ] `.env` file exists (create from template)
- [ ] `app.config.js` includes all required variables
- [ ] `tsconfig.json` has correct path aliases
- [ ] `babel.config.js` matches path aliases
- [ ] `eas.json` configured for builds
- [ ] All secrets use Supabase Vault (production)

---

## Quick Reference

### Access Config in Code

```typescript
import Constants from 'expo-constants';

// Get config value
const value = Constants.expoConfig?.extra?.EXPO_PUBLIC_VAR;
```

### Required Variables for Local Dev

```bash
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_MIXPANEL_TOKEN
EXPO_PUBLIC_REVENUECAT_APPLE_KEY
APPLE_TEAM_ID
```

### Validate Config

```bash
# Check linting (validates some config)
npm run lint

# Check TypeScript (validates path aliases)
npx tsc --noEmit
```

---

**Last Updated:** Phase 2 Implementation  
**Status:** Active Guide
