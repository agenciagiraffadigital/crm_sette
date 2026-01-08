require('dotenv').config({ path: '.env.local' })

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

const PORT = process.env.PORT || 4000
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !serviceKey) {
  console.error('Faltam VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)
const app = express()
app.use(cors())

// Middleware para logar e fazer parse customizado
app.use((req, res, next) => {
  let rawBody = ''
  req.on('data', chunk => {
    rawBody += chunk.toString('utf8')
  })
  req.on('end', () => {
    console.log('Raw body recebido:', rawBody)
    try {
      req.body = JSON.parse(rawBody)
      next()
    } catch (err) {
      console.error('Erro ao fazer parse do JSON:', err.message)
      console.error('Conteúdo:', rawBody)
      res.status(400).json({ ok: false, error: 'JSON inválido', details: err.message })
    }
  })
})

async function pickSeller() {
  const { data: sellers } = await supabase
    .from('users')
    .select('id,name,email,role')
    .eq('role', 'SELLER')
    .eq('active_for_distribution', true)
    .order('id')
  if (!sellers?.length) return null

  // Get opportunity counts for round-robin distribution
  const { data: counts } = await supabase
    .from('opportunities')
    .select('vendedor_id, count:id', { count: 'exact', head: false })
    .not('vendedor_id', 'is', null)

  const map = new Map()
  counts?.forEach((c) => map.set(c.vendedor_id, Number(c.count)))

  let best = sellers[0]
  let bestCount = map.get(best.id) ?? 0
  sellers.forEach(s => {
    const c = map.get(s.id) ?? 0
    if (c < bestCount) {
      best = s
      bestCount = c
    }
  })
  return best
}

app.post('/webhook/make', async (req, res) => {
  try {
    console.log('Raw body:', JSON.stringify(req.body, null, 2))
    
    const oportunidade = req.body?.oportunidades?.[0]
    const contato = oportunidade?.contato
    const nome = contato?.nome?.trim()
    const email = contato?.email?.trim()
    const telefone = contato?.telefone1?.trim()
    
    // Extrair operadora de personalizados
    let operadora = null
    if (oportunidade?.personalizados && Array.isArray(oportunidade.personalizados)) {
      const operadoraField = oportunidade.personalizados.find(p => p.titulo === 'Operadora')
      operadora = operadoraField?.valor ?? null
    }
    
    console.log(`Extraído: nome=${nome}, email=${email}, telefone=${telefone}, operadora=${operadora}`)
    
    if (!nome || !email || !telefone) {
      console.log('Erro: campos faltando')
      return res.status(400).json({ ok: false, error: 'nome/email/telefone1 obrigatórios' })
    }

    const seller = await pickSeller()
    if (!seller) {
      console.log('Erro: nenhum vendedor ativo disponível')
      return res.status(500).json({ ok: false, error: 'Nenhum vendedor ativo disponível para distribuição' })
    }

    // Create opportunity instead of lead
    const { data: opportunity, error: insertError } = await supabase.from('opportunities').insert({
      nome,
      email,
      telefone,
      origem: 'MAKE',
      status: 'OPORTUNIDADES',
      vendedor: seller.name,
      vendedor_email: seller.email,
      vendedor_id: seller.id,
      raw_json: req.body,
    }).select().single()

    if (insertError) {
      console.error('Erro ao inserir oportunidade:', insertError)
      return res.status(500).json({ ok: false, error: insertError.message })
    }

    // Update seller's assignment tracking
    await supabase
      .from('users')
      .update({ 
        last_lead_assigned_at: new Date().toISOString(),
        total_leads_assigned: supabase.raw('total_leads_assigned + 1')
      })
      .eq('id', seller.id)

    // Log the activity
    await supabase.from('activity_logs').insert({
      opportunity_id: opportunity.id,
      type: 'STATUS_CHANGE',
      description: `Oportunidade criada via webhook MAKE e atribuída a ${seller.name}`,
      user_id: seller.id,
      user_name: seller.name,
      metadata: { 
        origem: 'MAKE',
        operadora,
        webhook_data: req.body
      }
    })

    console.log(`Oportunidade criada: ${nome} -> vendedor ${seller.name}`)
    return res.json({ 
      ok: true, 
      opportunity: { 
        id: opportunity.id,
        nome, 
        email, 
        telefone, 
        vendedor: seller.name,
        status: 'OPORTUNIDADES'
      } 
    })
  } catch (err) {
    console.error('Erro no webhook:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Webhook server on http://localhost:${PORT}`)
})