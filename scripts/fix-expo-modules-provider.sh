#!/bin/bash
# Fix auto-generated ExpoModulesProvider.swift to remove RNCSafeAreaProviderManager

EXPO_MODULES_PROVIDER="ios/Pods/Target Support Files/Pods-Elaro/ExpoModulesProvider.swift"

if [ -f "$EXPO_MODULES_PROVIDER" ]; then
  sed -i '' '/RNCSafeAreaProviderManager\.self,/d' "$EXPO_MODULES_PROVIDER"
fi

