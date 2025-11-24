#!/bin/bash

# Database Performance Monitor
# Comprehensive performance monitoring and optimization for ELARO database

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/performance.log"

# Database configuration
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-54322}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"

# Monitoring configuration
SLOW_QUERY_THRESHOLD="${SLOW_QUERY_THRESHOLD:-1000}" # milliseconds
MONITORING_INTERVAL="${MONITORING_INTERVAL:-60}" # seconds
ALERT_EMAIL="${ALERT_EMAIL:-admin@elaro.com}"

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

# Check database connection
check_database_connection() {
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to database $DB_NAME on $DB_HOST:$DB_PORT"
    fi
}

# Monitor slow queries
monitor_slow_queries() {
    log "Monitoring slow queries..."
    
    # Get slow queries from pg_stat_statements
    local slow_queries=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
        FROM pg_stat_statements 
        WHERE mean_time > $SLOW_QUERY_THRESHOLD
        ORDER BY mean_time DESC
        LIMIT 10;
    " 2>/dev/null || echo "")
    
    if [[ -n "$slow_queries" ]]; then
        warning "Found slow queries:"
        echo "$slow_queries"
        
        # Log to database
        echo "$slow_queries" | while IFS='|' read -r query calls total_time mean_time rows; do
            if [[ -n "$query" ]]; then
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                    INSERT INTO public.slow_queries (query_text, execution_time, rows_returned)
                    VALUES ('$query', '$mean_time', $rows)
                    ON CONFLICT DO NOTHING;
                " > /dev/null 2>&1 || true
            fi
        done
    else
        log "No slow queries detected"
    fi
}

# Monitor database locks
monitor_locks() {
    log "Monitoring database locks..."
    
    local lock_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM pg_locks WHERE NOT granted;
    " 2>/dev/null || echo "0")
    
    if [[ $lock_count -gt 0 ]]; then
        warning "Found $lock_count active locks"
        
        # Get lock details
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                l.locktype,
                l.mode,
                l.granted,
                l.pid,
                a.query,
                a.state,
                a.query_start
            FROM pg_locks l
            JOIN pg_stat_activity a ON l.pid = a.pid
            WHERE NOT l.granted
            ORDER BY a.query_start;
        " 2>/dev/null || true
    else
        log "No active locks detected"
    fi
}

# Monitor long-running queries
monitor_long_running_queries() {
    log "Monitoring long-running queries..."
    
    local long_queries=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < NOW() - INTERVAL '5 minutes';
    " 2>/dev/null || echo "0")
    
    if [[ $long_queries -gt 0 ]]; then
        warning "Found $long_queries long-running queries"
        
        # Get long-running query details
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                pid,
                now() - pg_stat_activity.query_start AS duration,
                query,
                state
            FROM pg_stat_activity
            WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
            AND state = 'active'
            ORDER BY duration DESC;
        " 2>/dev/null || true
    else
        log "No long-running queries detected"
    fi
}

# Monitor database size
monitor_database_size() {
    log "Monitoring database size..."
    
    local db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    " 2>/dev/null || echo "Unknown")
    
    log "Database size: $db_size"
    
    # Check for large tables
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    " 2>/dev/null || true
}

# Monitor index usage
monitor_index_usage() {
    log "Monitoring index usage..."
    
    # Update index usage statistics
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT update_index_usage();
    " > /dev/null 2>&1 || true
    
    # Get unused indexes
    local unused_indexes=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT index_name FROM get_unused_indexes() LIMIT 5;
    " 2>/dev/null || echo "")
    
    if [[ -n "$unused_indexes" ]]; then
        warning "Found unused indexes:"
        echo "$unused_indexes"
    else
        log "No unused indexes detected"
    fi
}

# Monitor connection count
monitor_connections() {
    log "Monitoring database connections..."
    
    local connection_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM pg_stat_activity;
    " 2>/dev/null || echo "0")
    
    local max_connections=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT setting FROM pg_settings WHERE name = 'max_connections';
    " 2>/dev/null || echo "100")
    
    local connection_percentage=$((connection_count * 100 / max_connections))
    
    log "Active connections: $connection_count / $max_connections ($connection_percentage%)"
    
    if [[ $connection_percentage -gt 80 ]]; then
        warning "High connection usage: $connection_percentage%"
    fi
}

# Get performance recommendations
get_performance_recommendations() {
    log "Getting performance recommendations..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            recommendation_type,
            description,
            impact,
            effort,
            estimated_improvement
        FROM get_performance_recommendations()
        ORDER BY 
            CASE impact 
                WHEN 'High' THEN 1 
                WHEN 'Medium' THEN 2 
                WHEN 'Low' THEN 3 
            END,
            CASE effort 
                WHEN 'Low' THEN 1 
                WHEN 'Medium' THEN 2 
                WHEN 'High' THEN 3 
            END;
    " 2>/dev/null || log "No performance recommendations available"
}

# Run database optimization
run_optimization() {
    log "Running database optimization..."
    
    # Run optimization function
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT optimize_database();
    " > /dev/null 2>&1 || true
    
    success "Database optimization completed"
}

