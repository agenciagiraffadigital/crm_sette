import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('PROJECT_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const payload = await req.json()
    console.log('Webhook received:', JSON.stringify(payload, null, 2))

    const { nome, email, ddd, telefone, cidade, uf } = payload

    if (!nome || !email || !telefone) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields: nome, email, telefone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check duplicate email
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Lead with this email already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get active sellers for round-robin
    const { data: sellers, error: sellersError } = await supabase
      .from('users_profile')
      .select('id, name, email')
      .eq('role', 'SELLER')
      .eq('active_for_distribution', true)
      .order('id')

    if (sellersError || !sellers || sellers.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No active sellers available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Round-robin: find next seller
    const { data: lastLead } = await supabase
      .from('leads')
      .select('vendedor_id')
      .not('vendedor_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastIndex = lastLead ? sellers.findIndex(s => s.id === lastLead.vendedor_id) : -1
    const seller = sellers[(lastIndex + 1) % sellers.length]

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        nome,
        email,
        telefone: ddd ? `${ddd}${telefone}` : telefone,
        cidade: cidade || '',
        estado: uf || '',
        operadora: 'MedSênior',
        origem: 'Leads MedSênior',
        status_kanban: 'OPORTUNIDADES',
        vendedor: seller.name,
        vendedor_email: seller.email,
        vendedor_id: seller.id,
        raw_json: payload,
        tipo_cliente: 'PF',
        beneficiarios: [],
        mensagens: [],
        documentos: [],
      })
      .select()
      .single()

    if (leadError) {
      console.error('Error creating lead:', leadError)
      return new Response(
        JSON.stringify({ ok: false, error: leadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update seller stats
    const { data: sellerData } = await supabase
      .from('users_profile')
      .select('total_leads_assigned')
      .eq('id', seller.id)
      .single()

    await supabase
      .from('users_profile')
      .update({
        last_lead_assigned_at: new Date().toISOString(),
        total_leads_assigned: (sellerData?.total_leads_assigned || 0) + 1,
      })
      .eq('id', seller.id)

    await supabase.from('activity_logs').insert({
      lead_id: lead.id,
      type: 'CRIACAO',
      description: `Lead criado via webhook - Origem: Leads MedSênior`,
      user_id: seller.id,
      user_name: seller.name,
      metadata: { origem: 'Leads MedSênior', webhook_payload: payload },
    })

    return new Response(
      JSON.stringify({ ok: true, lead_id: lead.id, assigned_to: seller.name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
