# Bugfix Design — Filtros e Paginação do Quadro de Oportunidades

## Overview

O Quadro de Oportunidades (`OpportunitiesBoard.tsx`) possui um bug crítico onde os filtros de busca e paginação não funcionam corretamente. A função `getOpportunitiesByStatus()` no `opportunityService.ts` não aceita parâmetros de filtro, fazendo com que toda a filtragem ocorra apenas no lado do cliente sobre dados já carregados (máximo 30 por coluna). Isso resulta em colunas vazias ao buscar, contadores incorretos e o botão "Carregar mais" trazendo dados sem filtro.

A correção é mínima e focada na camada de dados: adicionar um parâmetro `filters` opcional à função do serviço, aplicar os filtros na query Supabase, e ajustar o componente para passar os filtros ao carregar dados e resetar a paginação quando filtros mudam. Nenhuma alteração visual/layout será feita.

## Glossário

- **Bug_Condition (C)**: A condição que dispara o bug — quando qualquer filtro está ativo (searchTerm, sellers, operators, products, source, dateRange) e o sistema tenta carregar ou paginar dados
- **Property (P)**: O comportamento desejado — filtros devem ser aplicados na query Supabase, retornando apenas dados correspondentes com contagem correta
- **Preservation**: O comportamento existente sem filtros ativos que deve permanecer inalterado pela correção
- **getOpportunitiesByStatus()**: Função em `services/opportunityService.ts` que consulta leads por status no Supabase com paginação
- **loadColumn()**: Callback em `OpportunitiesBoard.tsx` que chama `getOpportunitiesByStatus()` para carregar dados de uma coluna
- **searchFilters**: Estado local do tipo `FilterState` em `OpportunitiesBoard.tsx` que armazena os filtros selecionados pelo usuário
- **OpportunityQueryFilters**: Novo tipo a ser criado para encapsular os parâmetros de filtro passados ao serviço

## Bug Details

### Bug Condition

O bug se manifesta quando o usuário aplica qualquer filtro (busca por texto, vendedor, operadora, produto, origem ou período) no Quadro de Oportunidades. A função `getOpportunitiesByStatus()` não recebe nem aplica esses filtros na query ao Supabase, e o componente filtra apenas os dados já carregados localmente (máximo 30 por coluna).

**Especificação Formal:**
```
FUNCTION isBugCondition(input)
  INPUT: input de tipo { filters: FilterState, action: 'load' | 'paginate' }
  OUTPUT: boolean

  hasActiveFilters := input.filters.searchTerm != ''
    OR input.filters.sellers.length > 0
    OR input.filters.operators.length > 0
    OR input.filters.products.length > 0
    OR input.filters.source.length > 0
    OR input.filters.dateRange.start != undefined
    OR input.filters.dateRange.end != undefined

  RETURN hasActiveFilters
         AND (input.action == 'load' OR input.action == 'paginate')
END FUNCTION
```

### Exemplos

- **Busca por nome**: Usuário digita "nara" no campo de busca. Esperado: ver leads com "nara" no nome. Atual: colunas mostram 0 resultados porque nenhum dos 30 leads da primeira página contém "nara"
- **Filtro por operadora**: Usuário seleciona "Amil". Esperado: ver apenas leads da Amil com contagem correta. Atual: filtra apenas os 30 leads já carregados, mostrando contagem parcial
- **Carregar mais com filtro**: Usuário busca "silva" e clica "Carregar mais". Esperado: próxima página de leads com "silva". Atual: carrega próximos 30 leads sem filtro, misturando resultados
- **Filtro por período**: Usuário seleciona período de 01/01 a 31/01. Esperado: leads criados nesse período. Atual: filtra apenas os 30 já carregados, ignorando leads do período em páginas posteriores

## Expected Behavior

### Preservation Requirements

**Comportamentos Inalterados:**
- Carregamento inicial sem filtros deve continuar trazendo 30 leads por coluna, ordenados por `created_at` descendente
- Drag and drop entre colunas deve continuar funcionando normalmente
- Filtro por `vendedor_id` no servidor para usuários SELLER deve continuar sendo aplicado
- Botão "Carregar mais" sem filtros ativos deve continuar carregando a próxima página normalmente
- Limpar filtros deve restaurar o estado padrão (sem filtros, dados recarregados)
- Todo o layout visual, componentes de UI, modais e toasts devem permanecer idênticos

**Escopo:**
Todas as interações que NÃO envolvem filtros ativos devem ser completamente não afetadas pela correção. Isso inclui:
- Carregamento inicial da página
- Paginação sem filtros
- Drag and drop de oportunidades
- Criação, edição e exclusão de oportunidades
- Modais de valor, perda e exclusão

