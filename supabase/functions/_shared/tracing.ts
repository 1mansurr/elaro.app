/**
 * Distributed Tracing Support
 *
 * Provides request tracing across Edge Functions using trace IDs
 * for correlating logs and debugging cross-function flows.
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/**
 * Generate a new trace ID
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a new span ID
 */
export function generateSpanId(): string {
  return crypto.randomUUID().substring(0, 16); // Shorter span IDs
}

/**
 * Extract trace context from request headers
 */
export function extractTraceContext(req: Request): TraceContext {
  const traceId = req.headers.get('X-Trace-ID') || generateTraceId();
  const spanId = req.headers.get('X-Span-ID') || generateSpanId();
  const parentSpanId = req.headers.get('X-Parent-Span-ID');

  return { traceId, spanId, parentSpanId };
}

/**
 * Add trace headers to response or new request
 */
export function addTraceHeaders(
  headers: Headers,
  context: TraceContext,
): Headers {
  headers.set('X-Trace-ID', context.traceId);
  headers.set('X-Span-ID', context.spanId);
  if (context.parentSpanId) {
    headers.set('X-Parent-Span-ID', context.parentSpanId);
  }
  return headers;
}

/**
 * Create trace context for child spans (nested function calls)
 */
export function createChildSpan(parentContext: TraceContext): TraceContext {
  return {
    traceId: parentContext.traceId,
    spanId: generateSpanId(),
    parentSpanId: parentContext.spanId,
  };
}
