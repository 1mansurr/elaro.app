# Master Key Security System

**Document Version:** 1.0  
**Last Updated:** 2025-01-31  
**Purpose:** Comprehensive guide for the master key security system that enables legal access to encrypted user data while maintaining privacy by default.

---

## Overview

The master key system provides a secure backdoor mechanism that allows top-level admins to decrypt user data when legally required (e.g., court orders, legal compliance). The system ensures:

- **Privacy by Default**: User data remains encrypted in the database
- **Legal Access**: Top-level admins can decrypt data when needed with proper authorization
- **Audit Trail**: All decryption attempts are logged
- **Dual Admin Control**: Master key resets require approval from 2 top-level admins

---

## Architecture

### Database Tables

1. **`master_decryption_keys`**
   - Stores hashed master keys
   - Only one active key at a time
   - Tracks creation and deactivation

2. **`master_key_reset_requests`**
   - Tracks reset requests
   - Requires dual admin approval
   - Auto-expires after 12 hours

### Edge Functions

1. **`admin-setup-master-key`** - One-time initial setup
2. **`admin-decrypt-user-data`** - Decrypt user data (single field or bulk)
3. **`admin-initiate-master-key-reset`** - Admin A initiates reset
4. **`admin-approve-master-key-reset`** - Admin B approves reset

---

## Security Features

### Master Key Storage

- Master keys are **never stored in plain text**
- Keys are hashed using PBKDF2 with 100,000 iterations
- Hash includes salt for additional security
- Only the hash is stored in the database

### Access Control

- Only users with `role = 'admin'` (top-level admins) can:
  - Set up master keys
  - Decrypt user data
  - Initiate/approve resets

### Audit Logging

All decryption attempts are logged in `admin_actions` table with:
- Admin user ID
- Target user ID (if applicable)
- What data was decrypted
- Timestamp
- Reason/purpose (optional)

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the migration
supabase migration up
```

### 2. Migrate Existing Master Key

If you have an existing master key from the old system:

```bash
deno run --allow-net --allow-env scripts/migrate-master-key.ts <your-master-key> <admin-user-id>
```

**Example:**
```bash
deno run --allow-net --allow-env scripts/migrate-master-key.ts "your-secure-master-key-here" "123e4567-e89b-12d3-a456-426614174000"
```

### 3. Set Up New Master Key (if no existing key)

If you don't have an existing master key, use the setup function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-setup-master-key \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "master_key": "your-secure-master-key-at-least-32-characters",
    "idempotency_key": "unique-key-here"
  }'
```

---

## Usage Guide

### Decrypting User Data

#### Single Field Decryption

Decrypt a single encrypted field:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-decrypt-user-data \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "encrypted_text": "base64-encrypted-text-here",
    "master_key": "your-master-key",
    "reason": "Court order #12345"
  }'
```

**Response:**
```json
{
  "decrypted_text": "decrypted content"
}
```

#### Bulk Field Decryption

Decrypt multiple fields from a record:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-decrypt-user-data \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "record_type": "assignment",
    "record_id": "123e4567-e89b-12d3-a456-426614174000",
    "fields": ["title", "description"],
    "master_key": "your-master-key",
    "reason": "Legal investigation"
  }'
```

**Supported record types:**
- `assignment`
- `lecture`
- `study_session`
- `course`

**Response:**
```json
{
  "decrypted_record": {
    "id": "...",
    "user_id": "...",
    "title": "decrypted title",
    "description": "decrypted description",
    ...
  }
}
```

---

## Master Key Reset Process

### Step 1: Admin A Initiates Reset

```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-initiate-master-key-reset \
  -H "Authorization: Bearer <admin-a-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "new_master_key": "new-secure-master-key-at-least-32-characters",
    "reason": "Key rotation for security",
    "idempotency_key": "unique-key-here"
  }'
```

**Requirements:**
- At least 2 top-level admins must exist
- No pending reset requests
- New key must be at least 32 characters

**Response:**
```json
{
  "success": true,
  "reset_request_id": "uuid-here",
  "expires_at": "2025-01-31T12:00:00Z",
  "message": "Reset request created. Requires approval from another top-level admin."
}
```

### Step 2: Admin B Approves Reset

