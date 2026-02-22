# ELARO - Academic Co-Pilot

A modern, intelligent study planning app designed to help students build better study habits and achieve their academic goals through spaced repetition, AI-powered guidance, and personalized learning experiences.

## 🎨 UI/UX Improvements & Architecture Updates

### Recent Architectural Refactoring

- **Feature-Based Architecture**: Migrated from component-based to feature-based organization
- **Modular Code Structure**: Each feature is self-contained with its own components, hooks, and services
- **Improved Maintainability**: Better separation of concerns and reduced coupling
- **Enhanced Developer Experience**: Clear guidelines for adding new features

## 🎨 Recent UI/UX Improvements (4-Phase Plan)

### Phase 1: Design System Consolidation ✅

- **Unified Theme System**: Consolidated all design tokens into `src/constants/theme.ts`
- **Primary Design System**: `theme.ts` is the primary source of truth for colors, spacing, typography, and component patterns
- **Legacy Files**: `designSystem.ts` is still used in some components (LayoutComponents, TaskCreationFlow) for backward compatibility. `components.ts` and `text.ts` exist but are not actively imported and can be considered deprecated.
- **Migration Status**: New components should use `theme.ts` exclusively. Legacy components using `designSystem.ts` should be migrated over time.

### Phase 2: Button System Consolidation ✅

- **Simplified Button API**: Migrated from complex `<Button>` to focused variants (`<PrimaryButton>`, `<SecondaryButton>`, etc.)
- **Eliminated Complexity**: Removed 268-line Button component in favor of focused variants
- **Consistent Styling**: All buttons now use theme tokens instead of hardcoded values
- **ESLint Enforcement**: Added rules to prevent future Button misuse

### Phase 3: Modal Animation Consistency ✅

- **Standardized Animations**: All modals use optimized durations (200-350ms) per modal type
- **Backdrop Types**: Proper backdrop types per modal variant (blur for dialogs, opacity for sheets)
- **Modal Variants**: Created `DialogModal`, `SheetModal`, `SimpleModal`, `FullScreenModal`
- **100% Migration**: Eliminated all custom Modal implementations across the codebase

### Phase 4: Component Interface Simplification ✅

- **Reduced Complexity**: Simplified components with 10+ props using grouped interfaces
- **Focused Sub-Components**: Broke complex components into single-purpose sub-components
- **Prop Grouping**: Organized props into logical groups (`config`, `state`, `handlers`)
- **Backward Compatibility**: Maintained legacy interfaces for smooth migration

### Enhanced Design System

- **Improved Color Palette**: Extended color system with better contrast ratios and accessibility
- **Enhanced Typography**: Refined font weights, sizes, and spacing for better readability
- **Modern Shadows**: Multi-level shadow system for better depth perception
- **Smooth Animations**: Custom easing functions and spring animations for delightful interactions
- **Gradient System**: Beautiful gradient combinations for premium feel

### New Component Library

- **Simplified Button Variants**: `PrimaryButton`, `SecondaryButton`, `OutlineButton`, `DangerButton`, `GhostButton`
- **Standardized Modal Variants**: `DialogModal`, `SheetModal`, `SimpleModal`, `FullScreenModal`
- **Simplified Input Component**: Grouped props with `config`, `state`, and `icons` objects
- **Query State Wrapper**: Simplified loading/error/empty state handling
- **Typography Token Enforcement**: ESLint rules prevent hardcoded typography values
- **Animation Consistency**: All modals use optimized durations (200-350ms) per modal type

### User Experience Enhancements

- **Micro-interactions**: Subtle animations and feedback throughout the app
- **Haptic Feedback**: Tactile responses for better engagement
- **Accessibility**: Screen reader support, proper contrast ratios, touch targets
- **Form Improvements**: Better validation, error states, and user guidance
- **Visual Hierarchy**: Improved spacing, typography, and layout structure

### Key Features

