# 🚀 ELARO Build Guide

## Platform-Specific Build Commands

This guide explains how to build and deploy your ELARO app for different platforms without conflicts.

### 📱 Development Commands

#### Start Development Server
```bash
# Start for all platforms
npm start

# Start for specific platform
npm run start:ios      # iOS only
npm run start:android  # Android only
npm run start:web      # Web only
```

#### Run on Device/Simulator
```bash
# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web
```

### 🔧 Prebuild Commands

#### Clean Prebuild (Recommended)
```bash
# Clean prebuild for all platforms
npm run prebuild:clean

# Clean prebuild for specific platform
npm run prebuild:ios      # iOS only
npm run prebuild:android  # Android only
```

### 🏗️ Production Build Commands

#### EAS Build (Cloud)
```bash
# Build for specific platform
npm run build:ios         # iOS production build
npm run build:android     # Android production build

# Build for preview/testing
npm run build:ios:preview     # iOS preview build
npm run build:android:preview # Android preview build

# Build for all platforms
npm run build:all
```

#### Submit to App Stores
```bash
# Submit to specific store
npm run submit:ios         # App Store
npm run submit:android     # Google Play Store

# Submit to all stores
npm run submit:all
```

### 🧹 Cleanup Commands

#### Full Clean (Nuclear Option)
```bash
# Clean everything and reinstall
npm run clean
```

#### Platform-Specific Clean
```bash
# Clean iOS only
npm run clean:ios

# Clean Android only
npm run clean:android
```

### 🛠️ Troubleshooting

#### Common Issues and Solutions

1. **Build Conflicts Between Platforms**
   ```bash
   # Solution: Clean and rebuild for specific platform
   npm run clean:ios
   npm run prebuild:ios
   npm run build:ios
   ```

2. **Metro Cache Issues**
   ```bash
   # Solution: Clear Metro cache
   npx expo start --clear
   ```

3. **Native Dependencies Issues**
   ```bash
   # Solution: Clean prebuild and reinstall
   npm run prebuild:clean
   npm install
   ```

4. **iOS Build Issues**
   ```bash
   # Solution: Clean iOS build
   rm -rf ios/build
   cd ios && pod install
   npm run build:ios
   ```

5. **Android Build Issues**
   ```bash
   # Solution: Clean Android build
   rm -rf android/build android/app/build
   npm run build:android
   ```

### 📋 Best Practices

#### 1. **Always Use Platform-Specific Commands**
- ❌ Don't: `expo prebuild` (affects both platforms)
- ✅ Do: `npm run prebuild:ios` or `npm run prebuild:android`

#### 2. **Clean Before Major Changes**
- Always run `npm run prebuild:clean` before switching between platforms
- Use `npm run clean:ios` or `npm run clean:android` for platform-specific issues

#### 3. **Environment Variables**
- Set `EXPO_PLATFORM=ios` or `EXPO_PLATFORM=android` for platform-specific builds
- Use `.env` files for different environments

#### 4. **Build Order**
1. Clean: `npm run clean:ios` or `npm run clean:android`
2. Prebuild: `npm run prebuild:ios` or `npm run prebuild:android`
3. Build: `npm run build:ios` or `npm run build:android`

### 🔄 Workflow Examples

#### iOS Development Workflow
```bash
# 1. Clean iOS
npm run clean:ios

# 2. Start iOS development
npm run start:ios

# 3. Run on iOS simulator
npm run ios

# 4. Build for production
npm run build:ios
```

#### Android Development Workflow
```bash
# 1. Clean Android
npm run clean:android

# 2. Start Android development
npm run start:android

# 3. Run on Android emulator
npm run android

# 4. Build for production
npm run build:android
```

#### Switching Between Platforms
```bash
# When switching from iOS to Android
npm run clean:ios
npm run clean:android
npm run prebuild:android
npm run start:android

# When switching from Android to iOS
npm run clean:android
npm run clean:ios
npm run prebuild:ios
npm run start:ios
```

### 📊 Build Profiles

The project uses EAS Build profiles defined in `eas.json`:

- **preview**: For testing and internal distribution
- **production**: For App Store and Google Play Store

### 🚨 Important Notes

1. **Never run both platforms simultaneously** during development
2. **Always clean before switching platforms**
3. **Use platform-specific commands** to avoid conflicts
4. **Check your `.env` file** for correct environment variables
5. **Keep your EAS CLI updated**: `npm install -g @expo/eas-cli`

### 📞 Support

If you encounter issues:
1. Check this guide first
2. Run the appropriate clean command
3. Check your environment variables
4. Verify your EAS CLI is up to date
5. Check the Expo documentation for platform-specific issues
