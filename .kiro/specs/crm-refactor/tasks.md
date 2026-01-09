# Implementation Plan: CRM Refactor

## Overview

Este plano implementa a refatoração completa do CRM criando uma **arquitetura moderna do zero**. O objetivo é construir um sistema limpo, escalável e com melhor experiência do usuário, substituindo a estrutura atual por componentes modernos e bem organizados.

### Estratégia de Refatoração

- **Recriar**: Nova estrutura de componentes e arquitetura
- **Modernizar**: Design system completo, TypeScript rigoroso
- **Otimizar**: Performance, responsividade, UX
- **Simplificar**: Código limpo e manutenível

## Tasks

- [x] 1. Setup da nova arquitetura e design system
  - Criar nova estrutura de pastas moderna e organizada
  - Implementar design system completo (Button, Card, Input, Select, Toast)
  - Configurar sistema de temas e variáveis CSS modernas
  - Configurar Fast-check para property-based testing
  - Implementar ToastManager para notificações elegantes
  - _Requirements: 1.1, 1.5, 12.1, 12.2, 12.3_

- [x] 1.1 Write property tests for design system components
  - **Property 6: Responsive Layout Adaptation**
  - **Property 7: Loading State Display**
  - **Property 36: Toast Display and Management**
  - **Validates: Requirements 1.2, 1.4, 12.1, 12.2, 12.3, 12.4, 12.5**

- [x] 2. Implementar novo modelo de dados para oportunidades
  - Criar tabela `opportunities` no Supabase
  - Implementar tipos TypeScript para Opportunity e OpportunityStatus
  - Criar serviços para CRUD de oportunidades
  - Implementar sistema de auditoria e logs de atividade
  - Adicionar campo `active_for_distribution` na tabela users
  - Implementar histórico de reatribuições
  - _Requirements: 2.1, 2.8, 7.6, 7.8, 11.2_

- [x] 2.1 Write property tests for opportunity data model
  - **Property 1: Webhook to Opportunity Creation**
  - **Property 5: Loss Tracking Completeness**
  - **Validates: Requirements 2.1, 2.7, 2.8**

- [x] 3. Desenvolver sistema de oportunidades com kanban
  - Implementar OpportunitiesBoard component
  - Criar OpportunityCard component com drag-and-drop
  - Implementar lógica de transição de status (OPORTUNIDADES → EM_CONTATO → NEGOCIAÇÃO)
  - Adicionar validação de valor obrigatório para avançar para NEGOCIAÇÃO
  - _Requirements: 2.2, 2.3, 2.5_

- [x] 3.1 Write property tests for opportunity status transitions
  - **Property 2: Opportunity Status Transitions**
  - **Property 3: Value Validation and Storage**
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

- [x] 4. Implementar conversão de oportunidades para propostas
  - Criar função de conversão de opportunity para lead
  - Implementar transferência de dados entre sistemas
  - Adicionar rastreamento de conversão com timestamps
  - Criar interface para aceitar/rejeitar oportunidades
  - _Requirements: 2.6_

- [x] 4.1 Write property tests for opportunity conversion
  - **Property 4: Opportunity to Proposal Conversion**
  - **Validates: Requirements 2.6**

- [x] 5. Checkpoint - Validar sistema de oportunidades
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Refatorar kanban de propostas existente
  - Migrar KanbanBoard para ProposalsBoard component
  - Implementar melhorias de performance com virtualization
  - Adicionar animações suaves para drag-and-drop
  - Melhorar cards de propostas com informações essenciais
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6.1 Write property tests for proposals kanban
  - **Property 8: Kanban Status Updates**
  - **Property 9: Card Information Display**
  - **Validates: Requirements 3.2, 3.3**

- [x] 7. Implementar sistema de busca e filtros avançados
  - Criar SearchAndFilters component reutilizável
  - Implementar busca instantânea com debounce
  - Adicionar filtros combinados (vendedor, operadora, data, valor)
  - Implementar salvamento de filtros favoritos
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 7.1 Write property tests for search and filters
  - **Property 10: Filter Functionality**
  - **Property 18: Search Result Accuracy**
  - **Validates: Requirements 6.1, 6.2, 3.5**

