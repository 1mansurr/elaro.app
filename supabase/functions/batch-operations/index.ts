import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createResponse } from '../_shared/response.ts'
import { withMonitoring } from '../_shared/monitoring.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'
import { withIdempotency } from '../_shared/idempotency.ts'

// Batch Operations API - Handles multiple operations in a single request
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { operations } = await req.json()

    if (!Array.isArray(operations)) {
      return createResponse({ error: 'Operations must be an array' }, 400)
    }

    // Process operations in batch
    const results = await processBatchOperations(operations, supabaseClient)

    return createResponse({ data: results })

  } catch (error) {
    console.error('Batch operations error:', error)
    return createResponse({ error: 'Internal server error' }, 500)
  }
})

async function processBatchOperations(operations: any[], supabase: any) {
  const results = []
  
  for (const operation of operations) {
    try {
      const result = await executeOperation(operation, supabase)
      results.push({ success: true, data: result })
    } catch (error) {
      results.push({ success: false, error: error.message })
    }
  }
  
  return results
}

async function executeOperation(operation: any, supabase: any) {
  const { type, table, action, data, filters } = operation

  switch (action) {
    case 'create':
      return await supabase.from(table).insert(data).select()
    
    case 'update':
      let query = supabase.from(table).update(data)
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }
      return await query.select()
    
    case 'delete':
      let deleteQuery = supabase.from(table).update({ deleted_at: new Date().toISOString() })
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          deleteQuery = deleteQuery.eq(key, value)
        })
      }
      return await deleteQuery.select()
    
    case 'restore':
      let restoreQuery = supabase.from(table).update({ deleted_at: null })
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          restoreQuery = restoreQuery.eq(key, value)
        })
      }
      return await restoreQuery.select()
    
    case 'list':
      let listQuery = supabase.from(table).select('*').is('deleted_at', null)
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          listQuery = listQuery.eq(key, value)
        })
      }
      return await listQuery
    
    default:
      throw new Error(`Unsupported action: ${action}`)
  }
}
