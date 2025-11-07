#!/bin/bash

CHANNEL=${1:-production}

if [ -z "$CHANNEL" ]; then
  echo "❌ Error: Channel name required"
  echo "Usage: ./scripts/rollback/disable-ota.sh <channel>"
  exit 1
fi

echo "🚫 Disabling OTA updates for channel: $CHANNEL"
echo "⚠️  This will prevent new updates from being delivered"

eas update:channel --channel $CHANNEL --branch $CHANNEL --off

if [ $? -eq 0 ]; then
  echo "✅ OTA updates disabled for $CHANNEL channel"
  echo "📧 Consider sending notification email to team"
else
  echo "❌ Failed to disable OTA updates"
  exit 1
fi

