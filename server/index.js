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
app.use(express.json({ limit: '1mb' }))

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
    const first = req.body?.value?.[0]
    const contact = first?.contact
    const nome = contact?.name?.trim()
    const email = contact?.email?.trim()
    const telefone = contact?.phone?.trim()
    if (!nome || !email || !telefone) {
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
      raw_json: req.body,
    })
    if (insertError) {
      console.error(insertError)
      return res.status(500).json({ ok: false, error: insertError.message })
    }
    return res.json({ ok: true, lead: { nome, email, telefone, vendedor: seller?.name ?? null } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Webhook server on http://localhost:${PORT}`)
})