# ELARO - Academic Co-Pilot

A modern, intelligent study planning app designed to help students build better study habits and achieve their academic goals through spaced repetition, AI-powered guidance, and personalized learning experiences.

## 🎨 UI/UX Improvements (Latest Update)

### Enhanced Design System

- **Improved Color Palette**: Extended color system with better contrast ratios and accessibility
- **Enhanced Typography**: Refined font weights, sizes, and spacing for better readability
- **Modern Shadows**: Multi-level shadow system for better depth perception
- **Smooth Animations**: Custom easing functions and spring animations for delightful interactions
- **Gradient System**: Beautiful gradient combinations for premium feel

### New Component Library

- **Enhanced Button Component**: Multiple variants, haptic feedback, accessibility features
- **Modern Card Component**: Gradient support, animations, pressable states
- **Improved Input Component**: Validation states, icons, character counting, animations
- **Enhanced Modal Component**: Backdrop blur, smooth animations, better UX
- **Floating Action Button**: Pulse animations, haptic feedback, multiple positions
- **Add Option Modal**: Beautiful gradients, smooth transitions, better organization

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

- Node.js (v16 or higher)
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
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: React Native StyleSheet with custom design system
- **Navigation**: React Navigation v6
- **State Management**: React Context + Hooks
- **Animations**: React Native Animated API

### Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── services/           # API and external services
├── constants/          # Design system and constants
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

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

### AI-Powered Study Guide

- Personalized learning techniques
- Memory improvement strategies
- Study method recommendations
- Progress-based guidance

### Analytics & Insights

- Study session analytics
- Completion rates and trends
- Streak tracking and motivation
- Performance insights

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
- Component-based architecture

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

### Expo Build

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

### App Store Deployment

1. Configure app.json with proper metadata
2. Build production version
3. Submit to App Store Connect
4. Configure TestFlight for beta testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow the existing code style
- Add TypeScript types for new features
- Include accessibility features
- Test on both iOS and Android
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Supabase for the backend infrastructure
- Expo for the development platform
- React Native community for the ecosystem
- All contributors and beta testers

---

**ELARO** - Empowering students to learn smarter, not harder. 🧠✨
