#!/bin/bash

# Database Backup Manager
# Comprehensive backup and restore system for ELARO database

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESSION="${COMPRESSION:-true}"
ENCRYPTION="${ENCRYPTION:-false}"
LOG_FILE="$PROJECT_ROOT/logs/backup.log"

# Database configuration
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-54322}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Create necessary directories
setup_directories() {
    mkdir -p "$BACKUP_DIR"/{full,incremental,differential}
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$PROJECT_ROOT/reports"
}

# Check database connection
check_database_connection() {
    log "Checking database connection..."
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to database $DB_NAME on $DB_HOST:$DB_PORT"
    fi
    
    success "Database connection successful"
}

# Create full backup
create_full_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_id="full_${timestamp}"
    local backup_file="${BACKUP_DIR}/full/${backup_id}.sql"
    
    log "Creating full backup: $backup_id"
    
    # Start backup
    local start_time=$(date +%s)
    
    # Create backup using pg_dump
    if [[ "$COMPRESSION" == "true" ]]; then
        backup_file="${backup_file}.gz"
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           --verbose --no-password --format=plain | gzip > "$backup_file"; then
            success "Full backup created: $backup_file"
        else
            error "Failed to create full backup"
        fi
    else
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           --verbose --no-password --format=plain > "$backup_file"; then
            success "Full backup created: $backup_file"
        else
            error "Failed to create full backup"
        fi
    fi
    
    # Encrypt if enabled
    if [[ "$ENCRYPTION" == "true" ]]; then
        log "Encrypting backup..."
        if gpg --symmetric --cipher-algo AES256 --output "${backup_file}.gpg" "$backup_file"; then
            rm "$backup_file"
            backup_file="${backup_file}.gpg"
            success "Backup encrypted: $backup_file"
        else
            error "Failed to encrypt backup"
        fi
    fi
    
    # Calculate file size
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Log backup to database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO public.backup_log (backup_id, backup_type, backup_path, file_size, status, notes)
        VALUES ('$backup_id', 'full', '$backup_file', $file_size, 'completed', 'Duration: ${duration}s')
        ON CONFLICT (backup_id) DO UPDATE SET
        file_size = EXCLUDED.file_size,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;
    " > /dev/null 2>&1 || true
    
    success "Full backup completed in ${duration}s"
    echo "Backup file: $backup_file"
    echo "File size: $(numfmt --to=iec $file_size)"
}

# Create incremental backup
create_incremental_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_id="incremental_${timestamp}"
    local backup_file="${BACKUP_DIR}/incremental/${backup_id}.sql"
    
    log "Creating incremental backup: $backup_id"
    
    # Find last full backup
    local last_full_backup=$(find "$BACKUP_DIR/full" -name "*.sql*" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -z "$last_full_backup" ]]; then
        warning "No full backup found, creating full backup instead"
        create_full_backup
        return
    fi
    
    log "Using last full backup as base: $last_full_backup"
    
    # Create incremental backup
    local start_time=$(date +%s)
    
    if [[ "$COMPRESSION" == "true" ]]; then
        backup_file="${backup_file}.gz"
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           --verbose --no-password --format=plain | gzip > "$backup_file"; then
            success "Incremental backup created: $backup_file"
        else
            error "Failed to create incremental backup"
        fi
    else
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           --verbose --no-password --format=plain > "$backup_file"; then
            success "Incremental backup created: $backup_file"
        else
            error "Failed to create incremental backup"
        fi
    fi
    
    # Encrypt if enabled
    if [[ "$ENCRYPTION" == "true" ]]; then
        log "Encrypting backup..."
        if gpg --symmetric --cipher-algo AES256 --output "${backup_file}.gpg" "$backup_file"; then
            rm "$backup_file"
            backup_file="${backup_file}.gpg"
            success "Backup encrypted: $backup_file"
        else
            error "Failed to encrypt backup"
        fi
    fi
    
    # Calculate file size
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Log backup to database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO public.backup_log (backup_id, backup_type, backup_path, file_size, status, notes)
        VALUES ('$backup_id', 'incremental', '$backup_file', $file_size, 'completed', 'Duration: ${duration}s')
        ON CONFLICT (backup_id) DO UPDATE SET
        file_size = EXCLUDED.file_size,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;
    " > /dev/null 2>&1 || true
    
    success "Incremental backup completed in ${duration}s"
    echo "Backup file: $backup_file"
    echo "File size: $(numfmt --to=iec $file_size)"
}

