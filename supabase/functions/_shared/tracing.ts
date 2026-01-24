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
export function extractTraceContext(
  req: Request | Record<string, unknown>,
): TraceContext {
  // Handle case where req might have been spread or modified and lost headers
  // Try to access headers from the request object safely
  let headers: Headers | null = null;

  try {
    if (req instanceof Request) {
      headers = req.headers;
    } else if (req && typeof req === 'object') {
      // Try to access headers property safely
      const reqWithHeaders = req as {
        headers?: Headers | { get?: (key: string) => string | null };
      };
      if (
        reqWithHeaders.headers &&
        typeof reqWithHeaders.headers.get === 'function'
      ) {
        headers = reqWithHeaders.headers as Headers;
      } else if ('headers' in req && req.headers) {
        // Headers might exist but not be a Headers object
        try {
          const headersObj = req.headers as {
            get?: (key: string) => string | null;
          };
          if (typeof headersObj.get === 'function') {
            headers = headersObj as Headers;
          }
        } catch {
          // Ignore errors accessing headers
        }
      }
    }
  } catch (_error) {
    // If accessing headers fails, continue without them
    // This can happen if the request object has been modified
  }

  // If headers are accessible, use them; otherwise generate new trace IDs
  let traceId = generateTraceId();
  let spanId = generateSpanId();
  let parentSpanId: string | undefined;

  if (headers) {
    try {
      traceId = headers.get('X-Trace-ID') || traceId;
      spanId = headers.get('X-Span-ID') || spanId;
      parentSpanId = headers.get('X-Parent-Span-ID') || undefined;
    } catch (_error) {
      // If get() fails, use generated IDs
    }
  }

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
