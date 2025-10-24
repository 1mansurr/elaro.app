#!/bin/bash
# Database Dashboard - Comprehensive monitoring and analysis tool

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/dashboard.log"

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
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

log_message() {
  local type="$1"
  local message="$2"
  echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] [$type] $message" | tee -a "$LOG_FILE"
}

# Function to execute SQL and return results
execute_sql() {
  local sql="$1"
  PGPASSWORD=$DB_USER psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$sql" 2>/dev/null
}

# Function to get database health score
get_health_score() {
  echo -e "${BLUE}📊 Database Health Score${NC}"
  echo "================================"
  
  local health_data=$(execute_sql "SELECT health_score, performance_score, efficiency_score, maintenance_score, overall_status FROM calculate_database_health_score();")
  
  if [ -n "$health_data" ]; then
    echo "$health_data" | while IFS='|' read -r health_score performance_score efficiency_score maintenance_score overall_status; do
      # Trim whitespace
      health_score=$(echo "$health_score" | xargs)
      performance_score=$(echo "$performance_score" | xargs)
      efficiency_score=$(echo "$efficiency_score" | xargs)
      maintenance_score=$(echo "$maintenance_score" | xargs)
      overall_status=$(echo "$overall_status" | xargs)
      
      # Color code based on score
      if (( $(echo "$health_score >= 90" | bc -l) )); then
        status_color=$GREEN
        status_icon="🟢"
      elif (( $(echo "$health_score >= 75" | bc -l) )); then
        status_color=$YELLOW
        status_icon="🟡"
      else
        status_color=$RED
        status_icon="🔴"
      fi
      
      echo -e "${status_icon} Overall Health: ${status_color}$health_score%${NC} ($overall_status)"
      echo -e "   Performance: $performance_score%"
      echo -e "   Efficiency: $efficiency_score%"
      echo -e "   Maintenance: $maintenance_score%"
    done
  else
    echo -e "${RED}❌ Unable to retrieve health score${NC}"
  fi
  echo
}

# Function to show performance bottlenecks
show_bottlenecks() {
  echo -e "${YELLOW}⚠️  Performance Bottlenecks${NC}"
  echo "================================"
  
  local bottlenecks=$(execute_sql "SELECT bottleneck_type, description, severity, impact_score, recommendation FROM detect_performance_bottlenecks();")
  
  if [ -n "$bottlenecks" ]; then
    echo "$bottlenecks" | while IFS='|' read -r bottleneck_type description severity impact_score recommendation; do
      # Trim whitespace
      bottleneck_type=$(echo "$bottleneck_type" | xargs)
      description=$(echo "$description" | xargs)
      severity=$(echo "$severity" | xargs)
      impact_score=$(echo "$impact_score" | xargs)
      recommendation=$(echo "$recommendation" | xargs)
      
      # Color code based on severity
      case "$severity" in
        "critical")
          severity_color=$RED
          severity_icon="🔴"
          ;;
        "warning")
          severity_color=$YELLOW
          severity_icon="🟡"
          ;;
        *)
          severity_color=$GREEN
          severity_icon="🟢"
          ;;
      esac
      
      echo -e "${severity_icon} $bottleneck_type: ${severity_color}$severity${NC} (Impact: $impact_score)"
      echo -e "   $description"
      echo -e "   💡 $recommendation"
      echo
    done
  else
    echo -e "${GREEN}✅ No performance bottlenecks detected${NC}"
  fi
  echo
}

# Function to show maintenance status
show_maintenance_status() {
  echo -e "${PURPLE}🔧 Maintenance Status${NC}"
  echo "================================"
  
  local maintenance_data=$(execute_sql "SELECT total_tasks, pending_tasks, running_tasks, completed_tasks, failed_tasks, failed_tasks_24h, avg_execution_time FROM get_maintenance_status();")
  
  if [ -n "$maintenance_data" ]; then
    echo "$maintenance_data" | while IFS='|' read -r total_tasks pending_tasks running_tasks completed_tasks failed_tasks failed_tasks_24h avg_execution_time; do
      # Trim whitespace
      total_tasks=$(echo "$total_tasks" | xargs)
      pending_tasks=$(echo "$pending_tasks" | xargs)
      running_tasks=$(echo "$running_tasks" | xargs)
      completed_tasks=$(echo "$completed_tasks" | xargs)
      failed_tasks=$(echo "$failed_tasks" | xargs)
      failed_tasks_24h=$(echo "$failed_tasks_24h" | xargs)
      avg_execution_time=$(echo "$avg_execution_time" | xargs)
      
      echo -e "📋 Total Tasks: $total_tasks"
      echo -e "⏳ Pending: $pending_tasks"
      echo -e "🏃 Running: $running_tasks"
      echo -e "✅ Completed: $completed_tasks"
      echo -e "❌ Failed: $failed_tasks"
      echo -e "⚠️  Failed (24h): $failed_tasks_24h"
      echo -e "⏱️  Avg Execution Time: $avg_execution_time"
    done
  else
    echo -e "${YELLOW}⚠️  No maintenance data available${NC}"
  fi
  echo
}