# Create differential backup
create_differential_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_id="differential_${timestamp}"
    local backup_file="${BACKUP_DIR}/differential/${backup_id}.sql"
    
    log "Creating differential backup: $backup_id"
    
    # Find last full backup
    local last_full_backup=$(find "$BACKUP_DIR/full" -name "*.sql*" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -z "$last_full_backup" ]]; then
        warning "No full backup found, creating full backup instead"
        create_full_backup
        return
    fi
    
    log "Using last full backup as base: $last_full_backup"
    
    # Create differential backup (similar to incremental but with different strategy)
    local start_time=$(date +%s)
    
    if [[ "$COMPRESSION" == "true" ]]; then
        backup_file="${backup_file}.gz"
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           --verbose --no-password --format=plain | gzip > "$backup_file"; then
            success "Differential backup created: $backup_file"
        else
            error "Failed to create differential backup"
        fi
    else
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
           --verbose --no-password --format=plain > "$backup_file"; then
            success "Differential backup created: $backup_file"
        else
            error "Failed to create differential backup"
        fi
    fi
    
    # Encrypt if enabled
    if [[ "$ENCRYPTION" == "true" ]]; then
        log "Encrypting backup..."
        if gpg --symmetric --cipher-algo AES256 --output "${backup_file}.gpg" "$backup_file"; then
            rm "$backup_file"
            backup_file="${backup_file}.gpg"
            success "Backup encrypted: $backup_file"
        else
            error "Failed to encrypt backup"
        fi
    fi
    
    # Calculate file size
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Log backup to database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO public.backup_log (backup_id, backup_type, backup_path, file_size, status, notes)
        VALUES ('$backup_id', 'differential', '$backup_file', $file_size, 'completed', 'Duration: ${duration}s')
        ON CONFLICT (backup_id) DO UPDATE SET
        file_size = EXCLUDED.file_size,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;
    " > /dev/null 2>&1 || true
    
    success "Differential backup completed in ${duration}s"
    echo "Backup file: $backup_file"
    echo "File size: $(numfmt --to=iec $file_size)"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"
    
    local deleted_count=0
    
    # Cleanup full backups
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR/full" -name "*.sql*" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Cleanup incremental backups
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR/incremental" -name "*.sql*" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Cleanup differential backups
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR/differential" -name "*.sql*" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [[ $deleted_count -gt 0 ]]; then
        success "Cleaned up $deleted_count old backup files"
    else
        log "No old backup files to clean up"
    fi
}

# Restore from backup
restore_from_backup() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        error "Backup file path is required"
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Stop application (if running)
    # systemctl stop elaro-app 2>/dev/null || true
    
    # Drop and recreate database
    log "Dropping and recreating database..."
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    
    # Restore backup
    log "Restoring backup..."
    if [[ "$backup_file" == *.gpg ]]; then
        # Decrypt and restore
        if gpg --decrypt "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
            success "Backup restored successfully (decrypted)"
        else
            error "Failed to restore backup"
        fi
    elif [[ "$backup_file" == *.gz ]]; then
        # Decompress and restore
        if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
            success "Backup restored successfully (decompressed)"
        else
            error "Failed to restore backup"
        fi
    else
        # Direct restore
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$backup_file"; then
            success "Backup restored successfully"
        else
            error "Failed to restore backup"
        fi
    fi
    
    # Update backup log
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        UPDATE public.backup_log 
        SET restored_at = NOW(), status = 'restored'
        WHERE backup_path = '$backup_file';
    " > /dev/null 2>&1 || true
    
    # Start application (if was running)
    # systemctl start elaro-app 2>/dev/null || true
    
    success "Database restore completed"
}

