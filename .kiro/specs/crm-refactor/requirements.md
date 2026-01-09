# Requirements Document

## Introduction

Refatoração completa do sistema CRM Sette SAS para modernizar a interface, melhorar a experiência do usuário e otimizar o desempenho. O sistema atual funciona como um CRM para corretora de seguros de saúde, gerenciando leads recebidos via webhook e permitindo acompanhamento através de um kanban board.

## Glossary

- **CRM_System**: Sistema de gerenciamento de relacionamento com clientes
- **Lead**: Potencial cliente interessado em seguro de saúde
- **Webhook_Server**: Servidor que recebe dados de leads externos via HTTP
- **Kanban_Board**: Interface visual para gerenciar status das propostas
- **Supabase_Backend**: Plataforma backend que fornece banco de dados, autenticação e storage
- **Admin_User**: Usuário com permissões administrativas completas
- **Seller_User**: Usuário vendedor com acesso limitado aos próprios leads
- **Lead_Status**: Estado atual da proposta (ENVIADA, ANÁLISE, IMPLANTADA, CANCELADA)
- **Opportunity_Status**: Estado da oportunidade (OPORTUNIDADES, EM_CONTATO, NEGOCIAÇÃO)
- **Round_Robin**: Sistema de distribuição automática e equilibrada de leads entre vendedores ativos
- **Opportunity**: Lead inicial recebido via webhook antes de se tornar uma proposta formal
- **Lead_Value**: Valor monetário apresentado ao cliente durante negociação
- **Loss_Reason**: Motivo categorizado da perda de uma oportunidade
- **Active_Seller**: Vendedor ativo no sistema que pode receber leads via distribuição automática
- **Lead_Reassignment**: Capacidade do admin de alterar a atribuição de leads/oportunidades

## Requirements

### Requirement 1: Interface Moderna e Responsiva

**User Story:** Como usuário do sistema, quero uma interface moderna e responsiva, para que eu possa trabalhar eficientemente em qualquer dispositivo.

#### Acceptance Criteria

1. WHEN a user accesses the system on desktop, THE CRM_System SHALL display a clean, modern interface with proper spacing and typography
2. WHEN a user accesses the system on mobile devices, THE CRM_System SHALL adapt the layout to provide optimal usability
3. WHEN a user interacts with UI elements, THE CRM_System SHALL provide smooth animations and visual feedback
4. WHEN the system loads, THE CRM_System SHALL display loading states and skeleton screens for better perceived performance
5. THE CRM_System SHALL use a consistent design system with modern colors, shadows, and component styling

### Requirement 2: Sistema de Oportunidades com Kanban

**User Story:** Como vendedor, quero gerenciar oportunidades através de um kanban dedicado, para que eu possa acompanhar o progresso desde o primeiro contato até a conversão em proposta.

#### Acceptance Criteria

1. WHEN a new lead arrives via webhook, THE CRM_System SHALL create an opportunity in the "OPORTUNIDADES" column
2. WHEN a seller makes contact with a lead, THE CRM_System SHALL allow moving the opportunity to "EM_CONTATO" status
3. WHEN an opportunity is in "EM_CONTATO", THE CRM_System SHALL require the seller to input the quoted value before advancing
4. WHEN a seller inputs a quoted value, THE CRM_System SHALL validate and store the Lead_Value with timestamp
5. WHEN an opportunity advances to "NEGOCIAÇÃO", THE CRM_System SHALL only allow this transition if Lead_Value is provided
6. WHEN an opportunity is accepted in "NEGOCIAÇÃO", THE CRM_System SHALL convert it to a formal proposal in the proposals kanban
7. WHEN an opportunity is lost at any stage, THE CRM_System SHALL require selection of Loss_Reason category and optional text description
8. WHEN loss information is recorded, THE CRM_System SHALL store the Loss_Reason, description, timestamp, and responsible seller

### Requirement 3: Kanban Board Aprimorado para Propostas

**User Story:** Como vendedor, quero um kanban board mais intuitivo e funcional para propostas, para que eu possa gerenciar propostas formais de forma mais eficiente.

