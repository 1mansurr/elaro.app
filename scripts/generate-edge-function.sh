#!/bin/bash
# Generate new Edge Function with best practices

set -e

FUNCTION_NAME=$1
if [ -z "$FUNCTION_NAME" ]; then
  echo "Usage: ./scripts/generate-edge-function.sh <function-name>"
  echo "Example: ./scripts/generate-edge-function.sh send-reminder"
  exit 1
fi

# Validate function name (kebab-case)
if [[ ! "$FUNCTION_NAME" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: Function name must be kebab-case (lowercase letters, numbers, hyphens)"
  exit 1
fi

FUNCTION_DIR="supabase/functions/$FUNCTION_NAME"
SCHEMA_NAME=$(echo "$FUNCTION_NAME" | sed 's/-//g')

# Create function directory
mkdir -p "$FUNCTION_DIR"

# Create index.ts with template
cat > "$FUNCTION_DIR/index.ts" << EOF
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthenticatedHandler, AuthenticatedRequest, AppError } from '../_shared/function-handler.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { dbInsert, dbUpdate } from '../_shared/db-operations.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { ERROR_CODES, ERROR_STATUS_CODES, ERROR_MESSAGES } from '../_shared/error-codes.ts';

// Define Zod schema for request validation
const ${SCHEMA_NAME^}Schema = z.object({
  // Add your fields here
  // Example:
  // field_name: z.string().min(1, 'Field name is required'),
});

serve(createAuthenticatedHandler(
  async ({ user, supabaseClient, body }: AuthenticatedRequest) => {
    // Your business logic here
    // body is already validated by the schema
    
    // Example: Insert into database with retry logic
    // const result = await dbInsert(supabaseClient, 'table_name', {
    //   ...body,
    //   user_id: user.id,
    // });
    
    return successResponse({ 
      message: 'Function executed successfully',
      // data: result,
    });
  },
  {
    rateLimitName: '$FUNCTION_NAME',
    schema: ${SCHEMA_NAME^}Schema, // ✅ Validation enforced
    requireIdempotency: true, // ✅ Idempotency required for mutations
  }
));
EOF

# Create schema file
SCHEMA_DIR="supabase/functions/_shared/schemas"
mkdir -p "$SCHEMA_DIR"

cat > "$SCHEMA_DIR/${FUNCTION_NAME}.ts" << EOF
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Schema for ${FUNCTION_NAME}
export const ${SCHEMA_NAME^}Schema = z.object({
  // Add your validation rules here
});
EOF

echo "✅ Created Edge Function: $FUNCTION_DIR/index.ts"
echo "✅ Created schema file: $SCHEMA_DIR/${FUNCTION_NAME}.ts"
echo ""
echo "Next steps:"
echo "1. Update the schema in $SCHEMA_DIR/${FUNCTION_NAME}.ts"
echo "2. Implement business logic in $FUNCTION_DIR/index.ts"
echo "3. Test locally: supabase functions serve $FUNCTION_NAME"
echo "4. Deploy: supabase functions deploy $FUNCTION_NAME"

