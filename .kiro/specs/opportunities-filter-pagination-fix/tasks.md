# Plano de Implementação

- [x] 1. Escrever teste exploratório da condição de bug
  - **Property 1: Bug Condition** — Filtros ignorados na query do servidor
  - **CRÍTICO**: Este teste DEVE FALHAR no código não corrigido — a falha confirma que o bug existe
  - **NÃO tente corrigir o teste ou o código quando ele falhar**
  - **NOTA**: Este teste codifica o comportamento esperado — ele validará a correção quando passar após a implementação
  - **OBJETIVO**: Demonstrar contraexemplos que provam que o bug existe
  - **Abordagem PBT com escopo**: Gerar combinações de filtros (searchTerm, sellers, operators, products, sources, dateRange) e verificar que `getOpportunitiesByStatus` aplica cada filtro na query Supabase
  - Arquivo de teste: `services/__tests__/opportunityService.test.ts` (adicionar novo describe)
  - Mockar Supabase e verificar que os métodos de filtro (`.or()`, `.in()`, `.gte()`, `.lte()`) são chamados quando filtros estão presentes
  - Testar com `filters: { searchTerm: "nara" }` → verificar que `.or('nome.ilike.%nara%,...')` é chamado na query
  - Testar com `filters: { operators: ["Amil"] }` → verificar que `.in('operadora', ["Amil"])` é chamado
  - Testar com `filters: { dateRange: { start: "2024-01-01" } }` → verificar que `.gte('created_at', ...)` é chamado
  - Executar no código NÃO corrigido
  - **RESULTADO ESPERADO**: Teste FALHA (correto — prova que o bug existe, pois a função nem aceita parâmetro de filtros)
  - Documentar contraexemplos encontrados para entender a causa raiz
  - Marcar tarefa como completa quando o teste estiver escrito, executado e a falha documentada
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Escrever testes de preservação (ANTES de implementar a correção)
  - **Property 2: Preservation** — Comportamento sem filtros inalterado
  - **IMPORTANTE**: Seguir metodologia observation-first
  - Arquivo de teste: `services/__tests__/opportunityService.test.ts` (adicionar novo describe)
  - Observar: `getOpportunitiesByStatus(adminUser, 'OPORTUNIDADES', 0, 29)` sem filtros retorna dados paginados com count correto
  - Observar: `getOpportunitiesByStatus(sellerUser, 'EM_CONTATO', 0, 29)` aplica `.eq('vendedor_id', sellerUser.id)` no servidor
  - Observar: `getOpportunitiesByStatus(adminUser, 'NEGOCIACAO', 30, 59)` retorna segunda página normalmente
  - Escrever teste property-based: para qualquer status e range de paginação válidos, sem filtros (filters=undefined), a query deve conter apenas `.eq('status_kanban', status)`, `.order('created_at', { ascending: false })` e `.range(from, to)`, e para SELLER deve incluir `.eq('vendedor_id', ...)`
  - Verificar que a assinatura `getOpportunitiesByStatus(user, status, from, to)` sem 5º parâmetro continua funcionando
  - Executar no código NÃO corrigido
  - **RESULTADO ESPERADO**: Testes PASSAM (confirma comportamento baseline a preservar)
  - Marcar tarefa como completa quando os testes estiverem escritos, executados e passando no código não corrigido
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [x] 3. Correção dos filtros e paginação do Quadro de Oportunidades

  - [x] 3.1 Implementar a correção em `services/opportunityService.ts`
    - Criar interface `OpportunityQueryFilters` com campos opcionais: `searchTerm?: string`, `sellers?: string[]`, `operators?: string[]`, `products?: string[]`, `sources?: string[]`, `dateRange?: { start?: string; end?: string }`, `sortBy?: string`
    - Adicionar parâmetro opcional `filters?: OpportunityQueryFilters` como 5º parâmetro de `getOpportunitiesByStatus`
    - Quando `searchTerm` presente: aplicar `.or('nome.ilike.%term%,email.ilike.%term%,telefone.ilike.%term%')`
    - Quando `sellers` presente e não vazio: aplicar `.in('vendedor', sellers)`
    - Quando `operators` presente e não vazio: aplicar `.in('operadora', operators)`
    - Quando `products` presente e não vazio: aplicar `.in('produto', products)`
    - Quando `sources` presente e não vazio: aplicar `.in('origem', sources)`
    - Quando `dateRange.start` presente: aplicar `.gte('created_at', start)`
    - Quando `dateRange.end` presente: aplicar `.lte('created_at', end)`
    - Quando `sortBy` presente: ajustar `.order()` conforme valor (name-asc, name-desc, date-desc, date-asc)
    - _Bug_Condition: isBugCondition(input) onde hasActiveFilters AND (action == 'load' OR action == 'paginate')_
    - _Expected_Behavior: query Supabase inclui todos os filtros ativos, retorna apenas registros correspondentes com count filtrado_
    - _Preservation: sem filtros (filters=undefined), query idêntica à original_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 3.5_

  - [x] 3.2 Implementar a correção em `components/OpportunitiesBoard.tsx`
    - Modificar `loadColumn` para converter `searchFilters` em `OpportunityQueryFilters` e passar como 5º parâmetro ao `getOpportunitiesByStatus()`
    - Adicionar `useEffect` que, quando `searchFilters` mudar, reseta paginação (página 0) e recarrega todas as colunas com os novos filtros
    - Remover o `useMemo` de `filteredOpportunities` que filtra localmente — os dados já vêm filtrados do servidor
    - Usar `columnCounts` diretamente para os contadores de cada coluna (já refletem o total filtrado)
    - Ajustar `opportunitiesByStatus` para usar `columnData` diretamente em vez de `filteredOpportunities`
    - _Bug_Condition: isBugCondition(input) onde hasActiveFilters AND (action == 'load' OR action == 'paginate')_
    - _Expected_Behavior: loadColumn passa filtros ao serviço, mudança de filtro reseta paginação e recarrega_
    - _Preservation: sem filtros ativos, comportamento idêntico ao original_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.5_

  - [x] 3.3 Verificar que o teste exploratório de bug condition agora passa
    - **Property 1: Expected Behavior** — Filtros aplicados na query do servidor
    - **IMPORTANTE**: Re-executar o MESMO teste da tarefa 1 — NÃO escrever um novo teste
    - O teste da tarefa 1 codifica o comportamento esperado
    - Quando este teste passar, confirma que o comportamento esperado está satisfeito
    - Executar teste exploratório de bug condition da tarefa 1
    - **RESULTADO ESPERADO**: Teste PASSA (confirma que o bug foi corrigido)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.4 Verificar que os testes de preservação ainda passam
    - **Property 2: Preservation** — Comportamento sem filtros inalterado
    - **IMPORTANTE**: Re-executar os MESMOS testes da tarefa 2 — NÃO escrever novos testes
    - Executar testes de preservação da tarefa 2
    - **RESULTADO ESPERADO**: Testes PASSAM (confirma que não houve regressão)
    - Confirmar que todos os testes ainda passam após a correção

- [x] 4. Checkpoint — Garantir que todos os testes passam
  - Executar todos os testes do projeto
  - Garantir que todos os testes passam, perguntar ao usuário se surgirem dúvidas
