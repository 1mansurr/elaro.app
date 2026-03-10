#!/bin/bash

# Script to deploy Supabase Edge Functions in batches to avoid rate limits

set -e

FUNCTIONS_DIR="supabase/functions"
BATCH_SIZE=5
DELAY_BETWEEN_BATCHES=3

# Get all function directories (excluding _shared)
# Find all directories that contain an index.ts file directly
FUNCTIONS=()
while IFS= read -r func; do
  # Skip _shared directory
  if [[ "$func" != _shared* ]]; then
    FUNCTIONS+=("$func")
  fi
done < <(find "$FUNCTIONS_DIR" -mindepth 1 -maxdepth 2 -name "index.ts" -type f | \
  sed "s|$FUNCTIONS_DIR/||g" | \
  sed "s|/index.ts||g" | \
  sort | \
  uniq)

echo "Found ${#FUNCTIONS[@]} functions to deploy"
echo "Deploying in batches of $BATCH_SIZE with ${DELAY_BETWEEN_BATCHES}s delay between batches"
echo ""

# Deploy functions in batches
BATCH_NUM=1
for i in "${!FUNCTIONS[@]}"; do
  FUNCTION="${FUNCTIONS[$i]}"
  
  # Start of a new batch
  if [ $((i % BATCH_SIZE)) -eq 0 ]; then
    if [ $i -gt 0 ]; then
      echo ""
      echo "Waiting ${DELAY_BETWEEN_BATCHES}s before next batch..."
      sleep $DELAY_BETWEEN_BATCHES
      echo ""
    fi
    echo "=== Batch $BATCH_NUM ==="
    ((BATCH_NUM++))
  fi
  
  echo "[$((i+1))/${#FUNCTIONS[@]}] Deploying: $FUNCTION"
  
  if supabase functions deploy "$FUNCTION" --no-verify-jwt 2>&1 | grep -q "Deployed Functions"; then
    echo "  ✅ Success"
  else
    echo "  ❌ Failed"
    echo "  Retrying in 2 seconds..."
    sleep 2
    if supabase functions deploy "$FUNCTION" --no-verify-jwt 2>&1 | grep -q "Deployed Functions"; then
      echo "  ✅ Success (on retry)"
    else
      echo "  ❌ Failed after retry - continuing with next function"
    fi
  fi
done

echo ""
echo "✅ Deployment complete!"

