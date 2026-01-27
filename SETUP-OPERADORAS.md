# Configuração de Operadoras e Produtos

## Passo 1: Criar as Tabelas no Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**
5. Cole o SQL abaixo e clique em **Run**

```sql
-- Tabela de Operadoras
CREATE TABLE IF NOT EXISTS operadoras (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  operadora_id INTEGER NOT NULL REFERENCES operadoras(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(operadora_id, nome)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_operadora ON produtos(operadora_id);
CREATE INDEX IF NOT EXISTS idx_operadoras_ativa ON operadoras(ativa);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);

-- Habilitar RLS (Row Level Security)
ALTER TABLE operadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (todos usuários autenticados podem ler e escrever)
CREATE POLICY "Permitir leitura de operadoras" ON operadoras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserção de operadoras" ON operadoras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização de operadoras" ON operadoras FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir exclusão de operadoras" ON operadoras FOR DELETE TO authenticated USING (true);

CREATE POLICY "Permitir leitura de produtos" ON produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserção de produtos" ON produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização de produtos" ON produtos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir exclusão de produtos" ON produtos FOR DELETE TO authenticated USING (true);
```

## Passo 2: Testar no Sistema

1. Faça login no CRM como ADMIN
2. Acesse o menu **Operadoras**
3. Adicione operadoras (ex: Unimed, Bradesco Saúde, SulAmérica)
4. Clique em uma operadora para adicionar produtos
5. Adicione produtos (ex: PME 100, PME 200, Enfermaria)

## Passo 3: Usar nos Leads

Ao criar ou editar um lead:
1. Selecione a operadora no dropdown
2. O dropdown de produtos será carregado automaticamente
3. Selecione o produto desejado

✅ Pronto! O sistema está configurado.
