# Admin Export All Data Function

This Supabase Edge Function provides a secure way to export all critical user data for backup purposes during migrations or data analysis.

## Security

- **Admin-Only Access**: Only users with admin email addresses can trigger this function
- **JWT Authentication**: Requires valid JWT token in Authorization header
- **Service Role**: Uses service role key to bypass Row Level Security (RLS)

## Setup

### 1. Environment Variables

Set the following environment variable in your Supabase project:

```bash
ADMIN_EMAILS=admin1@example.com,admin2@example.com,admin3@example.com
```

Add admin email addresses separated by commas.

### 2. Deploy the Function

```bash
supabase functions deploy admin-export-all-data
```

## Usage

### Method 1: Using the Helper Script

1. Get your JWT token by signing in as an admin user
2. Run the export script:

```bash
node scripts/export-all-data.js <your-jwt-token>
```

The script will:
- Call the Edge Function
- Save the export to `exports/data-export-YYYY-MM-DDTHH-MM-SS.json`
- Display export statistics

### Method 2: Direct API Call

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/admin-export-all-data \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json"
```

### Method 3: From Supabase Dashboard

1. Go to Edge Functions in your Supabase dashboard
2. Find `admin-export-all-data`
3. Click "Invoke"
4. Add Authorization header with your JWT token

## Export Format

The function exports the following data in JSON format:

```json
{
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "users": [...],
  "courses": [...],
  "assignments": [...],
  "lectures": [...],
  "studySessions": [...],
  "reminders": [...]
}
```

## Tables Exported

- **users**: All user profiles and account information
- **courses**: All courses created by users
- **assignments**: All assignments across all users
- **lectures**: All lectures and their schedules
- **studySessions**: All study sessions and their details
- **reminders**: All reminder notifications

## Error Handling

The function returns appropriate HTTP status codes:

- `200`: Export successful
- `401`: Missing or invalid JWT token
- `403`: User is not an admin
- `500`: Internal server error

## Use Cases

- **Data Migration**: Export all data before switching backend providers
- **Backup**: Create full database backups
- **Analytics**: Analyze user data patterns
- **Compliance**: Export data for regulatory requirements
- **Testing**: Use real data for testing new features

## Security Considerations

- Only deploy this function in production environments where you trust the admin users
- Consider rate limiting if you plan to use this frequently
- Monitor function logs for unauthorized access attempts
- Store exported data securely as it contains sensitive user information

## Troubleshooting

### "Unauthorized: User is not an admin"
- Verify your email is in the `ADMIN_EMAILS` environment variable
- Check that you're signed in with the correct account

### "Missing Authorization header"
- Ensure you're including the `Authorization: Bearer <token>` header
- Verify your JWT token is valid and not expired

### "Invalid JWT"
- Your JWT token may have expired
- Sign in again to get a fresh token
