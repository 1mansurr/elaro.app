import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useTheme } from '../contexts/ThemeContext';

interface HealthStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Component that displays the overall health status of the application.
 * Shows a simple indicator when compact, or detailed breakdown when expanded.
 */
export const HealthStatusIndicator: React.FC<HealthStatusIndicatorProps> = ({ 
  showDetails = false, 
  compact = true 
}) => {
  const { 
    healthStatus, 
    isLoading, 
    error, 
    isHealthy, 
    lastChecked, 
    checkHealth 
  } = useHealthCheck();
  
  const { theme } = useTheme();

  const getStatusColor = (status: 'ok' | 'error') => {
    return status === 'ok' ? theme.success : theme.destructive;
  };

  const getStatusIcon = (status: 'ok' | 'error') => {
    return status === 'ok' ? 'checkmark-circle' : 'alert-circle';
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity 
          style={styles.compactButton} 
          onPress={() => checkHealth(false)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Ionicons 
              name={getStatusIcon(isHealthy ? 'ok' : 'error')} 
              size={16} 
              color={getStatusColor(isHealthy ? 'ok' : 'error')} 
            />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>System Health</Text>
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: theme.accent }]}
          onPress={() => checkHealth(false)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={16} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.destructive + '20' }]}>
          <Text style={[styles.errorText, { color: theme.destructive }]}>
            Health check failed: {error}
          </Text>
        </View>
      )}

      {healthStatus && (
        <>
          <View style={styles.overallStatus}>
            <Ionicons 
              name={getStatusIcon(healthStatus.status)} 
              size={24} 
              color={getStatusColor(healthStatus.status)} 
            />
            <Text style={[styles.overallStatusText, { color: theme.text }]}>
              {healthStatus.status === 'ok' ? 'All Systems Operational' : 'Service Issues Detected'}
            </Text>
          </View>

          {showDetails && (
            <ScrollView style={styles.servicesContainer}>
              {healthStatus.services.map((service, index) => (
                <View key={index} style={[styles.serviceItem, { borderBottomColor: theme.border }]}>
                  <View style={styles.serviceHeader}>
                    <Ionicons 
                      name={getStatusIcon(service.status)} 
                      size={20} 
                      color={getStatusColor(service.status)} 
                    />
                    <Text style={[styles.serviceName, { color: theme.text }]}>
                      {service.service.toUpperCase()}
                    </Text>
                    {service.responseTime && (
                      <Text style={[styles.responseTime, { color: theme.textSecondary }]}>
                        {service.responseTime}ms
                      </Text>
                    )}
                  </View>
                  
                  {service.message && (
                    <Text style={[styles.serviceMessage, { color: theme.textSecondary }]}>
                      {service.message}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
              Last checked: {lastChecked?.toLocaleTimeString() || 'Never'}
            </Text>
            <Text style={[styles.version, { color: theme.textSecondary }]}>
              v{healthStatus.version} ({healthStatus.environment})
            </Text>
          </View>
        </>
      )}
    </View>
  );
};

/**
 * Simple health status badge for use in headers or navigation bars.
 */
export const HealthStatusBadge: React.FC = () => {
  const { isHealthy, isLoading } = useHealthCheck();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.badge}>
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={[
      styles.badge, 
      { backgroundColor: isHealthy ? theme.success + '20' : theme.destructive + '20' }
    ]}>
      <Ionicons 
        name={isHealthy ? 'checkmark-circle' : 'alert-circle'} 
        size={16} 
        color={isHealthy ? theme.success : theme.destructive} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButton: {
    padding: 8,
  },
  container: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  overallStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  overallStatusText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  servicesContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  serviceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  responseTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  serviceMessage: {
    fontSize: 12,
    marginLeft: 28,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
  },
  version: {
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
