import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TemplateData {
  template_name: string;
  task_type: 'assignment' | 'lecture' | 'study_session';
  template_data: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const method = req.method
    const path = url.pathname.split('/').pop()

    switch (method) {
      case 'GET':
        // Get all templates for the user
        const { data: templates, error: fetchError } = await supabaseClient
          .from('task_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        return new Response(
          JSON.stringify({ templates }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'POST':
        // Create a new template
        const templateData: TemplateData = await req.json()
        
        // Validate required fields
        if (!templateData.template_name || !templateData.task_type || !templateData.template_data) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate task_type
        if (!['assignment', 'lecture', 'study_session'].includes(templateData.task_type)) {
          return new Response(
            JSON.stringify({ error: 'Invalid task_type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: newTemplate, error: createError } = await supabaseClient
          .from('task_templates')
          .insert({
            user_id: user.id,
            template_name: templateData.template_name,
            task_type: templateData.task_type,
            template_data: templateData.template_data
          })
          .select()
          .single()

        if (createError) {
          throw createError
        }

        return new Response(
          JSON.stringify({ template: newTemplate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'PUT':
        // Update an existing template
        const updateData: TemplateData & { id: string } = await req.json()
        
        if (!updateData.id) {
          return new Response(
            JSON.stringify({ error: 'Template ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: updatedTemplate, error: updateError } = await supabaseClient
          .from('task_templates')
          .update({
            template_name: updateData.template_name,
            template_data: updateData.template_data
          })
          .eq('id', updateData.id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }

        return new Response(
          JSON.stringify({ template: updatedTemplate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'DELETE':
        // Delete a template
        const templateId = url.searchParams.get('id')
        
        if (!templateId) {
          return new Response(
            JSON.stringify({ error: 'Template ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: deleteError } = await supabaseClient
          .from('task_templates')
          .delete()
          .eq('id', templateId)
          .eq('user_id', user.id)

        if (deleteError) {
          throw deleteError
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Template actions error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
