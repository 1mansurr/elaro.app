#!/bin/bash

# Daily Backup Script for ELARO Database
# This script creates a daily backup and manages retention
# Designed to run via cron at 2 AM daily

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups/daily"
RETENTION_DAYS=7
LOG_FILE="$PROJECT_ROOT/logs/daily-backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Start backup process
log "=== Starting daily backup ==="

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    error "Supabase CLI is not installed. Please install it first: npm install -g supabase"
fi

# Check if linked to project
if ! supabase status &> /dev/null && ! [ -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]; then
    error "Not linked to Supabase project. Run: supabase link --project-ref YOUR_PROJECT_REF"
fi

# Create timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/daily_backup_${TIMESTAMP}.sql.gz"

log "Creating backup: $BACKUP_FILE"

# Create backup using Supabase CLI
if supabase db dump | gzip > "$BACKUP_FILE"; then
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    success "Backup created successfully: $BACKUP_FILE (Size: $FILE_SIZE)"
    
    # Verify backup file exists and is not empty
    if [ ! -s "$BACKUP_FILE" ]; then
        error "Backup file is empty or missing"
    fi
    
    log "Backup file size: $FILE_SIZE"
else
    error "Failed to create backup"
fi

# Clean up old backups (keep only last 7 days)
log "Cleaning up old backups (retention: $RETENTION_DAYS days)"
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "daily_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r old_backup; do
        log "Removing old backup: $(basename "$old_backup")"
        rm -f "$old_backup"
    done
    success "Old backups cleaned up"
else
    log "No old backups to clean up"
fi

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "daily_backup_*.sql.gz" -type f | wc -l | tr -d ' ')
log "Total backups retained: $BACKUP_COUNT"

log "=== Daily backup completed successfully ==="

# Optional: Send notification (if configured)
# You can add email/notification logic here if needed

exit 0

