# Pull Request

## Description

<!-- Describe your changes -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Backend Checklist

### Function Structure

- [ ] Uses `createAuthenticatedHandler` (or `createScheduledHandler` for cron jobs)
- [ ] Has Zod schema for validation (required for mutations)
- [ ] Returns typed responses (`successResponse<T>()` / `errorResponse()`)
- [ ] Idempotency key required for mutations (`requireIdempotency: true`)
- [ ] Error handling uses `AppError` with error codes

### Security

- [ ] No PII in logs (uses `logger.info/error` which auto-redacts)
- [ ] Error messages sanitized (no internal details)
- [ ] User ownership verified before operations
- [ ] Input validation with Zod schemas

### Performance

- [ ] Database operations use retry wrapper (`dbInsert`, `dbUpdate`, etc.)
- [ ] Long-running work offloaded to job queue (if > 10 seconds)
- [ ] Metrics collected automatically (via handler)

### Observability

- [ ] Logs include trace ID (automatic via handler)
- [ ] Structured logging (uses `logger` utility)
- [ ] Error logging includes context
- [ ] Sentry integration (automatic via handler)

### Code Quality

- [ ] TypeScript types defined
- [ ] No console.log (use `logger` instead)
- [ ] Follows existing patterns
- [ ] Tests added/updated (if applicable)

## Testing

- [ ] Tested locally
- [ ] Manual testing completed
- [ ] Edge cases considered

## Related Issues

<!-- Link related issues here -->

Closes #

## Additional Notes

<!-- Any additional information -->
