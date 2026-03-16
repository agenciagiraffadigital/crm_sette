# Documento de Requisitos — Documentação do Sistema Atual (Sette CRM v2)

## Introdução

Este documento descreve os requisitos de documentação do sistema Sette CRM como ele existe hoje, antes do desenvolvimento da v3. O objetivo é mapear completamente os três fluxos principais: o funil de Oportunidades, o funil de Propostas e o Formulário de Lead (ModernLeadForm). Esta documentação serve como base de referência para futuras decisões de produto e desenvolvimento.

O sistema atual é uma SPA React com backend Supabase, organizada em torno de uma única tabela `leads` que serve tanto para oportunidades quanto para propostas, diferenciadas pelo campo `status_kanban`.

## Glossário

- **Sistema_CRM**: O sistema Sette CRM como um todo, incluindo frontend React e backend Supabase
- **Quadro_Oportunidades**: Tela Kanban que exibe leads nos estágios OPORTUNIDADES, EM_CONTATO e NEGOCIACAO (componente OpportunitiesBoard)
- **Quadro_Propostas**: Tela Kanban que exibe leads nos estágios ENVIADA, ANÁLISE e IMPLANTADA (componente ProposalsBoard)
- **Formulário_Lead**: Formulário completo de edição de lead/oportunidade (componente ModernLeadForm)
- **Lead**: Registro principal do sistema, armazenado na tabela `leads` do Supabase
- **Oportunidade**: Lead cujo `status_kanban` é OPORTUNIDADES, EM_CONTATO ou NEGOCIACAO
- **Proposta**: Lead cujo `status_kanban` é ENVIADA, ANÁLISE ou IMPLANTADA
- **Vendedor**: Usuário com role SELLER, responsável por gerenciar seus leads
- **Administrador**: Usuário com role ADMIN, com acesso total ao sistema
- **Beneficiário**: Pessoa física vinculada a um lead (titular ou dependente)
- **Nota**: Registro de atividade (Ligação, Apresentação, Proposta, Reunião, WhatsApp) vinculado a um lead
- **Documento_Beneficiário**: Arquivo obrigatório por beneficiário, configurado por operadora/produto/tipo_cliente
- **Responsável_Financeiro**: Pessoa responsável pelo pagamento, quando diferente do titular
- **Tela_Perdidas**: Tela que lista leads com status CANCELADA, com opção de recuperação

## Requisitos

### Requisito 1: Estrutura de Navegação do Sistema

**User Story:** Como um usuário do sistema, eu quero navegar entre as diferentes seções do CRM, para que eu possa acessar as funcionalidades necessárias ao meu trabalho.

#### Critérios de Aceitação

1. THE Sistema_CRM SHALL exibir uma barra de navegação fixa no topo com o logo "Sette CRM" e os itens de menu: Oportunidades, Propostas e Perdidas
2. WHEN o usuário autenticado possui role ADMIN, THE Sistema_CRM SHALL exibir adicionalmente o item "Dashboard" na navegação e as opções "Usuários" e "Operadoras" no menu do perfil
3. WHEN o usuário autenticado possui role SELLER, THE Sistema_CRM SHALL redirecionar para a aba "Oportunidades" como tela inicial
4. WHEN o usuário autenticado possui role ADMIN, THE Sistema_CRM SHALL redirecionar para a aba "Dashboard" como tela inicial
5. THE Sistema_CRM SHALL exibir um menu de perfil do usuário com nome, email, role e opção de logout

### Requisito 2: Quadro de Oportunidades (Kanban)

**User Story:** Como um vendedor, eu quero visualizar minhas oportunidades em um quadro Kanban, para que eu possa acompanhar o progresso de cada lead no funil de vendas.

#### Critérios de Aceitação