- **Spaced Repetition**: Research-backed intervals for optimal retention
- **AI Study Guide**: Personalized learning techniques and strategies
- **Smart Calendar**: Intelligent scheduling and reminders
<!-- TODO: Streak tracking feature was here. Re-add description if/when streaks are reintroduced. -->
- **Premium Features**: Advanced repetition schedules and unlimited access

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher, v20 recommended)
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ELARO-app

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Environment Setup

1. Create a `.env` file in the root directory
2. Add your Supabase configuration:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
EXPO_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
```

### Database Setup

For database setup instructions, see [Database Setup Guide](./docs/DATABASE/SETUP.md).

**Quick Start:**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db reset
```

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Documentation Index](./docs/README.md)** - Complete documentation index
- **[Getting Started](./docs/GETTING_STARTED.md)** - Quick start guide
- **[Architecture](./ARCHITECTURE.md)** - System architecture
- **[Development Guides](./docs/DEVELOPMENT/)** - UI/UX, Performance, Testing, Patterns
- **[Database Guides](./docs/DATABASE/)** - Setup, Migrations, Operations
- **[Security Guides](./docs/SECURITY/)** - Security best practices
- **[Operations Guides](./docs/OPERATIONS/)** - Deployment, Incident Response

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React Native 0.74.5 with Expo SDK 51
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: React Native StyleSheet with custom design system
- **Navigation**: React Navigation v6
- **State Management**: React Query + React Context
- **Animations**: React Native Animated API

### Project Structure

This project follows a feature-based architecture to promote modularity and scalability. Core features are encapsulated within their own directories, and shared, reusable code is centralized.

```
src/
├── features/           # Feature-based modules
│   ├── auth/           # Authentication (login, signup, MFA)
│   ├── assignments/    # Assignment management
│   ├── courses/        # Course management
│   ├── dashboard/      # Home screen and dashboard widgets
│   ├── lectures/       # Lecture scheduling and management
│   ├── studySessions/  # Study session planning and tracking
│   ├── notifications/  # Push notifications and reminders
│   ├── onboarding/     # User onboarding flow
│   ├── user-profile/   # User profile and account management
│   └── calendar/       # Calendar view and scheduling
│
├── shared/             # Code shared across multiple features
│   ├── components/     # Reusable UI components (Button, Card, etc.)
│   ├── hooks/          # Global custom hooks
│   ├── services/       # Global services (e.g., API client)
│   ├── utils/          # Global utility functions
│   └── screens/        # Reusable screens (e.g., LaunchScreen)
│
├── navigation/         # App navigation configuration (React Navigation)
│
├── types/              # Global TypeScript type definitions
│
├── contexts/           # Global contexts (Theme, Auth, etc.)
│
└── services/           # Root-level services (e.g., Supabase client)
```

## 📋 Development Guidelines

To maintain consistency and modularity, please follow these guidelines when adding new features.

### Adding a New Feature

1. **Create a Feature Directory**: All new features should reside in their own directory within `src/features/`.

   ```bash
   mkdir src/features/your-new-feature
   ```

2. **Follow the Standard Structure**: Inside your new feature directory, group files by their type.

   ```
   src/features/your-new-feature/
   ├── components/    # Components used only by this feature
   ├── hooks/         # Hooks used only by this feature
   ├── screens/       # Screens for this feature's user flow
   ├── services/      # Service calls specific to this feature
   └── index.ts       # Main export file for the feature
   ```

3. **Use Shared Code**: If a component, hook, or utility is needed by more than one feature, place it in the `src/shared/` directory instead of duplicating it.

4. **Update Navigation**: Add any new screens to the appropriate navigator in the `src/navigation/` directory.

5. **Export Properly**: Always export your feature's public API through the `index.ts` file in your feature directory.

### Code Organization Best Practices

- **Feature Isolation**: Keep feature-specific code within the feature directory
- **Shared Resources**: Place reusable code in `src/shared/`
- **Type Safety**: Define TypeScript types in `src/types/` for global types, or within the feature for feature-specific types
- **Context Usage**: Use React Context for state that needs to be shared across multiple components
- **Service Layer**: Implement API calls and business logic in service files

