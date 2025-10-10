#!/bin/bash

# Deploy the admin export function to Supabase
# This script helps deploy the admin-export-all-data Edge Function

echo "🚀 Deploying admin-export-all-data Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Not in a Supabase project directory"
    echo "Make sure you're in the root of your Supabase project"
    exit 1
fi

# Deploy the function
echo "📡 Deploying function..."
supabase functions deploy admin-export-all-data

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set the ADMIN_EMAILS environment variable in your Supabase dashboard:"
    echo "   ADMIN_EMAILS=admin1@example.com,admin2@example.com"
    echo ""
    echo "2. Test the function with:"
    echo "   node scripts/export-all-data.js <your-jwt-token>"
    echo ""
    echo "3. View function logs with:"
    echo "   supabase functions logs admin-export-all-data"
else
    echo "❌ Deployment failed"
    exit 1
fi