1. THE Quadro_Oportunidades SHALL exibir três colunas: "Oportunidades" (OPORTUNIDADES), "Em Contato" (EM_CONTATO) e "Negociação" (NEGOCIACAO)
2. WHEN o usuário possui role SELLER, THE Quadro_Oportunidades SHALL exibir apenas as oportunidades atribuídas ao vendedor logado
3. WHEN o usuário possui role ADMIN, THE Quadro_Oportunidades SHALL exibir todas as oportunidades de todos os vendedores
4. THE Quadro_Oportunidades SHALL exibir o contador de oportunidades em cada coluna
5. THE Quadro_Oportunidades SHALL carregar as oportunidades com paginação de 30 itens por coluna por requisição ao Supabase
6. WHEN o usuário arrasta um card de oportunidade de uma coluna para outra, THE Quadro_Oportunidades SHALL atualizar o status_kanban do lead no Supabase e registrar um log de atividade com a mudança de status
7. WHEN o usuário arrasta uma oportunidade para a coluna "Negociação" e o lead não possui valor_produto preenchido, THE Quadro_Oportunidades SHALL exibir um modal solicitando o valor do produto antes de permitir a movimentação


### Requisito 3: Card de Oportunidade

**User Story:** Como um vendedor, eu quero visualizar as informações essenciais de cada oportunidade no card do Kanban, para que eu possa identificar rapidamente os dados do lead.

#### Critérios de Aceitação

1. THE Quadro_Oportunidades SHALL exibir em cada card: nome do lead, ID, origem, email, telefone, vendedor responsável e data de criação
2. WHEN a oportunidade está na coluna "Negociação" e possui valor cotado maior que zero, THE Quadro_Oportunidades SHALL exibir o valor formatado em moeda brasileira (R$) no card
3. WHEN o usuário clica em um card de oportunidade, THE Sistema_CRM SHALL abrir o Formulário_Lead com os dados completos do lead
4. THE Quadro_Oportunidades SHALL permitir arrastar cada card entre colunas via drag-and-drop nativo do HTML5

### Requisito 4: Criação Manual de Oportunidade

**User Story:** Como um vendedor ou administrador, eu quero criar uma nova oportunidade manualmente, para que eu possa registrar leads que chegam por canais não automatizados.

#### Critérios de Aceitação

1. WHEN o usuário clica no botão "Nova Oportunidade", THE Quadro_Oportunidades SHALL exibir um diálogo em duas etapas: seleção de origem e preenchimento de dados
2. THE Quadro_Oportunidades SHALL oferecer as seguintes opções de origem: Plantão de Vendas, NetWorking, Diretoria, JustSell, Indicação (clientes)
3. THE Quadro_Oportunidades SHALL exigir os campos obrigatórios: nome, email, telefone, tipo_cliente, CEP, logradouro, número, bairro, cidade e estado
4. WHEN o CEP informado possui 8 dígitos, THE Quadro_Oportunidades SHALL buscar automaticamente o endereço via API ViaCEP e preencher logradouro, bairro, cidade e estado
5. WHEN o usuário possui role ADMIN, THE Quadro_Oportunidades SHALL permitir selecionar o vendedor responsável a partir da lista de vendedores ativos
6. WHEN a oportunidade é criada com sucesso, THE Quadro_Oportunidades SHALL inserir o lead na tabela `leads` com status_kanban "OPORTUNIDADES" e registrar um log de atividade do tipo CRIACAO

### Requisito 5: Busca e Filtros no Quadro de Oportunidades

**User Story:** Como um usuário, eu quero buscar e filtrar oportunidades, para que eu possa encontrar rapidamente leads específicos.

#### Critérios de Aceitação

1. THE Quadro_Oportunidades SHALL oferecer um campo de busca por texto que filtra por nome, email, telefone ou ID do lead com debounce de 300ms
2. WHEN o usuário possui role ADMIN, THE Quadro_Oportunidades SHALL exibir um filtro de vendedor com a opção "Todos Vendedores"
3. THE Quadro_Oportunidades SHALL oferecer um painel de "Filtros Avançados" com os filtros: Status, Operadora, Produto, Canal de venda (Origem) e Período (data início e data fim)
4. THE Quadro_Oportunidades SHALL exibir um botão de ordenação com as opções: A-Z, Z-A, Mais recente e Mais antiga
5. THE Quadro_Oportunidades SHALL exibir um badge com a contagem de filtros ativos no botão "Filtros Avançados"
6. WHEN o usuário clica em "Limpar", THE Quadro_Oportunidades SHALL remover todos os filtros aplicados e retornar à visualização padrão

