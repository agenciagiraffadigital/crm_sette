import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  value: Array<{
    contact: {
      name: string;
      email: string;
      phone: string;
      document?: string;
    };
    custom_fields?: {
      Operadora?: string;
    };
    products?: Array<{
      name: string;
    }>;
    sales_channel?: {
      name: string;
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('PROJECT_URL')!
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const payload: WebhookPayload = await req.json()
    console.log('Webhook received:', JSON.stringify(payload, null, 2))

    if (!payload.value || payload.value.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload structure' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const item = payload.value[0]
    const contact = item.contact

    // Validate required fields
    if (!contact.name || !contact.email || !contact.phone) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required contact fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get active sellers for round-robin distribution
    const { data: sellers, error: sellersError } = await supabase
      .from('users_profile')
      .select('id, name, email, role')
      .eq('role', 'SELLER')
      .eq('active_for_distribution', true)
      .order('id')

    if (sellersError) {
      console.error('Error fetching sellers:', sellersError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to fetch sellers' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!sellers || sellers.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No active sellers available' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Round-robin seller selection
    const { data: lastOpportunity } = await supabase
      .from('opportunities')
      .select('vendedor_id')
      .not('vendedor_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let selectedSeller
    if (!lastOpportunity) {
      selectedSeller = sellers[0]
    } else {
      const lastIndex = sellers.findIndex(s => s.id === lastOpportunity.vendedor_id)
      const nextIndex = (lastIndex + 1) % sellers.length
      selectedSeller = sellers[nextIndex]
    }

    // Create opportunity
    const opportunityData = {
      nome: contact.name,
      email: contact.email,
      telefone: contact.phone,
      status: 'OPORTUNIDADES',
      vendedor: selectedSeller.name,
      vendedor_email: selectedSeller.email,
      vendedor_id: selectedSeller.id,
      origem: item.sales_channel?.name || 'WEBHOOK',
      raw_json: payload,
    }

    const { data: opportunity, error: opportunityError } = await supabase
      .from('opportunities')
      .insert(opportunityData)
      .select()
      .single()

    if (opportunityError) {
      console.error('Error creating opportunity:', opportunityError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to create opportunity' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update seller's assignment tracking
    await supabase
      .from('users_profile')
      .update({ 
        last_lead_assigned_at: new Date().toISOString(),
        total_leads_assigned: supabase.raw('total_leads_assigned + 1')
      })
      .eq('id', selectedSeller.id)

    // Log the activity
    await supabase.from('activity_logs').insert({
      opportunity_id: opportunity.id,
      type: 'STATUS_CHANGE',
      description: `Oportunidade criada via webhook e atribuída a ${selectedSeller.name}`,
      user_id: selectedSeller.id,
      user_name: selectedSeller.name,
      metadata: { 
        origem: opportunityData.origem,
        webhook_payload: payload 
      }
    })

    console.log(`Opportunity created successfully: ID ${opportunity.id}, assigned to ${selectedSeller.name}`)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        opportunity_id: opportunity.id,
        assigned_to: selectedSeller.name 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})