# Documento de Requisitos do Bugfix

## Introdução

Bug crítico no Quadro de Oportunidades (`OpportunitiesBoard.tsx`) onde os filtros de busca e paginação não funcionam corretamente. Quando o usuário aplica um filtro de busca (ex: pesquisar por "nara"), os contadores das colunas mostram 0 e nenhum lead correspondente aparece, mesmo existindo registros no banco de dados. O botão "Carregar mais" carrega a próxima página de resultados **sem filtro**, forçando o usuário a paginar manualmente até encontrar o lead desejado por acaso.

**Causa raiz confirmada pela análise do código:**

1. `opportunityService.getOpportunitiesByStatus()` consulta o Supabase **sem nenhum parâmetro de filtro** — apenas filtra por `status_kanban` e opcionalmente por `vendedor_id`.
2. O componente `OpportunitiesBoard` aplica os filtros (busca, vendedor, operadora, etc.) **apenas no lado do cliente** via `useMemo`, filtrando o array `allColumnOpportunities` que contém somente os dados já carregados (página atual).
3. O botão "Carregar mais" chama `loadColumn()` que busca a próxima página **sem filtros**, trazendo dados não relacionados à busca.
4. Os contadores usam `columnCounts` do servidor (sem filtro) quando não há filtros ativos, mas quando há filtros, contam apenas os itens filtrados do array local — que está vazio porque os dados filtrados não foram buscados do servidor.

## Análise do Bug

### Comportamento Atual (Defeito)

1.1 QUANDO o usuário aplica um filtro de busca (searchTerm) no Quadro de Oportunidades ENTÃO o sistema filtra apenas os leads já carregados na memória do cliente, ignorando leads correspondentes que existem no banco de dados mas não foram carregados na página atual

1.2 QUANDO o usuário aplica um filtro de busca ENTÃO os contadores das colunas mostram 0 (ou contagem incorreta) porque a contagem é feita sobre os dados filtrados localmente, não sobre o total de registros filtrados no servidor

1.3 QUANDO o usuário clica em "Carregar mais" com um filtro de busca ativo ENTÃO o sistema carrega a próxima página de resultados SEM aplicar o filtro de busca na query ao Supabase, trazendo leads que não correspondem à pesquisa

1.4 QUANDO o usuário aplica filtros avançados (vendedor, operadora, produto, origem, período) ENTÃO o sistema filtra apenas os dados já carregados localmente, não enviando esses filtros como parâmetros na query ao Supabase

1.5 QUANDO o usuário aplica qualquer filtro e a primeira página de 30 resultados não contém nenhum lead correspondente ENTÃO as colunas aparecem completamente vazias, mesmo havendo leads correspondentes no banco de dados

### Comportamento Esperado (Correto)

2.1 QUANDO o usuário aplica um filtro de busca (searchTerm) no Quadro de Oportunidades ENTÃO o sistema SHALL enviar o termo de busca como parâmetro na query ao Supabase (usando `ilike` ou `or` com `ilike` nos campos nome, email, telefone) e retornar apenas leads que correspondam ao filtro

2.2 QUANDO o usuário aplica um filtro de busca ENTÃO os contadores das colunas SHALL refletir a contagem total de registros que correspondem ao filtro no banco de dados (usando `count: 'exact'` do Supabase com os filtros aplicados)

2.3 QUANDO o usuário clica em "Carregar mais" com um filtro de busca ativo ENTÃO o sistema SHALL carregar a próxima página de resultados aplicando o mesmo filtro de busca na query ao Supabase, trazendo apenas leads que correspondem à pesquisa

2.4 QUANDO o usuário aplica filtros avançados (vendedor, operadora, produto, origem, período) ENTÃO o sistema SHALL enviar esses filtros como parâmetros na query ao Supabase, retornando apenas leads que correspondam aos critérios selecionados

2.5 QUANDO o usuário aplica qualquer filtro ENTÃO as colunas SHALL exibir imediatamente os leads correspondentes (recarregando da página 0 com os novos filtros) e os contadores SHALL mostrar a contagem correta do servidor

### Comportamento Inalterado (Prevenção de Regressão)

3.1 QUANDO nenhum filtro está ativo (estado padrão ao carregar a página) ENTÃO o sistema SHALL CONTINUAR A carregar 30 leads por coluna, paginados por `created_at` descendente, com contadores mostrando o total correto

3.2 QUANDO o usuário arrasta uma oportunidade entre colunas (drag and drop) ENTÃO o sistema SHALL CONTINUAR A mover a oportunidade para o novo status corretamente, independentemente de filtros ativos

3.3 QUANDO o usuário é do tipo SELLER (não ADMIN) ENTÃO o sistema SHALL CONTINUAR A filtrar por `vendedor_id` no servidor, mostrando apenas as oportunidades do vendedor logado

3.4 QUANDO o usuário clica em "Carregar mais" sem filtros ativos ENTÃO o sistema SHALL CONTINUAR A carregar a próxima página de 30 leads sem filtro, mantendo o comportamento atual de paginação

3.5 QUANDO o usuário limpa todos os filtros ENTÃO o sistema SHALL CONTINUAR A recarregar os dados no estado padrão (sem filtros), mostrando todos os leads paginados normalmente