### Requisito 6: Ações sobre Oportunidades (Ganhar, Perder, Converter)

**User Story:** Como um vendedor, eu quero marcar oportunidades como ganhas, perdidas ou convertê-las em propostas, para que eu possa registrar o resultado de cada negociação.

#### Critérios de Aceitação

1. WHEN o usuário seleciona "Ganhar" no menu de ações do Formulário_Lead e a oportunidade está em OPORTUNIDADES ou EM_CONTATO sem valor_produto, THE Formulário_Lead SHALL solicitar o valor do produto antes de exibir o diálogo de motivo de ganho
2. WHEN o usuário confirma o ganho, THE Formulário_Lead SHALL registrar o motivo selecionado (Confiança, Melhoria na rede de atendimento, Adequação de custos, Campanha de vendas, O cliente já conhecia o produto/serviço, Outros) e mover o lead para o status ENVIADA
3. WHEN o usuário seleciona "Perder" no menu de ações, THE Formulário_Lead SHALL exibir um diálogo com seleção de motivo (Achou caro, Não tem interesse, Já possui Serviço/Produto semelhante, Outros), campo de detalhes opcional e toggle de follow-up
4. WHEN o follow-up está ativado no diálogo de perda, THE Formulário_Lead SHALL exigir data de retorno e status de retorno (OPORTUNIDADES, EM_CONTATO ou NEGOCIACAO)
5. WHEN o usuário confirma a perda, THE Sistema_CRM SHALL atualizar o status_kanban para CANCELADA, registrar o motivo e detalhes, e registrar um log de atividade do tipo LEAD_PERDIDO
6. WHEN uma oportunidade está em NEGOCIACAO e possui valor cotado, THE Quadro_Oportunidades SHALL permitir a conversão para proposta, alterando o status_kanban para ENVIADA

### Requisito 7: Quadro de Propostas (Kanban)

**User Story:** Como um vendedor, eu quero visualizar minhas propostas em um quadro Kanban, para que eu possa acompanhar o progresso de cada proposta até a implantação.

#### Critérios de Aceitação

1. THE Quadro_Propostas SHALL exibir três colunas: "Enviada" (ENVIADA), "Em Análise (Adm)" (ANÁLISE) e "Implantada" (IMPLANTADA)
2. WHEN o usuário possui role SELLER, THE Quadro_Propostas SHALL exibir apenas as propostas atribuídas ao vendedor logado
3. WHEN o usuário possui role ADMIN, THE Quadro_Propostas SHALL exibir todas as propostas de todos os vendedores
4. THE Quadro_Propostas SHALL carregar as propostas com paginação de 30 itens por coluna e exibir botão "Carregar mais" quando houver mais registros
5. THE Quadro_Propostas SHALL exibir o contador total de propostas em cada coluna (contagem do servidor)
6. WHEN o usuário arrasta um card de proposta de uma coluna para outra, THE Quadro_Propostas SHALL atualizar o status_kanban do lead no Supabase e registrar um log de atividade
7. THE Quadro_Propostas SHALL oferecer os mesmos filtros do Quadro_Oportunidades: busca por texto, filtro de vendedor (admin), filtros avançados (status, operadora, origem, período, faixa de valor)

### Requisito 8: Card de Proposta

**User Story:** Como um vendedor, eu quero visualizar as informações essenciais de cada proposta no card do Kanban, para que eu possa identificar rapidamente os dados do lead.

#### Critérios de Aceitação

1. THE Quadro_Propostas SHALL exibir em cada card: nome do lead, ID, produto, operadora, email, telefone, vendedor responsável e valor do produto (quando disponível) formatado em R$
2. WHEN o usuário clica em um card de proposta, THE Sistema_CRM SHALL abrir o Formulário_Lead com os dados completos do lead
3. THE Quadro_Propostas SHALL permitir arrastar cada card entre colunas via drag-and-drop
4. WHEN o usuário possui role ADMIN, THE Quadro_Propostas SHALL exibir opção de excluir a proposta com diálogo de confirmação

### Requisito 9: Formulário de Lead — Dados Pessoais e Contato