## Hypothesized Root Cause

Com base na análise confirmada do código, as causas raiz são:

1. **Assinatura incompleta do serviço**: `getOpportunitiesByStatus(currentUser, status, from, to)` não aceita parâmetros de filtro. A query Supabase filtra apenas por `status_kanban` e opcionalmente `vendedor_id`, sem nenhum filtro de busca, operadora, produto, origem ou período.

2. **Filtragem exclusivamente client-side**: O `useMemo` de `filteredOpportunities` em `OpportunitiesBoard.tsx` aplica todos os filtros sobre `allColumnOpportunities`, que é a concatenação dos dados já carregados das 3 colunas. Como cada coluna carrega no máximo 30 registros, a filtragem opera sobre um subconjunto mínimo dos dados.

3. **loadColumn() não passa filtros**: A função `loadColumn()` chama `getOpportunitiesByStatus()` sem nenhum parâmetro de filtro, tanto no carregamento inicial quanto no "Carregar mais".

4. **Contadores híbridos incorretos**: O cálculo de `statusCounts` usa `columnCounts` do servidor (sem filtro) quando não há filtros, mas conta o array filtrado localmente quando há filtros — resultando em contagem 0 ou incorreta porque os dados filtrados não existem no array local.

## Correctness Properties

Property 1: Bug Condition — Filtros aplicados na query do servidor

_Para qualquer_ input onde a condição de bug é verdadeira (isBugCondition retorna true), a função corrigida `getOpportunitiesByStatus` SHALL aplicar os filtros na query Supabase e retornar apenas registros que correspondam aos critérios de filtro, com `count` refletindo o total filtrado no banco de dados.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation — Comportamento sem filtros inalterado

_Para qualquer_ input onde a condição de bug NÃO é verdadeira (isBugCondition retorna false), a função corrigida SHALL produzir exatamente o mesmo resultado que a função original, preservando o carregamento de 30 leads por coluna, ordenação por `created_at` descendente, filtro por `vendedor_id` para SELLER, e paginação normal.

**Validates: Requirements 3.1, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assumindo que a análise de causa raiz está correta:

**Arquivo**: `services/opportunityService.ts`

**Função**: `getOpportunitiesByStatus`

**Mudanças Específicas**:
1. **Novo tipo `OpportunityQueryFilters`**: Criar interface com campos opcionais: `searchTerm`, `sellers`, `operators`, `products`, `sources`, `dateRange`, `sortBy`
2. **Parâmetro `filters` opcional**: Adicionar `filters?: OpportunityQueryFilters` como 5º parâmetro da função
3. **Filtro de busca (searchTerm)**: Quando presente, aplicar `.or('nome.ilike.%term%,email.ilike.%term%,telefone.ilike.%term%')` na query
4. **Filtro de vendedor (sellers)**: Quando presente e não vazio, aplicar `.in('vendedor', sellers)`
5. **Filtro de operadora (operators)**: Quando presente, aplicar `.in('operadora', operators)` (campo `operadora` já existe na tabela `leads`)
6. **Filtro de produto (products)**: Quando presente, aplicar `.in('produto', products)`
7. **Filtro de origem (sources)**: Quando presente, aplicar `.in('origem', sources)`
8. **Filtro de período (dateRange)**: Quando `start` presente, aplicar `.gte('created_at', start)`. Quando `end` presente, aplicar `.lte('created_at', end)`
9. **Ordenação (sortBy)**: Quando presente, ajustar `.order()` conforme o valor (name-asc, name-desc, date-desc, date-asc)

**Arquivo**: `components/OpportunitiesBoard.tsx`

**Mudanças Específicas**:
1. **loadColumn() recebe filtros**: Modificar `loadColumn` para aceitar e passar `searchFilters` ao `getOpportunitiesByStatus()`
2. **useEffect para mudança de filtros**: Adicionar efeito que, quando `searchFilters` mudar, reseta paginação para página 0 e recarrega todas as colunas com os novos filtros
3. **Remover filtragem client-side**: Remover o `useMemo` de `filteredOpportunities` que filtra localmente. Manter apenas a lógica de agrupamento por status e ordenação (se sortBy não for tratado no servidor)
4. **Contadores diretos do servidor**: Usar `columnCounts` diretamente para os contadores, já que os dados retornados já estarão filtrados
5. **Carregar mais com filtros**: O botão "Carregar mais" já chama `loadColumn()`, que agora passará os filtros automaticamente

