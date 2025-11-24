# Health Check Integration Examples

## Quick Integration Guide

Here are practical examples of how to integrate the health check system into your application:

## 1. App.tsx Integration (Recommended)

```typescript
// Add to App.tsx for startup health monitoring
import { useEffect } from 'react';
import { healthCheckService } from './src/services/healthCheckService';

export default function App() {
  useEffect(() => {
    const performStartupHealthCheck = async () => {
      try {
        // Quick health check with 3-second timeout
        const healthStatus = await healthCheckService.quickCheck(3000);

        if (!healthStatus || healthStatus.status !== 'ok') {
          console.warn('Some services are experiencing issues:', healthStatus);
          // Optionally show a banner or notification to users
        } else {
          console.log('All services are healthy');
        }
      } catch (error) {
        console.error('Startup health check failed:', error);
        // App continues to function normally
      }
    };

    performStartupHealthCheck();
  }, []);

  // Rest of your app...
}
```

## 2. Error Boundary Integration

```typescript
// In your error boundary component
import { healthCheckService } from '../services/healthCheckService';

class ErrorBoundary extends React.Component {
  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Perform health check when errors occur
    const healthStatus = await healthCheckService.checkHealth();

    if (healthStatus.status !== 'ok') {
      console.log('Error may be related to service outage:', healthStatus);
      // Show service-specific error message to user
    } else {
      console.log('Services are healthy, error is likely app-specific');
      // Show generic error message
    }
  }
}
```

## 3. Settings Screen Integration

```typescript
// Add to AccountScreen.tsx or settings screen
import { HealthStatusIndicator } from '../components';

const AccountScreen = () => {
  return (
    <ScrollView>
      {/* Existing content */}

      {/* Add health status section */}
      <Card title="System Status">
        <HealthStatusIndicator showDetails={true} />
      </Card>
    </ScrollView>
  );
};
```

## 4. Header/Navigation Integration

```typescript
// Add health status badge to navigation header
import { HealthStatusBadge } from '../components';

const AppHeader = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>ELARO</Text>
      <HealthStatusBadge />
    </View>
  );
};
```

## 5. Network Error Handling

```typescript
// In your API service or error handling
import { healthCheckService } from '../services/healthCheckService';

const handleApiError = async (error: Error) => {
  // Check if error might be related to service outages
  const healthStatus = await healthCheckService.quickCheck(2000);

  if (healthStatus?.status !== 'ok') {
    // Show service outage message
    showAlert(
      'Service Temporarily Unavailable',
      'Some services are experiencing issues. Please try again later.',
    );
  } else {
    // Show generic error message
    showAlert('Error', 'Something went wrong. Please try again.');
  }
};
```

## 6. Periodic Health Monitoring

```typescript
// For background health monitoring
import { useEffect } from 'react';
import { healthCheckService } from '../services/healthCheckService';

const useHealthMonitoring = () => {
  useEffect(() => {
    const interval = setInterval(async () => {
      const healthStatus = await healthCheckService.checkHealth();

      if (healthStatus.status !== 'ok') {
        console.warn('Service degradation detected:', healthStatus);
        // Optionally notify user or log to analytics
      }
    }, 300000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);
};
```

## 7. Admin Dashboard Integration

```typescript
// For admin users to monitor system health
import { useHealthCheck } from '../hooks/useHealthCheck';

const AdminDashboard = () => {
  const { healthStatus, isLoading, checkHealth } = useHealthCheck();

  return (
    <View>
      <Text style={styles.title}>System Health Dashboard</Text>

      <HealthStatusIndicator showDetails={true} />

      <Button
        title="Refresh Health Status"
        onPress={() => checkHealth(false)}
        loading={isLoading}
      />

      {healthStatus && (
        <View style={styles.details}>
          <Text>Last Checked: {healthStatus.timestamp}</Text>
          <Text>Environment: {healthStatus.environment}</Text>
          <Text>Version: {healthStatus.version}</Text>
        </View>
      )}
    </View>
  );
};
```

## 8. Payment Error Handling

```typescript
// In payment-related error handling
import { healthCheckService } from '../services/healthCheckService';

const handlePaymentError = async (error: Error) => {
  const paystackStatus = await healthCheckService.checkService('paystack');

  if (paystackStatus?.status === 'error') {
    showAlert(
      'Payment Service Unavailable',
      'Our payment processor is temporarily unavailable. Please try again later.',
    );
  } else {
    showAlert(
      'Payment Failed',
      'There was an issue processing your payment. Please check your details and try again.',
    );
  }
};
```

## 9. Notification Error Handling

```typescript
// In notification-related error handling
import { healthCheckService } from '../services/healthCheckService';

const handleNotificationError = async (error: Error) => {
  const expoStatus = await healthCheckService.checkService('expo-push');

  if (expoStatus?.status === 'error') {
    console.log('Notification service is down, scheduling retry...');
    // Schedule retry or use alternative notification method
  } else {
    console.log('Notification service is healthy, error is likely temporary');
  }
};
```

## 10. Development/Testing Integration

```typescript
// For development and testing
import { healthCheckService } from '../services/healthCheckService';

const DevTools = () => {
  const [healthStatus, setHealthStatus] = useState(null);

  const runHealthCheck = async () => {
    const status = await healthCheckService.checkHealth(false); // Force fresh check
    setHealthStatus(status);
  };

  return (
    <View>
      <Button title="Run Health Check" onPress={runHealthCheck} />
      {healthStatus && (
        <Text>{JSON.stringify(healthStatus, null, 2)}</Text>
      )}
    </View>
  );
};
```

## Deployment Checklist

1. **Deploy Health Check Function**: The Edge Function will be automatically deployed
2. **Set Environment Variables**: Ensure all required environment variables are set
3. **Test Endpoint**: Verify the health check endpoint is accessible
4. **Integrate Frontend**: Add health checks to your app as shown above
5. **Monitor Results**: Check logs to ensure health checks are working properly

## Environment Variables Required

```bash
# These should already be set in your Supabase project
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PAYSTACK_SECRET_KEY=your-paystack-secret-key
ENVIRONMENT=production
```

## Testing the Health Check

You can test the health check endpoint directly:

```bash
curl -X GET https://your-project.supabase.co/functions/v1/health-check
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-01-27T19:00:00.000Z",
  "services": [
    {
      "service": "supabase",
      "status": "ok",
      "message": "Database connection and RLS policies working",
      "responseTime": 45
    },
    {
      "service": "paystack",
      "status": "ok",
      "message": "API key valid and service responsive",
      "responseTime": 234
    },
    {
      "service": "expo-push",
      "status": "ok",
      "message": "Expo Push service is accessible",
      "responseTime": 156
    }
  ],
  "version": "1.0.0",
  "environment": "production"
}
```

This health check system will provide invaluable diagnostic capabilities and help ensure a better user experience by quickly identifying service-related issues.