**User Story:** Como um vendedor, eu quero editar os dados pessoais e de contato de um lead, para que eu possa manter as informações atualizadas.

#### Critérios de Aceitação

1. THE Formulário_Lead SHALL carregar todos os dados do lead via `leadService.getLeadById`, incluindo beneficiários da tabela `beneficiarios` e responsável financeiro da tabela `responsaveis_financeiros`
2. THE Formulário_Lead SHALL exibir os seguintes campos editáveis na aba "Informações": nome (obrigatório), email (obrigatório), telefone (obrigatório) com máscara, CPF/CNPJ com máscara automática (CPF ou CNPJ conforme tamanho), RG/IE com máscara, data de nascimento/abertura, tipo de cliente (PF, PJ, ADESAO), origem e canal de venda
3. THE Formulário_Lead SHALL exibir campos de endereço: CEP com máscara, logradouro, número, complemento, bairro, cidade e estado
4. WHEN o CEP informado possui 8 dígitos, THE Formulário_Lead SHALL buscar automaticamente o endereço via API ViaCEP e preencher logradouro, bairro, cidade e estado
5. THE Formulário_Lead SHALL exibir campos de produto: operadora (select dinâmico carregado do Supabase), produto (select dinâmico filtrado pela operadora selecionada), valor do produto, coparticipação (NÃO, PARCIAL, COMPLETA), redução de carência (checkbox) e vigência
6. THE Formulário_Lead SHALL exibir um seletor de status_kanban no header que mostra as colunas correspondentes ao tipo do lead (OPPORTUNITY_COLUMNS para oportunidades, KANBAN_COLUMNS para propostas)
7. THE Formulário_Lead SHALL detectar alterações não salvas e exibir um diálogo de confirmação ao tentar sair da página
8. THE Formulário_Lead SHALL validar campos obrigatórios (nome, email, telefone, operadora, produto) e campos de beneficiários (nome, CPF, data de nascimento) antes de salvar

### Requisito 10: Formulário de Lead — Beneficiários e Dependentes

**User Story:** Como um vendedor, eu quero gerenciar os beneficiários e dependentes de um lead, para que eu possa registrar todas as pessoas cobertas pelo plano.

#### Critérios de Aceitação

1. THE Formulário_Lead SHALL exibir uma aba "Beneficiários" com a lista de titulares e seus dependentes em formato colapsável
2. WHEN o usuário clica em "Adicionar Titular", THE Formulário_Lead SHALL criar um novo beneficiário com tipo_beneficiario "TITULAR" e campos: nome, CPF com máscara, RG com máscara, email, telefone, data de nascimento e endereço completo (CEP, logradouro, número, complemento, bairro, cidade, estado)
3. WHEN o usuário clica em "Adicionar Dependente" em um titular, THE Formulário_Lead SHALL criar um novo beneficiário com tipo_beneficiario "DEPENDENTE" vinculado ao titular, com campo adicional tipo_dependente (Cônjuge, Filho/Filha, Pai e/ou Mãe, Irmãos, Padrasto e/ou Madrasta, Tios, Sogros, Sobrinhos, Cunhados, Genro/Nora)
4. THE Formulário_Lead SHALL permitir remover titulares e dependentes individualmente
5. WHEN o lead é salvo, THE Formulário_Lead SHALL deletar todos os beneficiários existentes na tabela `beneficiarios` e reinserir os atuais, criando automaticamente os registros de documentos obrigatórios na tabela `beneficiario_documentos` conforme a configuração da operadora/produto/tipo_cliente

### Requisito 11: Formulário de Lead — Documentos de Beneficiários

**User Story:** Como um vendedor, eu quero gerenciar os documentos obrigatórios de cada beneficiário, para que eu possa garantir que toda a documentação necessária está completa.

#### Critérios de Aceitação