#### Acceptance Criteria

1. WHEN a user drags a proposal card, THE Kanban_Board SHALL provide visual feedback and smooth drag-and-drop interaction
2. WHEN a proposal is moved between columns, THE Kanban_Board SHALL update the status immediately with optimistic UI updates
3. WHEN a user views the proposals kanban, THE Kanban_Board SHALL display proposal cards with essential information clearly visible
4. WHEN there are many proposals, THE Kanban_Board SHALL provide efficient scrolling and virtualization for performance
5. WHEN a user filters proposals, THE Kanban_Board SHALL update in real-time showing only matching results

### Requirement 4: Dashboard Analítico (Admin Only)

**User Story:** Como administrador, quero um dashboard com análises detalhadas, para que eu possa tomar decisões baseadas em dados e monitorar a performance da equipe.

#### Acceptance Criteria

1. WHEN an admin views the dashboard, THE CRM_System SHALL display comprehensive analytics with team performance, conversion rates, and system-wide metrics
2. WHEN dashboard data is loaded, THE CRM_System SHALL show interactive charts for conversion rates, lead sources, and seller performance
3. WHEN a user interacts with charts, THE CRM_System SHALL provide drill-down capabilities and detailed tooltips
4. WHEN the dashboard updates, THE CRM_System SHALL refresh data automatically without full page reload
5. WHEN displaying metrics, THE CRM_System SHALL calculate and show trends compared to previous periods
6. WHEN calculating conversion rates, THE CRM_System SHALL use proposals that reach "IMPLANTADA" status as successful conversions
7. WHEN a seller tries to access the dashboard, THE CRM_System SHALL redirect them to the opportunities page

### Requirement 5: Formulário de Lead Otimizado

**User Story:** Como vendedor, quero um formulário de lead mais intuitivo e eficiente, para que eu possa atualizar informações dos clientes rapidamente.

#### Acceptance Criteria

1. WHEN a user opens a lead form, THE CRM_System SHALL display fields organized in logical sections with clear labels
2. WHEN a user enters data, THE CRM_System SHALL provide real-time validation and helpful error messages
3. WHEN a user uploads documents, THE CRM_System SHALL show upload progress and handle multiple file types
4. WHEN form data is saved, THE CRM_System SHALL provide immediate feedback and update the lead status
5. WHEN a user navigates between form sections, THE CRM_System SHALL preserve entered data and show progress indicators

### Requirement 6: Sistema de Busca e Filtros Avançados

**User Story:** Como usuário, quero ferramentas de busca e filtros mais poderosas, para que eu possa encontrar leads específicos rapidamente.

#### Acceptance Criteria

1. WHEN a user types in the search field, THE CRM_System SHALL provide instant search results across lead names, emails, and IDs
2. WHEN a user applies filters, THE CRM_System SHALL combine multiple filter criteria and update results in real-time
3. WHEN search results are displayed, THE CRM_System SHALL highlight matching terms and provide relevant sorting options
4. WHEN no results are found, THE CRM_System SHALL suggest alternative search terms or show helpful messages
5. WHEN filters are active, THE CRM_System SHALL clearly indicate which filters are applied with easy removal options

### Requirement 7: Gestão de Usuários Aprimorada

**User Story:** Como administrador, quero ferramentas de gestão de usuários mais completas, para que eu possa gerenciar a equipe eficientemente.

#### Acceptance Criteria

1. WHEN an admin creates a new user, THE CRM_System SHALL validate user data and create accounts with proper role assignments
2. WHEN an admin views user list, THE CRM_System SHALL display user information with activity status and performance metrics
3. WHEN an admin updates user permissions, THE CRM_System SHALL apply changes immediately and notify affected users
4. WHEN an admin resets passwords, THE CRM_System SHALL generate secure passwords and provide secure delivery methods
5. WHEN user roles are changed, THE CRM_System SHALL update access permissions across all system components
6. WHEN an admin toggles a seller's distribution status, THE CRM_System SHALL include/exclude them from automatic lead distribution
7. WHEN a seller is deactivated from distribution, THE CRM_System SHALL maintain their system access but stop assigning new leads
8. WHEN an admin reassigns a lead or opportunity, THE CRM_System SHALL update the assignment and notify both old and new assignees