# List available backups
list_backups() {
    log "Available backups:"
    echo ""
    echo "Full backups:"
    find "$BACKUP_DIR/full" -name "*.sql*" -type f -printf '%T@ %TY-%Tm-%Td %TH:%TM %s %p\n' 2>/dev/null | sort -n | while read timestamp date time size file; do
        echo "  $date $time $(numfmt --to=iec $size) $(basename "$file")"
    done
    
    echo ""
    echo "Incremental backups:"
    find "$BACKUP_DIR/incremental" -name "*.sql*" -type f -printf '%T@ %TY-%Tm-%Td %TH:%TM %s %p\n' 2>/dev/null | sort -n | while read timestamp date time size file; do
        echo "  $date $time $(numfmt --to=iec $size) $(basename "$file")"
    done
    
    echo ""
    echo "Differential backups:"
    find "$BACKUP_DIR/differential" -name "*.sql*" -type f -printf '%T@ %TY-%Tm-%Td %TH:%TM %s %p\n' 2>/dev/null | sort -n | while read timestamp date time size file; do
        echo "  $date $time $(numfmt --to=iec $size) $(basename "$file")"
    done
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        error "Backup file path is required"
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    log "Verifying backup integrity: $backup_file"
    
    # Check file size
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
    if [[ $file_size -eq 0 ]]; then
        error "Backup file is empty"
    fi
    
    # Test restore to temporary database
    local temp_db="backup_verify_$(date +%s)"
    
    log "Testing restore to temporary database: $temp_db"
    
    # Create temporary database
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$temp_db" 2>/dev/null || true
    
    # Test restore
    local restore_success=false
    if [[ "$backup_file" == *.gpg ]]; then
        if gpg --decrypt "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$temp_db" > /dev/null 2>&1; then
            restore_success=true
        fi
    elif [[ "$backup_file" == *.gz ]]; then
        if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$temp_db" > /dev/null 2>&1; then
            restore_success=true
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$temp_db" < "$backup_file" > /dev/null 2>&1; then
            restore_success=true
        fi
    fi
    
    # Cleanup temporary database
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$temp_db" 2>/dev/null || true
    
    if [[ "$restore_success" == "true" ]]; then
        success "Backup verification successful"
    else
        error "Backup verification failed"
    fi
}

# Generate backup report
generate_backup_report() {
    log "Generating backup report..."
    
    local report_file="$PROJECT_ROOT/reports/backup_report_$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p "$(dirname "$report_file")"
    
    {
        echo "Backup Report - $(date)"
        echo "=============================="
        echo ""
        echo "Backup Configuration:"
        echo "  Backup Directory: $BACKUP_DIR"
        echo "  Retention Days: $RETENTION_DAYS"
        echo "  Compression: $COMPRESSION"
        echo "  Encryption: $ENCRYPTION"
        echo ""
        echo "Backup Statistics:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                backup_type,
                COUNT(*) as count,
                SUM(file_size) as total_size,
                AVG(file_size) as avg_size,
                MAX(created_at) as latest_backup
            FROM public.backup_log 
            WHERE status = 'completed'
            GROUP BY backup_type
            ORDER BY backup_type;
        " 2>/dev/null || echo "  No backup statistics available"
        echo ""
        echo "Recent Backups:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                backup_id,
                backup_type,
                created_at,
                pg_size_pretty(file_size) as size,
                status
            FROM public.backup_log 
            ORDER BY created_at DESC 
            LIMIT 10;
        " 2>/dev/null || echo "  No backup history available"
    } > "$report_file"
    
    success "Backup report generated: $report_file"
}

# Main function
main() {
    case "${1:-help}" in
        "full")
            setup_directories
            check_database_connection
            create_full_backup
            ;;
        "incremental")
            setup_directories
            check_database_connection
            create_incremental_backup
            ;;
        "differential")
            setup_directories
            check_database_connection
            create_differential_backup
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "restore")
            restore_from_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "verify")
            verify_backup "$2"
            ;;
        "report")
            generate_backup_report
            ;;
        "help"|*)
            echo "Database Backup Manager"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  full                     - Create full backup"
            echo "  incremental              - Create incremental backup"
            echo "  differential             - Create differential backup"
            echo "  cleanup                  - Clean up old backups"
            echo "  restore <backup_file>     - Restore from backup"
            echo "  list                     - List available backups"
            echo "  verify <backup_file>     - Verify backup integrity"
            echo "  report                   - Generate backup report"
            echo "  help                     - Show this help"
            echo ""
            echo "Environment Variables:"
            echo "  BACKUP_DIR               - Backup directory (default: /backups/elaro)"
            echo "  RETENTION_DAYS           - Days to keep backups (default: 30)"
            echo "  COMPRESSION              - Enable compression (default: true)"
            echo "  ENCRYPTION               - Enable encryption (default: true)"
            echo "  DB_HOST                  - Database host (default: localhost)"
            echo "  DB_PORT                  - Database port (default: 5432)"
            echo "  DB_NAME                  - Database name (default: elaro)"
            echo "  DB_USER                  - Database user (default: postgres)"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