1. THE Formulário_Lead SHALL exibir uma seção de documentos para cada beneficiário (titular e dependente), listando os documentos obrigatórios configurados para a operadora/produto/tipo_cliente
2. THE Formulário_Lead SHALL exibir o status de cada documento: PENDENTE (cinza), ENVIADO (amarelo), APROVADO (verde) ou REJEITADO (vermelho)
3. WHEN o vendedor faz upload de um arquivo (PDF, PNG, JPG, JPEG), THE Formulário_Lead SHALL enviar o arquivo ao Supabase Storage e atualizar o status do documento para ENVIADO
4. WHEN o administrador clica em "Aprovar" em um documento com status ENVIADO, THE Formulário_Lead SHALL atualizar o status para APROVADO
5. WHEN o administrador clica em "Rejeitar" em um documento com status ENVIADO, THE Formulário_Lead SHALL exibir um diálogo solicitando o motivo da rejeição e atualizar o status para REJEITADO com o motivo registrado
6. WHEN um documento possui status REJEITADO, THE Formulário_Lead SHALL exibir o motivo da rejeição e permitir reenvio do arquivo
7. WHEN o lead está no status ENVIADA e existem documentos pendentes, THE Formulário_Lead SHALL exibir um alerta visual "Documentos pendentes" no header
8. WHEN o usuário tenta mover o lead para o status ANÁLISE e existem documentos incompletos, THE Formulário_Lead SHALL bloquear a movimentação e exibir a lista de documentos pendentes

### Requisito 12: Formulário de Lead — Responsável Financeiro

**User Story:** Como um vendedor, eu quero registrar o responsável financeiro quando ele é diferente do titular, para que os dados de cobrança estejam corretos.

#### Critérios de Aceitação

1. THE Formulário_Lead SHALL exibir um toggle "Titular é o responsável financeiro" (padrão: ativado)
2. WHEN o toggle é desativado, THE Formulário_Lead SHALL exibir campos para o responsável financeiro: nome, CPF, RG, data de nascimento, telefone, email e endereço completo
3. WHEN o lead é salvo com responsável financeiro diferente do titular, THE Formulário_Lead SHALL salvar os dados na tabela `responsaveis_financeiros` vinculada ao lead
4. WHEN o toggle é reativado (titular é o responsável), THE Formulário_Lead SHALL deletar o registro de responsável financeiro da tabela

### Requisito 13: Formulário de Lead — Notas e Atividades

**User Story:** Como um vendedor, eu quero registrar notas e atividades em cada lead, para que eu possa manter um histórico de interações.

#### Critérios de Aceitação

1. THE Formulário_Lead SHALL exibir uma aba "Notas" com a lista de notas ordenadas por data de criação (mais recente primeiro)
2. WHEN o usuário clica em "Adicionar Nota", THE Formulário_Lead SHALL exibir um diálogo com os campos: atividade (Apresentação, Ligação, Proposta, Reunião, Whatsapp), data, horário, duração (5min a 8h) e anotações (obrigatório)
3. THE Formulário_Lead SHALL salvar a nota na tabela `notes` do Supabase com o lead_id, user_id e user_name do usuário logado
4. THE Formulário_Lead SHALL permitir editar e excluir notas existentes
5. THE Formulário_Lead SHALL exibir cada nota com badge colorido por tipo de atividade, data/hora, duração e nome do autor

### Requisito 14: Formulário de Lead — Histórico de Atividades

**User Story:** Como um vendedor, eu quero visualizar o histórico completo de atividades de um lead, para que eu possa entender todo o ciclo de vida da negociação.

#### Critérios de Aceitação

1. THE Formulário_Lead SHALL exibir uma aba "Histórico" com todos os logs de atividade do lead, ordenados por data (mais recente primeiro)
2. THE Formulário_Lead SHALL registrar automaticamente logs para: criação do lead (CRIACAO), mudança de status (MUDANCA_STATUS), atualização de dados (ATUALIZACAO), lead perdido (LEAD_PERDIDO), lead ganho (LEAD_GANHO), lead recuperado (LEAD_RECUPERADO) e reatribuição de vendedor (REASSIGNMENT)
3. THE Formulário_Lead SHALL exibir em cada log: tipo, descrição, nome do usuário e data/hora

### Requisito 15: Formulário de Lead — Menu de Ações

**User Story:** Como um vendedor, eu quero acessar ações rápidas sobre o lead, para que eu possa executar operações comuns sem navegar por múltiplas telas.

#### Critérios de Aceitação

