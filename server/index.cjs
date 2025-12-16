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
    .order('id')
  if (!sellers?.length) return null

  const { data: counts } = await supabase
    .from('leads')
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
    
    const first = req.body?.value?.[0]
    const contact = first?.contact
    const nome = contact?.name?.trim()
    const email = contact?.email?.trim()
    const telefone = contact?.phone?.trim()
    
    console.log(`Extraído: nome=${nome}, email=${email}, telefone=${telefone}`)
    
    if (!nome || !email || !telefone) {
      console.log('Erro: campos faltando')
      return res.status(400).json({ ok: false, error: 'nome/email/telefone obrigatórios' })
    }

    const seller = await pickSeller()

    const { error: insertError } = await supabase.from('leads').insert({
      nome,
      email,
      telefone,
      origem: first?.sales_channel?.name ?? 'MAKE',
      operadora: first?.custom_fields?.Operadora ?? null,
      status_kanban: 'ENVIADA',
      vendedor: seller?.name ?? null,
      vendedor_email: seller?.email ?? null,
      vendedor_id: seller?.id ?? null,
      tipo_cliente: 'PF',
      cpf_cnpj: '',
      data_nascimento_abertura: null,
      rg_ie: '',
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: ''
      },
      produto: '',
      valor_produto: null,
      coparticipacao: 'PARCIAL',
      reducao_carencia: false,
      havera_remissao: false,
      vigencia: null,
      beneficiarios: [],
      documentos: [],
      mensagens: [],
      dados_responsavel: {
        nome: '',
        cpf: '',
        endereco: '',
        data_nascimento: ''
      },
      raw_json: req.body,
    })
    if (insertError) {
      console.error('Erro ao inserir:', insertError)
      return res.status(500).json({ ok: false, error: insertError.message })
    }
    console.log(`Lead criado: ${nome} -> vendedor ${seller?.name}`)
    return res.json({ ok: true, lead: { nome, email, telefone, vendedor: seller?.name ?? null } })
  } catch (err) {
    console.error('Erro no webhook:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Webhook server on http://localhost:${PORT}`)
})