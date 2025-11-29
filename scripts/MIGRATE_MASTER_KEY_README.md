# Master Key Migration Guide

Quick guide to migrate your existing master key to the new system.

## Prerequisites

1. ✅ Database migration applied (`supabase db push --include-all`)
2. ✅ You are set as top-level admin (`role = 'admin'`)
3. ✅ You have your existing master key
4. ✅ You have your admin user ID

## Step 1: Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/alqpwhrsxmetwbtxuihv/settings/api
2. Find the **"service_role"** key (⚠️ NOT the "anon" key)
3. Copy the entire key (it starts with `eyJ...`)

## Step 2: Get Your Admin User ID

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
SELECT id, email, role
FROM users
WHERE email = 'saymmmohammed265@gmail.com';
```

Copy the `id` value (UUID format).

## Step 3: Run the Migration

### Option A: Inline Environment Variables (Recommended)

```bash
SUPABASE_URL="https://alqpwhrsxmetwbtxuihv.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" \
deno run --allow-net --allow-env scripts/migrate-master-key.ts \
  "your-master-key-here" \
  "your-admin-user-id-here"
```

### Option B: Export Variables First

```bash
# Set variables
export SUPABASE_URL="https://alqpwhrsxmetwbtxuihv.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Run migration
deno run --allow-net --allow-env scripts/migrate-master-key.ts \
  "your-master-key-here" \
  "your-admin-user-id-here"
```

### Option C: Use EXPO_PUBLIC_SUPABASE_URL

If you have `EXPO_PUBLIC_SUPABASE_URL` in your `.env` file, the script will use it automatically. You still need to set `SUPABASE_SERVICE_ROLE_KEY`:

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
deno run --allow-net --allow-env scripts/migrate-master-key.ts \
  "your-master-key-here" \
  "your-admin-user-id-here"
```

## Example

```bash
SUPABASE_URL="https://alqpwhrsxmetwbtxuihv.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
deno run --allow-net --allow-env scripts/migrate-master-key.ts \
  "805fd0fa88669f384226eeffe83139b7f26a37395e8027302b66151c19493b78" \
  "2e607c0d-151a-4959-bfa1-300123670ec1"
```

## Expected Output

```
🔧 Starting master key migration...
   Supabase URL: https://alqpwhrsxmetwbtxuihv.supabase.co
   Admin User ID: 2e607c0d-151a-4959-bfa1-300123670ec1

📋 Verifying admin user...
   ✓ User found: saymmmohammed265@gmail.com
   Current role: admin
   ✓ User is a top-level admin

🔍 Checking for existing master key...
   ✓ No existing master key found

🔐 Hashing master key (this may take a moment)...
   ✓ Master key hashed successfully

💾 Inserting master key into database...

✅ Master key migrated successfully!

📋 Migration Details:
   Master key ID: <uuid>
   Created at: <timestamp>
   Created by admin: 2e607c0d-151a-4959-bfa1-300123670ec1
   Admin email: saymmmohammed265@gmail.com

🎉 You can now use the master key system!
```

## Troubleshooting

### "Missing SUPABASE_URL"

- Set it: `export SUPABASE_URL="https://alqpwhrsxmetwbtxuihv.supabase.co"`
- Or use inline: `SUPABASE_URL="..." deno run ...`

### "Missing SUPABASE_SERVICE_ROLE_KEY"

- Get it from: Supabase Dashboard → Settings → API → service_role key
- Set it: `export SUPABASE_SERVICE_ROLE_KEY="your-key"`
- ⚠️ Never commit this key to version control!

### "Admin user not found"

- Verify the user ID is correct
- Check: `SELECT id FROM users WHERE email = 'your-email';`

### "User is not a top-level admin"

- Run: `scripts/set-admin-role.sql` in Supabase Dashboard
- Or: `UPDATE users SET role = 'admin' WHERE email = 'your-email';`

### "Master key already exists"

- This is normal if you've already migrated
- The existing key will be used
- No action needed

## Security Notes

- ⚠️ **Never commit** `SUPABASE_SERVICE_ROLE_KEY` to version control
- ⚠️ **Never share** your master key
- ✅ Store master key securely (password manager, HSM, etc.)
- ✅ Use environment variables, not hardcoded values
