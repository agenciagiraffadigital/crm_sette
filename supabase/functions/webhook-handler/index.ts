import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OportunidadePayload {
  oportunidades: Array<{
    titulo?: string;
    valor?: string;
    codigo_vendedor?: string;
    codigo_metodologia?: string;
    codigo_canal_venda?: string;
    codigo_etapa?: string;
    personalizados?: Array<{
      titulo?: string;
      valor?: string;
    }>;
    contato: {
      nome: string;
      email: string;
      telefone1: string;
      telefone2?: string;
      cargo?: string;
      cpf?: string;
      personalizados?: Array<{
        titulo?: string;
        valor?: string;
      }>;
    };
    empresa?: {
      nome?: string;
      cnpj?: string;
      codigo_segmento?: string;
      endereco_completo?: {
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        cidade?: string;
        uf?: string;
        cep?: string;
      };
      personalizados?: Array<{
        titulo?: string;
        valor?: string;
      }>;
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
    
    console.log('Supabase URL:', supabaseUrl)
    console.log('Service key exists:', !!supabaseServiceKey)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse webhook payload
    const payload: OportunidadePayload = await req.json()
    console.log('Webhook received:', JSON.stringify(payload, null, 2))

    if (!payload.oportunidades || payload.oportunidades.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload structure - expected oportunidades array' }),
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
      .from('leads')
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
    for (let i = 0; i < payload.oportunidades.length; i++) {
      const oportunidade = payload.oportunidades[i]
      const contato = oportunidade.contato

      // Validate required fields
      if (!contato.nome || !contato.email || !contato.telefone1) {
        results.push({
          index: i,
          ok: false,
          error: 'Missing required contact fields',
          contact: contato.nome || 'Unknown'
        })
        continue
      }

      // Check for duplicate email
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', contato.email)
        .single()

      if (existingLead) {
        results.push({
          index: i,
          ok: false,
          error: 'Lead with this email already exists',
          contact: contato.nome
        })
        continue
      }

      // Select seller - use codigo_vendedor if provided, otherwise round-robin
      let selectedSeller
      if (oportunidade.codigo_vendedor) {
        selectedSeller = sellers.find(s => s.id === oportunidade.codigo_vendedor)
        if (!selectedSeller) {
          results.push({
            index: i,
            ok: false,
            error: `Seller with codigo_vendedor ${oportunidade.codigo_vendedor} not found`,
            contact: contato.nome
          })
          continue
        }
      } else {
        selectedSeller = sellers[currentSellerIndex]
        currentSellerIndex = (currentSellerIndex + 1) % sellers.length
      }

      // Determine tipo_cliente based on empresa.cnpj
      const tipoCliente = oportunidade.empresa?.cnpj ? 'PJ' : 'PF'
      const cpfCnpj = oportunidade.empresa?.cnpj || contato.cpf || ''

      try {
        // Create opportunity
        const opportunityData = {
          nome: contato.nome,
          email: contato.email,
          telefone: contato.telefone1,
          status_kanban: 'OPORTUNIDADES',
          vendedor: selectedSeller.name,
          vendedor_email: selectedSeller.email,
          vendedor_id: selectedSeller.id,
          origem: 'WEBHOOK',
          raw_json: oportunidade,
          tipo_cliente: tipoCliente,
          cpf_cnpj: cpfCnpj,
          rg_ie: '',
          data_nascimento_abertura: null,
          dados_responsavel: null,
          havera_remissao: false,
          operadora: '',
          produto: '',
          valor_produto: oportunidade.valor ? parseFloat(oportunidade.valor) : null,
          reducao_carencia: false,
          coparticipacao: 'NÃO',
          vigencia: null,
          // Campos separados de endereço
          cep: oportunidade.empresa?.endereco_completo?.cep || '',
          logradouro: oportunidade.empresa?.endereco_completo?.logradouro || '',
          numero: oportunidade.empresa?.endereco_completo?.numero || '',
          complemento: oportunidade.empresa?.endereco_completo?.complemento || '',
          bairro: oportunidade.empresa?.endereco_completo?.bairro || '',
          cidade: oportunidade.empresa?.endereco_completo?.cidade || '',
          estado: oportunidade.empresa?.endereco_completo?.uf || '',
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
            contact: contato.nome,
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
          type: 'CRIACAO',
          description: `Lead criado via webhook - Origem: WEBHOOK`,
          user_id: selectedSeller.id,
          user_name: selectedSeller.name,
          metadata: { 
            origem: opportunityData.origem,
            webhook_payload: oportunidade 
          }
        })

        results.push({
          index: i,
          ok: true,
          lead_id: opportunity.id,
          assigned_to: selectedSeller.name,
          contact: contato.nome,
          tipo_cliente: tipoCliente
        })

        console.log(`Lead ${i+1} created: ID ${opportunity.id}, assigned to ${selectedSeller.name}`)

      } catch (error) {
        console.error(`Error processing lead ${i+1}:`, error)
        results.push({
          index: i,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          contact: contato.nome
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