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

    // Get last assigned seller for round-robin
    const { data: lastOpportunity } = await supabase
      .from('opportunities')
      .select('vendedor_id')
      .not('vendedor_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let currentSellerIndex = 0
    if (lastOpportunity) {
      const lastIndex = sellers.findIndex(s => s.id === lastOpportunity.vendedor_id)
      currentSellerIndex = (lastIndex + 1) % sellers.length
    }

    const results = []

    // Process each lead in the payload
    for (let i = 0; i < payload.value.length; i++) {
      const item = payload.value[i]
      const contact = item.contact

      // Validate required fields
      if (!contact.name || !contact.email || !contact.phone) {
        results.push({
          index: i,
          ok: false,
          error: 'Missing required contact fields',
          contact: contact.name || 'Unknown'
        })
        continue
      }

      // Select seller using round-robin
      const selectedSeller = sellers[currentSellerIndex]
      currentSellerIndex = (currentSellerIndex + 1) % sellers.length

      try {
        // Create opportunity
        const opportunityData = {
          nome: contact.name,
          email: contact.email,
          telefone: contact.phone,
          status_kanban: 'OPORTUNIDADES',
          vendedor: selectedSeller.name,
          vendedor_email: selectedSeller.email,
          vendedor_id: selectedSeller.id,
          origem: item.sales_channel?.name || 'WEBHOOK',
          raw_json: item,
          tipo_cliente: 'PF',
          cpf_cnpj: '',
          rg_ie: '',
          data_nascimento_abertura: null,
          dados_responsavel: null,
          havera_remissao: false,
          operadora: '',
          produto: '',
          valor_produto: null,
          reducao_carencia: false,
          coparticipacao: 'NÃO',
          vigencia: null,
          endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
          beneficiarios: [],
          mensagens: [],
          documentos: []
        }
        
        console.log('Creating lead with data:', JSON.stringify(opportunityData, null, 2))

        const { data: opportunity, error: opportunityError } = await supabase
          .from('leads')
          .insert(opportunityData)
          .select()
          .single()

        if (opportunityError) {
          console.error('Error creating lead:', opportunityError)
          results.push({
            index: i,
            ok: false,
            error: `Failed to create lead: ${opportunityError.message}`,
            contact: contact.name,
            details: opportunityError
          })
          continue
        }

        // Update seller's assignment tracking
        const { data: currentUser } = await supabase
          .from('users_profile')
          .select('total_leads_assigned')
          .eq('id', selectedSeller.id)
          .single()

        await supabase
          .from('users_profile')
          .update({ 
            last_lead_assigned_at: new Date().toISOString(),
            total_leads_assigned: (currentUser?.total_leads_assigned || 0) + 1
          })
          .eq('id', selectedSeller.id)

        // Log the activity
        await supabase.from('activity_logs').insert({
          lead_id: opportunity.id,
          type: 'STATUS_CHANGE',
          description: `Lead criado via webhook e atribuído a ${selectedSeller.name}`,
          user_id: selectedSeller.id,
          user_name: selectedSeller.name,
          metadata: { 
            origem: opportunityData.origem,
            webhook_payload: item 
          }
        })

        results.push({
          index: i,
          ok: true,
          lead_id: opportunity.id,
          assigned_to: selectedSeller.name,
          contact: contact.name
        })

        console.log(`Lead ${i+1} created: ID ${opportunity.id}, assigned to ${selectedSeller.name}`)

      } catch (error) {
        console.error(`Error processing lead ${i+1}:`, error)
        results.push({
          index: i,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          contact: contact.name
        })
      }
    }

    const successCount = results.filter(r => r.ok).length
    const totalCount = results.length

    return new Response(
      JSON.stringify({ 
        ok: true,
        processed: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
        results: results
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