## Testing Strategy

### Validation Approach

A estratégia de testes segue uma abordagem em duas fases: primeiro, demonstrar o bug no código não corrigido com contraexemplos, depois verificar que a correção funciona e preserva o comportamento existente.

### Exploratory Bug Condition Checking

**Objetivo**: Demonstrar contraexemplos que evidenciam o bug ANTES de implementar a correção. Confirmar ou refutar a análise de causa raiz.

**Plano de Teste**: Escrever testes que mockam o Supabase e verificam que `getOpportunitiesByStatus()` NÃO aplica filtros na query. Executar no código não corrigido para observar falhas.

**Casos de Teste**:
1. **Busca por texto ignorada**: Chamar `getOpportunitiesByStatus` com filtro `searchTerm: "nara"` e verificar que a query Supabase NÃO contém `ilike` (vai falhar no código não corrigido porque o parâmetro nem existe)
2. **Filtro de operadora ignorado**: Chamar com filtro `operators: ["Amil"]` e verificar que a query NÃO contém `.in('operadora')` (vai falhar)
3. **Paginação sem filtro**: Simular "Carregar mais" com filtro ativo e verificar que a segunda página NÃO aplica o filtro (vai falhar)
4. **Contadores incorretos**: Verificar que com filtros ativos, `statusCounts` mostra 0 quando há dados correspondentes no banco (vai falhar)

**Contraexemplos Esperados**:
- A query Supabase não inclui nenhum filtro além de `status_kanban` e `vendedor_id`
- Causa confirmada: assinatura da função não aceita parâmetros de filtro

### Fix Checking

**Objetivo**: Verificar que para todos os inputs onde a condição de bug é verdadeira, a função corrigida produz o comportamento esperado.

**Pseudocódigo:**
```
PARA TODO input ONDE isBugCondition(input) FAÇA
  result := getOpportunitiesByStatus_fixed(user, status, from, to, input.filters)
  ASSERT result.data contém APENAS registros que correspondem aos filtros
  ASSERT result.count == total de registros filtrados no banco
FIM PARA
```

### Preservation Checking

**Objetivo**: Verificar que para todos os inputs onde a condição de bug NÃO é verdadeira, a função corrigida produz o mesmo resultado que a original.

**Pseudocódigo:**
```
PARA TODO input ONDE NÃO isBugCondition(input) FAÇA
  ASSERT getOpportunitiesByStatus_original(user, status, from, to)
       == getOpportunitiesByStatus_fixed(user, status, from, to, undefined)
FIM PARA
```

**Abordagem de Teste**: Property-based testing é recomendado para preservation checking porque:
- Gera muitos casos de teste automaticamente no domínio de entrada
- Captura edge cases que testes manuais podem perder
- Fornece garantias fortes de que o comportamento é inalterado para inputs sem filtro

**Plano de Teste**: Observar comportamento no código NÃO corrigido para carregamento sem filtros, depois escrever testes property-based capturando esse comportamento.

**Casos de Teste**:
1. **Carregamento padrão preservado**: Verificar que sem filtros, retorna 30 leads por coluna ordenados por `created_at` desc
2. **Filtro SELLER preservado**: Verificar que `vendedor_id` continua sendo aplicado no servidor para usuários SELLER
3. **Paginação sem filtros preservada**: Verificar que "Carregar mais" sem filtros traz a próxima página normalmente
4. **Limpar filtros restaura padrão**: Verificar que ao passar `filters: undefined`, o comportamento é idêntico ao original

### Unit Tests

- Testar `getOpportunitiesByStatus` com cada tipo de filtro individual (searchTerm, sellers, operators, products, sources, dateRange)
- Testar combinações de múltiplos filtros simultâneos
- Testar que `filters: undefined` produz query idêntica à original
- Testar `loadColumn` passando filtros corretamente ao serviço

### Property-Based Tests

- Gerar combinações aleatórias de filtros e verificar que a query Supabase inclui todos os filtros ativos
- Gerar estados aleatórios sem filtros e verificar que o resultado é idêntico ao da função original
- Testar que `count` sempre corresponde ao número real de registros retornados quando todos os dados cabem em uma página

### Integration Tests

- Testar fluxo completo: aplicar filtro → verificar dados carregados → clicar "Carregar mais" → verificar que filtro persiste
- Testar mudança de filtro: aplicar filtro A → mudar para filtro B → verificar reset de paginação e reload
- Testar limpar filtros: aplicar filtros → limpar → verificar que dados voltam ao estado padrão