# Generate performance report
generate_performance_report() {
    log "Generating performance report..."
    
    local report_file="$PROJECT_ROOT/reports/performance_report_$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p "$(dirname "$report_file")"
    
    {
        echo "Database Performance Report - $(date)"
        echo "======================================"
        echo ""
        echo "Database Information:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" 2>/dev/null || echo "  Unable to get version"
        echo ""
        echo "Database Size:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null || echo "  Unable to get size"
        echo ""
        echo "Connection Statistics:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                COUNT(*) as total_connections,
                COUNT(*) FILTER (WHERE state = 'active') as active_connections,
                COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
            FROM pg_stat_activity;
        " 2>/dev/null || echo "  Unable to get connection stats"
        echo ""
        echo "Top 10 Tables by Size:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10;
        " 2>/dev/null || echo "  Unable to get table sizes"
        echo ""
        echo "Slow Queries (Last 24 hours):"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                query_text,
                execution_time,
                rows_returned,
                created_at
            FROM get_slow_queries(10, '1 second')
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY execution_time DESC;
        " 2>/dev/null || echo "  No slow queries found"
        echo ""
        echo "Performance Recommendations:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                recommendation_type,
                description,
                impact,
                effort,
                estimated_improvement
            FROM get_performance_recommendations();
        " 2>/dev/null || echo "  No recommendations available"
    } > "$report_file"
    
    success "Performance report generated: $report_file"
}

# Continuous monitoring
start_monitoring() {
    log "Starting continuous performance monitoring..."
    log "Monitoring interval: $MONITORING_INTERVAL seconds"
    log "Slow query threshold: $SLOW_QUERY_THRESHOLD ms"
    
    while true; do
        log "=== Performance Check $(date) ==="
        
        monitor_slow_queries
        monitor_locks
        monitor_long_running_queries
        monitor_database_size
        monitor_index_usage
        monitor_connections
        
        log "=== End Performance Check ==="
        echo ""
        
        sleep "$MONITORING_INTERVAL"
    done
}

# Alert on performance issues
check_alerts() {
    log "Checking for performance alerts..."
    
    # Check for slow queries
    local slow_query_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM get_slow_queries(1, '5 seconds');
    " 2>/dev/null || echo "0")
    
    if [[ $slow_query_count -gt 0 ]]; then
        warning "ALERT: $slow_query_count slow queries detected"
        # Send email alert if configured
        if [[ -n "$ALERT_EMAIL" ]]; then
            echo "Slow queries detected in database $DB_NAME" | mail -s "Database Performance Alert" "$ALERT_EMAIL" 2>/dev/null || true
        fi
    fi
    
    # Check for high connection usage
    local connection_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM pg_stat_activity;
    " 2>/dev/null || echo "0")
    
    local max_connections=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT setting FROM pg_settings WHERE name = 'max_connections';
    " 2>/dev/null || echo "100")
    
    local connection_percentage=$((connection_count * 100 / max_connections))
    
    if [[ $connection_percentage -gt 90 ]]; then
        warning "ALERT: High connection usage: $connection_percentage%"
        # Send email alert if configured
        if [[ -n "$ALERT_EMAIL" ]]; then
            echo "High connection usage detected in database $DB_NAME: $connection_percentage%" | mail -s "Database Connection Alert" "$ALERT_EMAIL" 2>/dev/null || true
        fi
    fi
}

# Main function
main() {
    case "${1:-help}" in
        "monitor")
            check_database_connection
            monitor_slow_queries
            monitor_locks
            monitor_long_running_queries
            monitor_database_size
            monitor_index_usage
            monitor_connections
            ;;
        "start")
            check_database_connection
            start_monitoring
            ;;
        "optimize")
            check_database_connection
            run_optimization
            ;;
        "recommendations")
            check_database_connection
            get_performance_recommendations
            ;;
        "report")
            check_database_connection
            generate_performance_report
            ;;
        "alerts")
            check_database_connection
            check_alerts
            ;;
        "help"|*)
            echo "Database Performance Monitor"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  monitor                  - Run one-time performance check"
            echo "  start                    - Start continuous monitoring"
            echo "  optimize                 - Run database optimization"
            echo "  recommendations          - Get performance recommendations"
            echo "  report                   - Generate performance report"
            echo "  alerts                   - Check for performance alerts"
            echo "  help                     - Show this help"
            echo ""
            echo "Environment Variables:"
            echo "  SLOW_QUERY_THRESHOLD     - Slow query threshold in ms (default: 1000)"
            echo "  MONITORING_INTERVAL      - Monitoring interval in seconds (default: 60)"
            echo "  ALERT_EMAIL              - Email for alerts (default: admin@elaro.com)"
            echo "  DB_HOST                  - Database host (default: localhost)"
            echo "  DB_PORT                  - Database port (default: 5432)"
            echo "  DB_NAME                  - Database name (default: elaro)"
            echo "  DB_USER                  - Database user (default: postgres)"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
