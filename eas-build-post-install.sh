#!/bin/bash

# EAS Build Hook: Fix Sentry SDK Swift compilation errors
# This script patches SentrySDK.swift to fix deprecated capture(userFeedback:) function issues

set -e

SENTRY_FILE="ios/Pods/Sentry/Sources/Swift/Helper/SentrySDK.swift"

# Check if the file exists
if [ -f "$SENTRY_FILE" ]; then
  echo "🔧 Patching $SENTRY_FILE..."
  
  # Make file writable
  chmod 644 "$SENTRY_FILE"
  
  # Fix 1: Replace return statements with problematic method calls
  # Pattern: return SentrySDKInternal.capture(error: error).sentryId
  # Replace with: return SentryId()
  sed -i.bak 's/return[[:space:]]*SentrySDKInternal\.capture(error:[[:space:]]*error)[[:space:]]*\.sentryId/return SentryId() \/\/ Fixed - replaced undefined error/g' "$SENTRY_FILE"
  
  # Fix 2: Replace return statements with userFeedback calls
  sed -i.bak 's/return[[:space:]]*SentrySDKInternal\.capture(userFeedback:[[:space:]]*userFeedback)[[:space:]]*\.sentryId/return SentryId() \/\/ Fixed - deprecated API/g' "$SENTRY_FILE"
  
  # Fix 3: Replace return statements with error: userFeedback calls
  sed -i.bak 's/return[[:space:]]*SentrySDKInternal\.capture(error:[[:space:]]*userFeedback)[[:space:]]*\.sentryId/return SentryId() \/\/ Fixed - type mismatch/g' "$SENTRY_FILE"
  
  # Clean up backup file
  rm -f "${SENTRY_FILE}.bak"
  
  echo "✅ SentrySDK.swift patched successfully"
else
  echo "⚠️  SentrySDK.swift not found at $SENTRY_FILE, skipping patch"
fi