1. THE Formulário_Lead SHALL exibir um botão "Ações" no header que abre um menu dropdown com as opções: Ganhar, Perder, Enviar WhatsApp
2. WHEN o usuário possui role ADMIN, THE Formulário_Lead SHALL exibir adicionalmente as opções: Transferir (reatribuir vendedor) e Excluir
3. WHEN o usuário seleciona "Enviar WhatsApp", THE Formulário_Lead SHALL abrir um modal com DDI (+55 padrão), telefone pré-preenchido do lead, campo de mensagem (máximo 1000 caracteres) e botão de envio que abre o WhatsApp Web
4. WHEN o usuário possui role ADMIN e seleciona "Transferir", THE Formulário_Lead SHALL exibir um modal com a lista de vendedores ativos para seleção e atualizar vendedor, vendedor_email e vendedor_id do lead
5. WHEN o usuário possui role ADMIN e seleciona "Excluir", THE Formulário_Lead SHALL exibir um diálogo de confirmação e, ao confirmar, deletar permanentemente o lead da tabela `leads`

### Requisito 16: Tela de Oportunidades Perdidas

**User Story:** Como um vendedor, eu quero visualizar as oportunidades perdidas, para que eu possa analisar os motivos de perda e recuperar leads quando apropriado.

#### Critérios de Aceitação

1. THE Tela_Perdidas SHALL listar todos os leads com status_kanban CANCELADA, ordenados por data de atualização (mais recente primeiro)
2. WHEN o usuário possui role SELLER, THE Tela_Perdidas SHALL exibir apenas os leads perdidos atribuídos ao vendedor logado
3. WHEN o usuário possui role ADMIN, THE Tela_Perdidas SHALL exibir todos os leads perdidos de todos os vendedores
4. THE Tela_Perdidas SHALL exibir para cada lead: nome, email, telefone, vendedor, operadora, origem, data de perda e data de follow-up (quando configurada)
5. THE Tela_Perdidas SHALL oferecer os mesmos filtros avançados: busca por texto, filtro de vendedor (admin), operadora, origem e período
6. WHEN o usuário clica em "Recuperar para Oportunidades", THE Tela_Perdidas SHALL alterar o status_kanban do lead para OPORTUNIDADES e registrar um log de atividade do tipo LEAD_RECUPERADO

### Requisito 17: Ingestão de Leads via Webhook

**User Story:** Como administrador, eu quero que leads recebidos via webhook sejam automaticamente distribuídos entre os vendedores, para que a carga de trabalho seja equilibrada.

#### Critérios de Aceitação

1. WHEN o sistema recebe um payload JSON via webhook, THE Sistema_CRM SHALL extrair nome, email, telefone, documento, operadora, produto e origem do payload
2. THE Sistema_CRM SHALL distribuir o lead entre os vendedores ativos usando algoritmo Round-Robin baseado na ordem crescente de IDs dos vendedores
3. THE Sistema_CRM SHALL excluir usuários com role ADMIN da distribuição Round-Robin
4. THE Sistema_CRM SHALL criar o lead na tabela `leads` com status_kanban OPORTUNIDADES e registrar um log de atividade do tipo CRIACAO
5. THE Sistema_CRM SHALL oferecer um painel de simulação (acessível apenas para ADMIN) que permite disparar webhooks fake para testar a ingestão e distribuição

### Requisito 18: Controle de Acesso e Permissões

**User Story:** Como administrador, eu quero que o sistema controle o acesso baseado em roles, para que cada usuário veja apenas o que é pertinente ao seu papel.

#### Critérios de Aceitação

1. THE Sistema_CRM SHALL restringir a visualização de leads: vendedores veem apenas seus próprios leads, administradores veem todos os leads
2. THE Sistema_CRM SHALL restringir as seguintes ações exclusivamente ao role ADMIN: excluir leads, reatribuir vendedores, acessar Dashboard, gerenciar Usuários, gerenciar Operadoras e acessar o Simulador de Webhook
3. THE Sistema_CRM SHALL permitir que o administrador altere o vendedor responsável de qualquer lead via botão de edição no header do Formulário_Lead ou via opção "Transferir" no menu de ações
4. THE Sistema_CRM SHALL manter a sessão do usuário via localStorage (chave `crm_user`) e listener de autenticação do Supabase

