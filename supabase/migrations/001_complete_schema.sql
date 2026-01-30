-- =====================================================
-- MIGRATION COMPLETA - CRM SETTE
-- Schema PUBLIC
-- =====================================================

-- =====================================================
-- SEQUENCES
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS public.leads_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.operadoras_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.produtos_id_seq;

-- =====================================================
-- TABELAS
-- =====================================================

-- Tabela: users_profile
CREATE TABLE IF NOT EXISTS public.users_profile (
  id bigint NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
  auth_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['ADMIN'::text, 'SELLER'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  active_for_distribution boolean DEFAULT true,
  last_lead_assigned_at timestamp without time zone,
  total_leads_assigned integer DEFAULT 0,
  last_login_at timestamp without time zone,
  CONSTRAINT users_profile_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela: operadoras
CREATE TABLE IF NOT EXISTS public.operadoras (
  id integer NOT NULL DEFAULT nextval('public.operadoras_id_seq'::regclass),
  nome character varying NOT NULL UNIQUE,
  ativa boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT operadoras_pkey PRIMARY KEY (id)
);

-- Tabela: produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id integer NOT NULL DEFAULT nextval('public.produtos_id_seq'::regclass),
  operadora_id integer NOT NULL,
  nome character varying NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT produtos_pkey PRIMARY KEY (id),
  CONSTRAINT produtos_operadora_id_fkey FOREIGN KEY (operadora_id) REFERENCES public.operadoras(id) ON DELETE CASCADE
);

-- Tabela: leads
CREATE TABLE IF NOT EXISTS public.leads (
  id bigint NOT NULL DEFAULT nextval('public.leads_id_seq'::regclass),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  tipo_cliente text CHECK (tipo_cliente = ANY (ARRAY['PF'::text, 'PJ'::text, 'ADESAO'::text])),
  cpf_cnpj text,
  rg_ie text,
  data_nascimento_abertura date,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  dados_responsavel jsonb DEFAULT '{"cpf": "", "nome": "", "endereco": "", "data_nascimento": ""}'::jsonb,
  operadora text,
  produto text,
  valor_produto numeric,
  coparticipacao text CHECK (coparticipacao = ANY (ARRAY['NÃO'::text, 'PARCIAL'::text, 'COMPLETA'::text])),
  reducao_carencia boolean DEFAULT false,
  havera_remissao boolean DEFAULT false,
  vigencia date,
  beneficiarios jsonb DEFAULT '[]'::jsonb,
  mensagens jsonb DEFAULT '[]'::jsonb,
  documentos jsonb DEFAULT '[]'::jsonb,
  origem text,
  canal_venda text,
  raw_json jsonb,
  vendedor text,
  vendedor_email text,
  vendedor_id bigint,
  status_kanban text DEFAULT 'ENVIADA'::text CHECK (status_kanban = ANY (ARRAY['ENVIADA'::text, 'ANÁLISE'::text, 'IMPLANTADA'::text, 'CANCELADA'::text, 'OPORTUNIDADES'::text, 'EM_CONTATO'::text, 'NEGOCIACAO'::text, 'PROPOSTA'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  first_contact_date timestamp without time zone,
  dados_proposta jsonb DEFAULT '{}'::jsonb,
  dados_perda jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.users_profile(id) ON DELETE SET NULL
);

-- Tabela: activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  opportunity_id bigint,
  lead_id bigint,
  type text NOT NULL CHECK (type = ANY (ARRAY['STATUS_CHANGE'::text, 'DOCUMENT_UPLOAD'::text, 'NOTE_ADDED'::text, 'VALUE_UPDATED'::text, 'REASSIGNMENT'::text, 'CONTACT_MADE'::text, 'LOSS_RECORDED'::text, 'CONVERSION'::text])),
  description text NOT NULL,
  user_id bigint NOT NULL,
  user_name text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

-- Tabela: assignment_history
CREATE TABLE IF NOT EXISTS public.assignment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  opportunity_id bigint,
  lead_id bigint,
  previous_seller_id bigint,
  new_seller_id bigint NOT NULL,
  assigned_by_user_id bigint NOT NULL,
  assigned_by_name text NOT NULL,
  reason text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT assignment_history_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_history_previous_seller_id_fkey FOREIGN KEY (previous_seller_id) REFERENCES public.users_profile(id) ON DELETE SET NULL,
  CONSTRAINT assignment_history_new_seller_id_fkey FOREIGN KEY (new_seller_id) REFERENCES public.users_profile(id) ON DELETE CASCADE,
  CONSTRAINT assignment_history_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

-- Tabela: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['NEW_OPPORTUNITY'::text, 'OPPORTUNITY_ASSIGNED'::text, 'PROPOSAL_STATUS_CHANGED'::text, 'DOCUMENT_UPLOADED'::text, 'DEADLINE_APPROACHING'::text, 'SYSTEM_MAINTENANCE'::text])),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_leads_vendedor_id ON public.leads(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_kanban ON public.leads(status_kanban);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead_id ON public.activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES
-- =====================================================

-- users_profile: Todos podem ver, apenas admins podem modificar
CREATE POLICY "Users can view all profiles" ON public.users_profile FOR SELECT USING (true);
CREATE POLICY "Admins can manage profiles" ON public.users_profile FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);

-- leads: Vendedores veem seus leads, admins veem tudo
CREATE POLICY "Sellers see their leads" ON public.leads FOR SELECT USING (
  vendedor_id IN (SELECT id FROM public.users_profile WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Sellers update their leads" ON public.leads FOR UPDATE USING (
  vendedor_id IN (SELECT id FROM public.users_profile WHERE auth_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Admins manage all leads" ON public.leads FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);

-- activity_logs: Leitura para todos autenticados, escrita para todos
CREATE POLICY "Users can view activity logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Users can create activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- assignment_history: Leitura para todos, escrita para admins
CREATE POLICY "Users can view assignment history" ON public.assignment_history FOR SELECT USING (true);
CREATE POLICY "Admins can create assignment history" ON public.assignment_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);

-- notifications: Usuários veem suas próprias notificações
CREATE POLICY "Users see their notifications" ON public.notifications FOR SELECT USING (
  user_id IN (SELECT id FROM public.users_profile WHERE auth_id = auth.uid())
);
CREATE POLICY "Users update their notifications" ON public.notifications FOR UPDATE USING (
  user_id IN (SELECT id FROM public.users_profile WHERE auth_id = auth.uid())
);
CREATE POLICY "Admins create notifications" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);

-- operadoras e produtos: Todos podem ler, admins podem modificar
CREATE POLICY "Users can view operadoras" ON public.operadoras FOR SELECT USING (true);
CREATE POLICY "Admins manage operadoras" ON public.operadoras FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Users can view produtos" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "Admins manage produtos" ON public.produtos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users_profile WHERE auth_id = auth.uid() AND role = 'ADMIN')
);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON public.users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operadoras_updated_at BEFORE UPDATE ON public.operadoras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