```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-approve-master-key-reset \
  -H "Authorization: Bearer <admin-b-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reset_request_id": "uuid-from-step-1",
    "reason": "Approved for security rotation",
    "idempotency_key": "unique-key-here"
  }'
```

**Requirements:**
- Must be a different admin than the one who initiated
- Reset request must not be expired (< 12 hours old)
- Reset request must be pending

**Response:**
```json
{
  "success": true,
  "message": "Master key reset approved and completed",
  "new_master_key_id": "uuid-here",
  "created_at": "2025-01-31T12:00:00Z"
}
```

**What Happens:**
1. Old master key is deactivated
2. New master key is activated
3. Reset request is marked as approved
4. Action is logged in `admin_actions`

---

## Security Considerations

### Master Key Storage

- **Never** store the master key in:
  - Environment variables
  - Code repositories
  - Plain text files
  - Database (only hash is stored)

- **Recommended** storage locations:
  - Password manager (1Password, LastPass, etc.)
  - Hardware security module (HSM)
  - Encrypted vault
  - Secure physical location (safe)

### Key Rotation

- Rotate master keys periodically (recommended: annually)
- Rotate immediately if key is compromised
- Document rotation in compliance records

### Access Control

- Only top-level admins (`role = 'admin'`) can use master key functions
- All decryption attempts are logged
- Failed attempts are also logged for security monitoring

### Audit Trail

All decryption activities are logged in `admin_actions` table:

```sql
SELECT 
  admin_id,
  target_user_id,
  action,
  reason,
  admin_notes,
  metadata,
  created_at
FROM admin_actions
WHERE action = 'decrypt_user_data'
ORDER BY created_at DESC;
```

---

## Troubleshooting

### "Master key not configured"

**Solution:** Run the migration script or setup function to create the initial master key.

### "Only top-level admins can..."

**Solution:** Ensure the user has `role = 'admin'` in the `users` table.

### "At least 2 top-level admins required"

**Solution:** Create at least 2 users with `role = 'admin'` before attempting reset.

### "Reset request has expired"

**Solution:** Reset requests expire after 12 hours. Create a new reset request.

### "Cannot approve your own reset request"

**Solution:** A different top-level admin must approve the reset.

---

## Compliance & Legal

### When to Use Master Key

- Court orders requiring data disclosure
- Legal investigations with proper authorization
- Compliance audits (GDPR, CCPA, etc.)
- User data export requests (with proper authorization)

### Documentation Requirements

- Always provide a `reason` field when decrypting data
- Document legal basis for access
- Maintain audit trail for compliance reviews
- Review decryption logs regularly

### Data Retention

- Decryption logs are retained for 7 years (legal compliance)
- Master key history is retained indefinitely
- Reset request history is retained for audit purposes

---

## API Reference

### admin-setup-master-key

**Method:** POST  
**Auth:** Top-level admin required  
**Idempotency:** Required

**Request:**
```json
{
  "master_key": "string (min 32 chars)",
  "idempotency_key": "string"
}
```

### admin-decrypt-user-data

**Method:** POST  
**Auth:** Top-level admin + master key required  
**Idempotency:** Not required

**Request (Single Field):**
```json
{
  "encrypted_text": "string",
  "master_key": "string",
  "reason": "string (optional)"
}
```

**Request (Bulk):**
```json
{
  "record_type": "assignment|lecture|study_session|course",
  "record_id": "uuid",
  "fields": ["string"],
  "master_key": "string",
  "reason": "string (optional)"
}
```

### admin-initiate-master-key-reset

**Method:** POST  
**Auth:** Top-level admin required  
**Idempotency:** Required

**Request:**
```json
{
  "new_master_key": "string (min 32 chars)",
  "reason": "string (optional)",
  "idempotency_key": "string"
}
```

### admin-approve-master-key-reset

**Method:** POST  
**Auth:** Top-level admin required (different from initiator)  
**Idempotency:** Required

**Request:**
```json
{
  "reset_request_id": "uuid",
  "reason": "string (optional)",
  "idempotency_key": "string"
}
```

---

## Support

For questions or issues:
1. Check audit logs in `admin_actions` table
2. Review function logs in Supabase dashboard
3. Contact security team for master key access

---

**⚠️ IMPORTANT:** The master key provides access to all encrypted user data. Treat it with the highest level of security and only use it when legally required.

