# User Data Encryption Migration

This edge function migrates existing plaintext user data to encrypted format.

## ⚠️ IMPORTANT SAFETY NOTES

- **ALWAYS run in DRY RUN mode first** to see what will be changed
- This function modifies user data in the database
- Make sure you have a database backup before running
- Test with a specific user ID before running on all users

## What It Does

Encrypts plaintext fields in the `users` table:
- `first_name` (if plaintext)
- `last_name` (if plaintext)
- `country` (if plaintext)

**Skips:**
- Empty/null fields
- Already encrypted fields (detected by base64 pattern)
- `username` (intentionally left as plaintext - public field)

## How to Run

### Step 1: Dry Run (Test Mode)

First, run in dry-run mode to see what would be changed:

```bash
# Test with your specific user ID
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/migrate-encrypt-user-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true,
    "userId": "2e607c0d-151a-4959-bfa1-300123670ec1"
  }'
```

Or test all users:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/migrate-encrypt-user-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true
  }'
```

### Step 2: Review the Results

Check the response to see:
- How many users will be affected
- Which fields will be encrypted for each user
- Any errors that occurred

### Step 3: Run Actual Migration

Once you're satisfied with the dry-run results, run the actual migration:

```bash
# Migrate specific user
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/migrate-encrypt-user-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false,
    "userId": "2e607c0d-151a-4959-bfa1-300123670ec1"
  }'
```

Or migrate all users:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/migrate-encrypt-user-data \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": false
  }'
```

## Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dryRun` | boolean | `true` | If `true`, only logs what would change (no database updates) |
| `userId` | string | `undefined` | Optional: Migrate only this specific user ID |
| `batchSize` | number | `100` | Number of users to process in each batch |

## Response Format

```json
{
  "message": "Dry run completed - no changes were made",
  "summary": {
    "totalUsersProcessed": 1,
    "totalUsersUpdated": 1,
    "totalFieldsEncrypted": 2,
    "dryRun": true,
    "results": [
      {
        "userId": "2e607c0d-151a-4959-bfa1-300123670ec1",
        "email": "user@example.com",
        "fieldsEncrypted": ["first_name", "country"],
        "errors": []
      }
    ],
    "errors": []
  }
}
```

## Safety Features

1. **Dry Run Mode**: Default mode - doesn't make any changes
2. **Encryption Test**: Verifies encryption/decryption works before processing
3. **Field Detection**: Only encrypts fields that are actually plaintext
4. **Error Handling**: Continues processing even if individual users fail
5. **Logging**: Detailed logs for each user processed

## Verification

After running the migration, verify the data:

1. Check that encrypted fields are base64 strings (length > 20)
2. Use the profile API to verify decryption works correctly
3. Check that plaintext values are no longer visible in the database

## Troubleshooting

### Error: "Encryption test failed"
- Check that `ENCRYPTION_KEY` environment variable is set correctly
- Verify the encryption key hasn't changed

### Error: "Failed to query users"
- Check database connection
- Verify RLS policies allow service role access

### Some fields not encrypted
- Fields might already be encrypted (check base64 pattern)
- Fields might be empty (skipped intentionally)
- Check error messages in the response

## Deployment

Deploy the function:

```bash
supabase functions deploy migrate-encrypt-user-data
```

## Environment Variables Required

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)
- `ENCRYPTION_KEY` - Encryption key for data encryption
