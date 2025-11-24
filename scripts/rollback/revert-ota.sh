#!/bin/bash

CHANNEL=${1:-production}
UPDATE_ID=${2}

if [ -z "$CHANNEL" ] || [ -z "$UPDATE_ID" ]; then
  echo "❌ Error: Channel and Update ID required"
  echo "Usage: ./scripts/rollback/revert-ota.sh <channel> <update-id>"
  exit 1
fi

echo "🔄 Reverting channel $CHANNEL to update: $UPDATE_ID"

eas update:channel --channel $CHANNEL --branch $CHANNEL --update-id $UPDATE_ID

if [ $? -eq 0 ]; then
  echo "✅ Reverted to update $UPDATE_ID"
  echo "📧 Consider sending notification email to team"
else
  echo "❌ Failed to revert update"
  exit 1
fi

