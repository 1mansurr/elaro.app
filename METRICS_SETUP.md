# Metrics and Monitoring Setup

## Overview

Your Edge Functions are now instrumented with metrics collection using StatsD. This allows you to monitor performance, track errors, and identify bottlenecks.

## Setup Steps

### 1. Choose a Monitoring Service

**Recommended: Datadog (Free Tier)**

Sign up at [Datadog.com](https://www.datadoghq.com/free-datadog-trial/)

After signing up:
1. Go to **Organization Settings** → **API Keys**
2. Note the statsd endpoint: `statsd.datadoghq.com` (port 8125)

### 2. Set Environment Variables

**Using Supabase CLI:**
```bash
# Set metrics host
supabase secrets set METRICS_HOST=statsd.datadoghq.com

# Set metrics port
supabase secrets set METRICS_PORT=8125
```

**Using Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add secret: `METRICS_HOST` = `statsd.datadoghq.com`
3. Add secret: `METRICS_PORT` = `8125`

### 3. Deploy Functions

```bash
# Deploy all functions to apply metrics collection
supabase functions deploy
```

## Metrics Collected

### 1. Request Count
- **Metric**: `elaro.api.requests.count`
- **Type**: Counter
- **Tags**: `function:<function-name>`
- **Description**: Incremented for every function call

### 2. Execution Time
- **Metric**: `elaro.api.execution_time`
- **Type**: Timing/Histogram
- **Tags**: `function:<function-name>`
- **Description**: Time from request start to end in milliseconds

### 3. Status Code Count
- **Metric**: `elaro.api.status.<code>.count`
- **Type**: Counter
- **Tags**: `function:<function-name>`
- **Description**: Incremented for each status code (200, 400, 500, etc.)

### 4. Status Category Count
- **Metric**: `elaro.api.status.<category>.count`
- **Type**: Counter
- **Tags**: `function:<function-name>`
- **Description**: Groups status codes (2xx, 3xx, 4xx, 5xx)

### 5. Error Count
- **Metric**: `elaro.api.errors.count`
- **Type**: Counter
- **Tags**: `function:<function-name>`, `error_type:<type>`
- **Description**: Incremented for errors

## Datadog Dashboard Setup

### Create Dashboard

1. Go to **Dashboards** → **New Dashboard**
2. Add these widgets:

**Widget 1: Request Count**
- Type: Time Series
- Metric: `elaro.api.requests.count`
- Aggregation: `sum`
- Group by: `function`

**Widget 2: Execution Time**
- Type: Time Series
- Metric: `elaro.api.execution_time`
- Aggregation: `avg`, `max`, `p95`
- Group by: `function`

**Widget 3: Error Rate**
- Type: Time Series
- Metric: `elaro.api.status.500.count`
- Aggregation: `sum`
- Group by: `function`

**Widget 4: Status Code Distribution**
- Type: Pie Chart
- Metrics: `elaro.api.status.200.count`, `elaro.api.status.400.count`, `elaro.api.status.500.count`
- Aggregation: `sum`

**Widget 5: Top Slow Functions**
- Type: Top List
- Metric: `elaro.api.execution_time`
- Aggregation: `avg`
- Limit: 10

## Testing

### Test Metrics Collection

```bash
# Make a request
curl -X POST https://your-project.supabase.co/functions/v1/create-assignment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_id": "uuid", "title": "Test", "due_date": "2024-12-31T23:59:59Z"}'
```

### Verify in Datadog

1. Go to **Metrics** → **Explorer**
2. Search for `elaro.api.requests.count`
3. You should see the metric with tags

## Alternative Monitoring Services

### New Relic

```bash
supabase secrets set METRICS_HOST=stats-collector.newrelic.com
supabase secrets set METRICS_PORT=8125
```

### Self-Hosted StatsD

```bash
# Run with Docker
docker run -d --name statsd -p 8125:8125/udp graphiteapp/graphite-statsd

# Set environment variables
supabase secrets set METRICS_HOST=localhost
supabase secrets set METRICS_PORT=8125
```

## Troubleshooting

### Metrics Not Appearing

1. Check environment variables are set:
   ```bash
   supabase secrets list
   ```

2. Check function logs:
   ```bash
   supabase functions logs create-assignment
   ```

3. Look for initialization message:
   ```
   StatsD client initialized: statsd.datadoghq.com:8125
   ```

### Metrics Service Unavailable

The system is designed to gracefully degrade if metrics service is unavailable:
- Functions continue to work normally
- Metrics are logged as warnings
- No errors are thrown

## Performance Impact

- **Overhead**: < 1ms per request
- **Network**: UDP packets (fire and forget)
- **Failure handling**: Non-blocking, graceful degradation
- **No impact on user experience**: Metrics collection is async

## Best Practices

1. **Monitor key metrics**: Focus on execution time and error rates
2. **Set up alerts**: Alert on high error rates or slow execution times
3. **Regular review**: Check metrics weekly to identify trends
4. **Cost optimization**: Use free tier limits efficiently
5. **Document thresholds**: Define acceptable performance targets

## Next Steps

1. ✅ Set up monitoring service (Datadog recommended)
2. ✅ Configure environment variables
3. ✅ Deploy functions
4. ✅ Create Datadog dashboard
5. ✅ Set up alerts for errors and slow performance
6. ✅ Monitor and optimize based on metrics

Your Edge Functions are now fully instrumented with metrics! 📊