### Requirement 8: Webhook e Integração Robusta

**User Story:** Como administrador do sistema, quero um sistema de webhook mais robusto e confiável, para que leads externos sejam processados sem falhas.

#### Acceptance Criteria

1. WHEN a webhook receives lead data, THE Webhook_Server SHALL validate the payload format and required fields
2. WHEN webhook processing fails, THE Webhook_Server SHALL log errors with detailed information and retry mechanisms
3. WHEN leads are distributed, THE Round_Robin SHALL ensure fair distribution among sellers marked as active for distribution
4. WHEN webhook data is processed, THE Webhook_Server SHALL transform and normalize data before database insertion
5. WHEN webhook endpoints are called, THE Webhook_Server SHALL respond with appropriate HTTP status codes and error details
6. WHEN a seller is deactivated from distribution, THE Round_Robin SHALL skip them and distribute only to active sellers

### Requirement 9: Performance e Otimização

**User Story:** Como usuário do sistema, quero que o sistema seja rápido e responsivo, para que eu possa trabalhar sem delays ou travamentos.

#### Acceptance Criteria

1. WHEN the application loads, THE CRM_System SHALL display the main interface within 2 seconds on standard connections
2. WHEN large datasets are loaded, THE CRM_System SHALL implement pagination or virtualization to maintain performance
3. WHEN users navigate between pages, THE CRM_System SHALL use efficient caching and minimize unnecessary API calls
4. WHEN images or documents are loaded, THE CRM_System SHALL implement lazy loading and optimize file sizes
5. WHEN database queries are executed, THE CRM_System SHALL use optimized queries with proper indexing

### Requirement 10: Notificações e Comunicação

**User Story:** Como vendedor, quero receber notificações sobre novos leads e atualizações importantes, para que eu possa responder rapidamente.

#### Acceptance Criteria

1. WHEN a new lead is assigned, THE CRM_System SHALL notify the assigned seller through in-app notifications
2. WHEN lead status changes, THE CRM_System SHALL update relevant users with real-time notifications
3. WHEN important deadlines approach, THE CRM_System SHALL send proactive reminders to responsible users
4. WHEN system maintenance occurs, THE CRM_System SHALL notify all users with appropriate advance notice
5. WHEN notifications are displayed, THE CRM_System SHALL allow users to mark as read and manage notification preferences

### Requirement 12: Sistema de Notificações Modernas

**User Story:** Como usuário do sistema, quero receber feedback visual elegante sobre minhas ações, para que eu tenha uma experiência mais profissional e agradável.

#### Acceptance Criteria

1. WHEN any system operation completes successfully, THE CRM_System SHALL display elegant toast notifications instead of browser alerts
2. WHEN errors occur, THE CRM_System SHALL show styled error notifications with clear messaging and action suggestions
3. WHEN notifications are displayed, THE CRM_System SHALL position them appropriately and auto-dismiss after appropriate time
4. WHEN multiple notifications occur, THE CRM_System SHALL stack them elegantly without overlapping
5. WHEN users interact with notifications, THE CRM_System SHALL allow manual dismissal and provide relevant actions

### Requirement 13: Segurança e Auditoria

**User Story:** Como administrador, quero garantir que o sistema seja seguro e auditável, para que possamos manter conformidade e rastrear atividades.

#### Acceptance Criteria

1. WHEN users access the system, THE CRM_System SHALL enforce strong authentication with session management
2. WHEN sensitive operations are performed, THE CRM_System SHALL log all activities with user identification and timestamps
3. WHEN data is transmitted, THE CRM_System SHALL use HTTPS encryption for all communications
4. WHEN user permissions are checked, THE CRM_System SHALL enforce role-based access control consistently
5. WHEN audit logs are generated, THE CRM_System SHALL store comprehensive activity records for compliance purposes