## 🎯 Core Features

### Study Session Management

- Create and schedule study sessions
- Set up spaced repetition reminders
- Track completion and progress
- Color-coded organization

### Task & Event Planning

- Add assignments, exams, and lectures
- Set reminders and due dates
- Repeat patterns for recurring events
- Priority and status tracking

### Spaced Repetition System

- Research-backed intervals (0, 1, 3, 7, 14, 30, 60, 120, 180 days)
- Automatic reminder scheduling
- Progress tracking and analytics
- Premium extended intervals



### Multi-Factor Authentication (MFA)

- TOTP-based two-factor authentication
- QR code enrollment for authenticator apps
- Enhanced security for user accounts
- Backup codes and recovery options

### Task Limits & Premium Features

- Weekly task creation limits for free users
- Premium subscription for unlimited access
- Frontend validation to prevent exceeding limits
- Clear upgrade prompts and messaging

### Analytics & Insights

- Study session analytics
- Completion rates and trends
- Performance insights
- User engagement metrics

## 🎨 Design System

### Colors

- **Primary**: Modern blue (#2C5EFF)
- **Secondary**: Vibrant coral (#FF6B6B)
- **Success**: Green (#4CAF50)
- **Warning**: Orange (#FF9800)
- **Error**: Red (#F44336)
- **Grays**: Comprehensive gray scale for text and backgrounds

### Typography

- **Font Sizes**: xs (12px) to xxxl (32px)
- **Font Weights**: Light (300) to Heavy (800)
- **Line Heights**: Optimized for readability

### Spacing

- **Consistent Scale**: 4px base unit
- **Ranges**: xs (4px) to xxxl (64px)
- **Layout**: Screen padding, card padding, section spacing

### Components

- **Buttons**: Primary, secondary, outline, ghost variants
- **Cards**: Multiple styles with shadows and gradients
- **Inputs**: Validation states, icons, helper text
- **Modals**: Smooth animations, backdrop blur
- **Navigation**: Tab-based with smooth transitions

## 🔧 Development

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Feature-based architecture with shared components

### Testing

- Unit tests for utilities
- Component testing with React Native Testing Library
- Integration tests for critical flows

### Performance

- Optimized animations with native driver
- Lazy loading for screens
- Image optimization
- Memory leak prevention

## 📱 Platform Support

### iOS

- iOS 13+ support
- Native iOS animations
- Haptic feedback integration
- App Store optimization

### Android

- Android 8+ support
- Material Design principles
- Adaptive icons
- Play Store optimization

## 🚀 Deployment

This project uses [Expo Application Services (EAS) Build](https://docs.expo.dev/build/introduction/) to create production builds for iOS and Android.

### Prerequisites

- Ensure you have the EAS CLI installed: `npm install -g eas-cli`
- Log in to your Expo account: `eas login`

### Build Commands

The following commands are configured in `package.json`:

- **Build for iOS:**

  ```bash
  npm run build:ios
  ```

- **Build for Android:**

  ```bash
  npm run build:android
  ```

- **Build for both platforms:**
  ```bash
  npm run build:all
  ```

> **Note:** The legacy `expo build` commands are deprecated and should not be used.

### App Store Deployment

1. Configure `app.json` and `eas.json` with proper metadata
2. Build production version using EAS Build
3. Submit to App Store Connect (iOS) or Play Console (Android)
4. Configure TestFlight for beta testing (iOS) or Internal Testing (Android)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow the existing code style and feature-based architecture
- Add TypeScript types for new features
- Include accessibility features and proper contrast ratios
- Test on both iOS and Android platforms
- Update documentation and README as needed
- Use the established shared components and design system
- Follow the feature isolation principles outlined above

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Supabase for the backend infrastructure
- Expo for the development platform
- React Native community for the ecosystem
- All contributors and beta testers

---

**ELARO** - Empowering students to learn smarter, not harder. 🧠✨