- [x] 8. Desenvolver dashboard analítico (Admin Only)
  - Criar novo Dashboard component do zero com arquitetura moderna
  - Implementar DashboardLayout com seleção de período
  - Criar MetricCard components para KPIs
  - Implementar InteractiveChart components com drill-down
  - Adicionar métricas completas: oportunidades, propostas, performance da equipe
  - Implementar cálculo de trends e comparações
  - Calcular taxa de conversão baseada em propostas "IMPLANTADA"
  - Implementar redirecionamento de sellers para página de oportunidades
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 8.1 Write property tests for dashboard analytics
  - **Property 11: Dashboard Data Completeness**
  - **Property 12: Data Refresh Without Reload**
  - **Property 13: Trend Calculation Accuracy**
  - **Property 32: Dashboard Access Control**
  - **Property 33: Conversion Rate Calculation**
  - **Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6, 4.7**

- [ ] 9. Checkpoint - Validar funcionalidades principais
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Otimizar formulários de leads
  - Refatorar LeadForm com seções organizadas
  - Implementar validação em tempo real
  - Adicionar indicadores de progresso
  - Melhorar upload de documentos com progress
  - Implementar preservação de dados entre seções
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.1 Write property tests for form optimization
  - **Property 14: Real-time Form Validation**
  - **Property 15: File Upload Validation**
  - **Property 16: Form Data Persistence**
  - **Property 17: Save Operation Feedback**
  - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 11. Aprimorar gestão de usuários
  - Melhorar UserManagement component
  - Adicionar métricas de performance por vendedor
  - Implementar gestão de permissões em tempo real
  - Adicionar logs de atividade de usuários
  - Implementar toggle de ativação/desativação para distribuição de leads
  - Criar funcionalidade de reatribuição de leads/oportunidades para admins
  - Implementar notificações para reatribuições
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 7.8_

- [x] 11.1 Write property tests for user management
  - **Property 19: User Creation and Role Assignment**
  - **Property 20: User Management Completeness**
  - **Property 21: Role-based Access Control**
  - **Property 34: Distribution Toggle Control**
  - **Property 35: Lead Reassignment Tracking**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 7.8**

- [-] 12. Fortalecer sistema de webhooks
  - Refatorar webhook server com melhor validação
  - Implementar sistema de retry com exponential backoff
  - Adicionar logs detalhados de erro
  - Melhorar distribuição round-robin considerando apenas sellers ativos para distribuição
  - Implementar normalização de dados
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [-] 12.1 Write property tests for webhook system
  - **Property 22: Webhook Payload Validation**
  - **Property 23: Error Logging Completeness**
  - **Property 24: Data Transformation Consistency**
  - **Validates: Requirements 8.1, 8.2, 8.4, 8.5**

- [ ] 13. Implementar sistema de notificações
  - Criar Notification model e tabela
  - Implementar NotificationCenter component
  - Adicionar notificações em tempo real via Supabase Realtime
  - Criar sistema de preferências de notificação
  - _Requirements: 10.1, 10.2, 10.5_

- [ ] 13.1 Write property tests for notifications
  - **Property 26: Assignment Notifications**
  - **Property 27: Status Change Notifications**
  - **Property 28: Notification Management**
  - **Validates: Requirements 10.1, 10.2, 10.5**

- [ ] 14. Otimizações de performance
  - Implementar lazy loading para componentes pesados
  - Adicionar caching inteligente com React Query
  - Implementar virtualization para listas grandes
  - Otimizar queries do Supabase com índices
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 14.1 Write property tests for performance optimizations
  - **Property 25: Caching Efficiency**
  - **Validates: Requirements 9.3**

- [ ] 15. Implementar segurança e auditoria
  - Fortalecer autenticação com melhor gestão de sessão
  - Implementar audit logging completo
  - Adicionar controle de acesso baseado em roles
  - Criar relatórios de auditoria para admins
  - _Requirements: 11.1, 11.2, 11.4, 11.5_

- [ ] 15.1 Write property tests for security features
  - **Property 29: Authentication Enforcement**
  - **Property 30: Audit Logging**
  - **Property 31: Permission Consistency**
  - **Validates: Requirements 11.1, 11.2, 11.4, 11.5**

- [ ] 16. Integração e testes finais
  - Executar todos os testes de integração
  - Validar fluxo completo: webhook → oportunidade → proposta
  - Testar performance com dados de produção
  - Validar responsividade em diferentes dispositivos
  - _Requirements: 1.2, 2.1, 2.6_

- [ ] 16.1 Write integration tests
  - Test complete flow from webhook to proposal conversion
  - Test multi-user scenarios and concurrent operations
  - _Requirements: 2.1, 2.6, 3.2_

- [ ] 17. Final checkpoint - Sistema completo
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility during migration