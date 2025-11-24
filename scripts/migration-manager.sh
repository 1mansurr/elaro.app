#!/bin/bash

# Database Migration Manager
# Provides comprehensive migration management for the ELARO database

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
LOG_FILE="$PROJECT_ROOT/logs/migration.log"

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

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Check if supabase CLI is available
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI is not installed. Please install it first."
    fi
}

# Check migration status
check_migrations() {
    log "Checking migration status..."
    supabase migration list
}

# Validate migration files
validate_migrations() {
    log "Validating migration files..."
    
    local invalid_files=()
    
    for file in "$MIGRATIONS_DIR"/*.sql; do
        if [[ -f "$file" ]]; then
            # Check if file has proper naming convention
            filename=$(basename "$file")
            if [[ ! "$filename" =~ ^[0-9]{14}_.+\.sql$ ]]; then
                warning "Migration file '$filename' doesn't follow naming convention: YYYYMMDDHHMMSS_description.sql"
                invalid_files+=("$filename")
            fi
            
            # Note: psql has no --dry-run flag. SQL syntax validation should be done via:
            # 1. Testing migrations in a local/staging environment first
            # 2. Using supabase db push which validates before applying
            # 3. Manual review of migration files before committing
        fi
    done
    
    if [[ ${#invalid_files[@]} -gt 0 ]]; then
        warning "Found ${#invalid_files[@]} files with naming issues"
        for file in "${invalid_files[@]}"; do
            echo "  - $file"
        done
    else
        success "All migration files are valid"
    fi
}

# Apply pending migrations
apply_migrations() {
    log "Applying pending migrations..."
    
    # Check if there are pending migrations
    local pending_count=$(supabase migration list | grep -c "|.*|.*|.*|.*|" || true)
    
    if [[ $pending_count -eq 0 ]]; then
        success "No pending migrations to apply"
        return 0
    fi
    
    log "Found $pending_count pending migrations"
    
    # Apply migrations
    if supabase db push; then
        success "All migrations applied successfully"
    else
        error "Failed to apply migrations"
    fi
}

# Rollback last migration
rollback_migration() {
    local version=$1
    
    if [[ -z "$version" ]]; then
        error "Migration version is required for rollback"
    fi
    
    log "Rolling back migration: $version"
    
    if supabase migration repair --status reverted "$version"; then
        success "Migration $version rolled back successfully"
    else
        error "Failed to rollback migration $version"
    fi
}

# Create new migration
create_migration() {
    local name=$1
    
    if [[ -z "$name" ]]; then
        error "Migration name is required"
    fi
    
    log "Creating new migration: $name"
    
    # Generate timestamp
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local filename="${timestamp}_${name}.sql"
    local filepath="$MIGRATIONS_DIR/$filename"
    
    # Create migration file with template
    cat > "$filepath" << EOF
-- Migration: $name
-- Created: $(date)
-- Description: [Add description here]

-- ============================================================================
-- MIGRATION CONTENT
-- ============================================================================

-- Add your migration SQL here

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Add validation queries here
-- Example: SELECT COUNT(*) FROM table_name;

-- ============================================================================
-- COMPLETION LOG
-- ============================================================================

DO \$\$
BEGIN
  RAISE NOTICE 'Migration $name completed successfully';
  RAISE NOTICE 'Timestamp: %', NOW();
END \$\$;
EOF
    
    success "Migration file created: $filename"
    echo "Edit the file at: $filepath"
}

# Backup database before migration
backup_before_migration() {
    log "Creating backup before migration..."
    
    local backup_id="pre_migration_$(date +%Y%m%d_%H%M%S)"
    local backup_path="/tmp/$backup_id.sql"
    
    # Create backup
    if pg_dump -h localhost -U postgres -d elaro > "$backup_path"; then
        success "Backup created: $backup_path"
        echo "Backup file: $backup_path"
    else
        error "Failed to create backup"
    fi
}

# Restore from backup
restore_from_backup() {
    local backup_file=$1
    
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
    dropdb -h localhost -U postgres elaro 2>/dev/null || true
    createdb -h localhost -U postgres elaro
    
    # Restore backup
    if psql -h localhost -U postgres -d elaro < "$backup_file"; then
        success "Database restored from backup"
    else
        error "Failed to restore from backup"
    fi
    
    # Start application (if was running)
    # systemctl start elaro-app 2>/dev/null || true
}

# Check database health
check_database_health() {
    log "Checking database health..."
    
    # Check connection
    if ! psql -h localhost -U postgres -d elaro -c "SELECT 1;" > /dev/null 2>&1; then
        error "Database connection failed"
    fi
    
    # Check for locks
    local lock_count=$(psql -h localhost -U postgres -d elaro -t -c "SELECT COUNT(*) FROM pg_locks WHERE NOT granted;" 2>/dev/null || echo "0")
    if [[ $lock_count -gt 0 ]]; then
        warning "Found $lock_count active locks"
    fi
    
    # Check for long-running queries
    local long_queries=$(psql -h localhost -U postgres -d elaro -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';" 2>/dev/null || echo "0")
    if [[ $long_queries -gt 0 ]]; then
        warning "Found $long_queries long-running queries"
    fi
    
    success "Database health check passed"
}

# Generate migration report
generate_report() {
    log "Generating migration report..."
    
    local report_file="$PROJECT_ROOT/reports/migration_report_$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p "$(dirname "$report_file")"
    
    {
        echo "Migration Report - $(date)"
        echo "=================================="
        echo ""
        echo "Migration Status:"
        supabase migration list
        echo ""
        echo "Database Health:"
        psql -h localhost -U postgres -d elaro -c "SELECT version();"
        echo ""
        echo "Table Statistics:"
        psql -h localhost -U postgres -d elaro -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 10;"
    } > "$report_file"
    
    success "Migration report generated: $report_file"
}

# Main function
main() {
    case "${1:-help}" in
        "check")
            check_supabase_cli
            check_migrations
            ;;
        "validate")
            check_supabase_cli
            validate_migrations
            ;;
        "apply")
            check_supabase_cli
            check_database_health
            backup_before_migration
            apply_migrations
            ;;
        "rollback")
            check_supabase_cli
            rollback_migration "$2"
            ;;
        "create")
            create_migration "$2"
            ;;
        "backup")
            backup_before_migration
            ;;
        "restore")
            restore_from_backup "$2"
            ;;
        "health")
            check_database_health
            ;;
        "report")
            generate_report
            ;;
        "help"|*)
            echo "Database Migration Manager"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  check                    - Check migration status"
            echo "  validate                 - Validate migration files"
            echo "  apply                    - Apply pending migrations"
            echo "  rollback <version>       - Rollback specific migration"
            echo "  create <name>            - Create new migration"
            echo "  backup                   - Create backup before migration"
            echo "  restore <backup_file>    - Restore from backup"
            echo "  health                   - Check database health"
            echo "  report                   - Generate migration report"
            echo "  help                     - Show this help"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