### Requisito 19: Gestão de Operadoras e Produtos

**User Story:** Como administrador, eu quero gerenciar as operadoras e seus produtos, para que os vendedores possam selecionar as opções corretas ao cadastrar leads.

#### Critérios de Aceitação

1. THE Sistema_CRM SHALL permitir ao administrador cadastrar, editar e excluir operadoras na tela "Operadoras"
2. THE Sistema_CRM SHALL permitir ao administrador cadastrar, editar e excluir produtos vinculados a cada operadora
3. THE Sistema_CRM SHALL permitir ao administrador configurar os documentos obrigatórios por combinação de operadora, produto e tipo de cliente (PF, PME, ADESAO) via painel de configuração de documentos
4. WHEN o vendedor seleciona uma operadora no Formulário_Lead, THE Formulário_Lead SHALL carregar dinamicamente os produtos disponíveis para aquela operadora

### Requisito 20: Modelo de Dados — Tabela Unificada de Leads

**User Story:** Como desenvolvedor da v3, eu quero entender o modelo de dados atual, para que eu possa planejar a migração corretamente.

#### Critérios de Aceitação

1. THE Sistema_CRM SHALL armazenar oportunidades e propostas na mesma tabela `leads`, diferenciadas pelo campo `status_kanban`
2. THE Sistema_CRM SHALL utilizar os seguintes valores de status_kanban para oportunidades: OPORTUNIDADES, EM_CONTATO, NEGOCIACAO
3. THE Sistema_CRM SHALL utilizar os seguintes valores de status_kanban para propostas: ENVIADA, ANÁLISE, IMPLANTADA
4. THE Sistema_CRM SHALL utilizar o valor CANCELADA para leads perdidos
5. THE Sistema_CRM SHALL armazenar beneficiários em tabela separada `beneficiarios` com referência ao lead_id e hierarquia titular/dependente via campo `titular_id`
6. THE Sistema_CRM SHALL armazenar notas em tabela separada `notes` com referência ao lead_id
7. THE Sistema_CRM SHALL armazenar logs de atividade em tabela `activity_logs` com referência ao lead_id ou opportunity_id
8. THE Sistema_CRM SHALL armazenar documentos de beneficiários em tabela `beneficiario_documentos` com referência ao beneficiario_id e documento_config_id
9. THE Sistema_CRM SHALL armazenar configurações de documentos obrigatórios em tabela `documento_configs` com referência a operadora_id, produto_id e tipo_cliente
10. THE Sistema_CRM SHALL armazenar responsáveis financeiros em tabela `responsaveis_financeiros` com referência ao lead_id

### Requisito 21: Fluxo Completo do Funil — Oportunidade até Implantação

**User Story:** Como gestor, eu quero entender o fluxo completo de um lead desde a entrada até a implantação, para que eu possa documentar o processo de negócio.

#### Critérios de Aceitação

1. WHEN um lead entra no sistema (via webhook ou criação manual), THE Sistema_CRM SHALL atribuí-lo ao status OPORTUNIDADES com um vendedor responsável
2. WHEN o vendedor faz o primeiro contato, THE Sistema_CRM SHALL permitir mover o lead para EM_CONTATO via drag-and-drop ou alteração de status no formulário
3. WHEN o vendedor inicia a negociação e informa o valor do produto, THE Sistema_CRM SHALL permitir mover o lead para NEGOCIACAO
4. WHEN a negociação é concluída com sucesso (ganho), THE Sistema_CRM SHALL mover o lead para ENVIADA, iniciando a fase de proposta
5. WHEN a proposta é enviada e os documentos são completados, THE Sistema_CRM SHALL permitir mover o lead para ANÁLISE
6. WHEN a análise administrativa é concluída, THE Sistema_CRM SHALL permitir mover o lead para IMPLANTADA
7. IF em qualquer etapa o lead é perdido, THEN THE Sistema_CRM SHALL mover o lead para CANCELADA com registro de motivo e opção de follow-up
8. IF um lead perdido é recuperado, THEN THE Sistema_CRM SHALL mover o lead de volta para OPORTUNIDADES com registro de log LEAD_RECUPERADO
