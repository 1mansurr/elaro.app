# HMAC Request Signing for `send-welcome-email`

## Overview

The `send-welcome-email` Edge Function implements HMAC-SHA256 request signing to provide defense-in-depth security beyond service role key authentication. This protects against replay attacks, request tampering, and reduces the risk of service role key leakage.

## Security Guarantees

### 1. Replay Attack Prevention

**Mechanism:**

- Each request must include a unique nonce (UUID) in the `X-Nonce` header
- Nonces are stored in the `used_nonces` table with a 10-minute TTL
- Before processing, the function checks if the nonce has been used
- If a nonce is reused, the request is rejected as a replay attack

**How it works:**

1. Client generates a random UUID for each request
2. Server checks `used_nonces` table before processing
3. If nonce exists and hasn't expired → Reject (replay detected)
4. If nonce is new → Store it and proceed
5. Nonce expires after 10 minutes (automatic cleanup)

**Attack Scenario Prevented:**

- Attacker intercepts a valid request
- Attacker replays the exact same request
- **Result:** Rejected because nonce was already used

### 2. Request Tampering Prevention

**Mechanism:**

- Request body is included in the HMAC signature
- Signature format: `HMAC-SHA256(timestamp.nonce.rawBody)`
- Any modification to the body invalidates the signature

**How it works:**

1. Client computes: `signature = HMAC-SHA256(secret, timestamp.nonce.body)`
2. Server recomputes signature using received values
3. Constant-time comparison verifies signatures match
4. If signatures don't match → Reject (tampering detected)

**Attack Scenario Prevented:**

- Attacker intercepts request to send email to `user@example.com`
- Attacker modifies body to send to `attacker@evil.com`
- **Result:** Rejected because signature doesn't match modified body

### 3. Timestamp Freshness

**Mechanism:**

- Each request must include Unix timestamp in `X-Timestamp` header
- Server validates timestamp is within 5 minutes of current time
- Requests older than 5 minutes are rejected

**How it works:**

1. Client includes current Unix timestamp (seconds)
2. Server checks: `now - timestamp <= 300 seconds`
3. If timestamp is too old → Reject (stale request)

**Attack Scenario Prevented:**

- Attacker captures a valid request
- Attacker waits 6 minutes and replays it
- **Result:** Rejected because timestamp is outside tolerance window

### 4. Service Role Key Protection

**Mechanism:**

- HMAC secret (`INTERNAL_HMAC_SECRET`) is separate from service role key
- HMAC verification doesn't expose the service role key
- Even if HMAC secret leaks, service role key remains protected

**Defense in Depth:**

- **Layer 1:** HMAC signature verification (prevents replay/tampering)
- **Layer 2:** Service role key validation (additional authentication)
- Both layers must pass for request to be processed

## Implementation Details

### Required Headers

```http
X-Signature: <hex-encoded-hmac-sha256>
X-Timestamp: <unix-seconds>
X-Nonce: <uuid>
Authorization: Bearer <service-role-key>
```

### Signature Construction

**Canonical String Format:**

```
${timestamp}.${nonce}.${raw_request_body}
```

**Example:**

```
1699123456.550e8400-e29b-41d4-a716-446655440000.{"userEmail":"user@example.com","userId":"123","userFirstName":"John"}
```

**HMAC Computation:**

```typescript
const canonicalString = `${timestamp}.${nonce}.${rawBody}`;
const signature = await createHmacSha256(INTERNAL_HMAC_SECRET, canonicalString);
// Returns hex-encoded string
```

### Validation Flow

1. **Extract Headers** → Check all required headers present
2. **Validate Timestamp** → Must be within 5 minutes
3. **Check Nonce** → Must not exist in `used_nonces` table
4. **Verify Signature** → Constant-time comparison
5. **Store Nonce** → Insert into `used_nonces` (10 min TTL)
6. **Verify Service Key** → Constant-time comparison
7. **Process Request** → Only if all checks pass

### Constant-Time Comparison

**Why it matters:**

- Timing attacks can reveal which byte differs in comparison
- Constant-time comparison prevents information leakage
- Implementation uses XOR operation across all bytes

**Code:**

```typescript
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}
```

## Database Schema

### `used_nonces` Table

```sql
CREATE TABLE used_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);
```

**Indexes:**

- `idx_used_nonces_nonce` - Fast nonce lookups
- `idx_used_nonces_expires_at` - Cleanup of expired nonces

**TTL:** 10 minutes (matches timestamp tolerance window)

## Error Handling

**Security Principle:** Don't leak which check failed

All authentication failures return the same error:

- Status: `401 Unauthorized`
- Message: Generic "Unauthorized" message
- No details about which header/signature/timestamp failed

**Internal Logging:**

- Detailed error information logged server-side
- Includes which check failed (for debugging)
- No secrets logged (only prefixes/hashes)

## Client Implementation Example

```typescript
async function sendWelcomeEmail(data: WelcomeEmailRequest) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const rawBody = JSON.stringify(data);

  // Construct canonical string
  const canonicalString = `${timestamp}.${nonce}.${rawBody}`;

  // Compute HMAC signature
  const signature = await createHmacSha256(
    INTERNAL_HMAC_SECRET,
    canonicalString,
  );

  // Make request with all headers
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-welcome-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'X-Signature': signature,
        'X-Timestamp': timestamp.toString(),
        'X-Nonce': nonce,
      },
      body: rawBody,
    },
  );

  return response;
}
```

## Security Properties Summary

| Property                     | Mechanism                  | Guarantee                                   |
| ---------------------------- | -------------------------- | ------------------------------------------- |
| **Replay Prevention**        | Nonce uniqueness + storage | Each request can only be used once          |
| **Tampering Prevention**     | Body in signature          | Any body modification invalidates signature |
| **Freshness**                | Timestamp validation       | Requests older than 5 min rejected          |
| **Key Protection**           | Separate HMAC secret       | Service key not exposed in HMAC flow        |
| **Timing Attack Resistance** | Constant-time comparison   | No information leakage via timing           |
| **Defense in Depth**         | HMAC + Service Key         | Both must pass                              |

## Migration

**File:** `supabase/migrations/20260101000001_add_used_nonces.sql`

**Run:**

```bash
supabase migration up
```

**Environment Variable Required:**

```bash
INTERNAL_HMAC_SECRET=<strong-random-secret>
```

Generate a secure secret:

```bash
openssl rand -hex 32
```

## Maintenance

**Nonce Cleanup:**

- Nonces expire after 10 minutes (automatic via `expires_at`)
- Consider adding a cleanup job similar to `cleanup-idempotency-keys`
- Pattern: Delete nonces where `expires_at < NOW()`

**Monitoring:**

- Track HMAC verification failures (replay attacks)
- Monitor nonce storage errors (database issues)
- Alert on high failure rates (potential attack)