# Function to show database metrics
show_database_metrics() {
  echo -e "${CYAN}📈 Database Metrics${NC}"
  echo "================================"
  
  # Database size
  local db_size=$(execute_sql "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
  echo -e "💾 Database Size: $db_size"
  
  # Table count
  local table_count=$(execute_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
  echo -e "📊 Tables: $table_count"
  
  # Index count
  local index_count=$(execute_sql "SELECT COUNT(*) FROM pg_stat_user_indexes;")
  echo -e "🔍 Indexes: $index_count"
  
  # Active connections
  local connections=$(execute_sql "SELECT COUNT(*) FROM pg_stat_activity;")
  echo -e "🔗 Active Connections: $connections"
  
  # Recent activity
  local recent_events=$(execute_sql "SELECT COUNT(*) FROM user_events WHERE created_at > NOW() - INTERVAL '1 hour';")
  echo -e "📝 Events (1h): $recent_events"
  
  echo
}

# Function to show recent performance report
show_performance_report() {
  echo -e "${GREEN}📊 Performance Report${NC}"
  echo "================================"
  
  local report_data=$(execute_sql "SELECT report_section, metric_name, metric_value, status, recommendation FROM generate_performance_report();")
  
  if [ -n "$report_data" ]; then
    echo "$report_data" | while IFS='|' read -r report_section metric_name metric_value status recommendation; do
      # Trim whitespace
      report_section=$(echo "$report_section" | xargs)
      metric_name=$(echo "$metric_name" | xargs)
      metric_value=$(echo "$metric_value" | xargs)
      status=$(echo "$status" | xargs)
      recommendation=$(echo "$recommendation" | xargs)
      
      echo -e "📋 $report_section"
      echo -e "   $metric_name: $metric_value"
      echo -e "   Status: $status"
      echo -e "   💡 $recommendation"
      echo
    done
  else
    echo -e "${YELLOW}⚠️  No performance report data available${NC}"
  fi
  echo
}

# Function to show quick actions
show_quick_actions() {
  echo -e "${BLUE}⚡ Quick Actions${NC}"
  echo "================================"
  echo -e "1. ${GREEN}Run Optimization${NC}: ./scripts/performance-monitor.sh optimize"
  echo -e "2. ${GREEN}Check Slow Queries${NC}: ./scripts/performance-monitor.sh slow-queries"
  echo -e "3. ${GREEN}Check Unused Indexes${NC}: ./scripts/performance-monitor.sh unused-indexes"
  echo -e "4. ${GREEN}Create Backup${NC}: ./scripts/backup-manager.sh full"
  echo -e "5. ${GREEN}Run Maintenance${NC}: PGPASSWORD='postgres' psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c \"SELECT * FROM run_automated_maintenance();\""
  echo
}

# Main dashboard function
show_dashboard() {
  clear
  echo -e "${PURPLE}🚀 ELARO Database Dashboard${NC}"
  echo -e "${PURPLE}==============================${NC}"
  echo -e "📅 $(date)"
  echo -e "🖥️  Host: $DB_HOST:$DB_PORT"
  echo -e "🗄️  Database: $DB_NAME"
  echo
  
  get_health_score
  show_bottlenecks
  show_maintenance_status
  show_database_metrics
  show_performance_report
  show_quick_actions
  
  echo -e "${GREEN}✅ Dashboard refresh completed${NC}"
  log_message "INFO" "Dashboard displayed successfully"
}

# Function to run continuous monitoring
monitor_continuous() {
  echo -e "${BLUE}🔄 Starting continuous monitoring...${NC}"
  echo -e "Press Ctrl+C to stop"
  echo
  
  while true; do
    show_dashboard
    echo -e "${YELLOW}⏳ Refreshing in 30 seconds...${NC}"
    sleep 30
  done
}

# Function to show help
show_help() {
  echo -e "${BLUE}ELARO Database Dashboard${NC}"
  echo "Usage: $0 [OPTION]"
  echo
  echo "Options:"
  echo "  dashboard    Show comprehensive dashboard (default)"
  echo "  health       Show health score only"
  echo "  bottlenecks  Show performance bottlenecks only"
  echo "  maintenance  Show maintenance status only"
  echo "  metrics      Show database metrics only"
  echo "  monitor      Start continuous monitoring"
  echo "  help         Show this help message"
  echo
  echo "Examples:"
  echo "  $0                    # Show full dashboard"
  echo "  $0 health            # Show health score"
  echo "  $0 monitor           # Start continuous monitoring"
}

# Main script logic
case "${1:-dashboard}" in
  "dashboard")
    show_dashboard
    ;;
  "health")
    get_health_score
    ;;
  "bottlenecks")
    show_bottlenecks
    ;;
  "maintenance")
    show_maintenance_status
    ;;
  "metrics")
    show_database_metrics
    ;;
  "monitor")
    monitor_continuous
    ;;
  "help"|"-h"|"--help")
    show_help
    ;;
  *)
    echo -e "${RED}❌ Unknown option: $1${NC}"
    show_help
    exit 1
    ;;
esac
