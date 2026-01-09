# Design Document: CRM Refactor

## Overview

Esta refatoração modernizará completamente o sistema CRM Sette SAS, implementando um fluxo de trabalho em duas etapas: **Oportunidades** (leads iniciais) e **Propostas** (leads qualificados). O sistema manterá a arquitetura atual baseada em React + TypeScript + Supabase, mas com interface completamente redesenhada, performance otimizada e novos recursos de produtividade.

### Key Design Principles

1. **Mobile-First Design**: Interface responsiva que funciona perfeitamente em todos os dispositivos
2. **Performance-Oriented**: Lazy loading, virtualization e caching para experiência fluida
3. **User-Centric UX**: Fluxos intuitivos que reduzem cliques e aceleram tarefas
4. **Real-time Updates**: Sincronização instantânea entre usuários
5. **Scalable Architecture**: Estrutura preparada para crescimento futuro

## Architecture

### Frontend Architecture

```
src/
├── components/
│   ├── ui/                    # Design system components
│   ├── layout/               # Layout components
│   ├── opportunities/        # Opportunities kanban
│   ├── proposals/           # Proposals kanban  
│   ├── dashboard/           # Analytics dashboard
│   ├── forms/               # Form components
│   └── shared/              # Shared components
├── hooks/                   # Custom React hooks
├── services/               # API services
├── stores/                 # State management
├── utils/                  # Utility functions
└── types/                  # TypeScript definitions
```

### Backend Architecture

O backend continuará usando Supabase com as seguintes melhorias:

- **Database**: PostgreSQL com novas tabelas para oportunidades e auditoria
- **Authentication**: Supabase Auth com melhor gestão de sessões
- **Storage**: Supabase Storage para documentos com CDN
- **Real-time**: Supabase Realtime para notificações instantâneas
- **Edge Functions**: Para processamento de webhooks e notificações

## Components and Interfaces

### 1. Design System (UI Components)

**Button Component**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}
```

**Card Component**
```typescript
interface CardProps {
  variant: 'default' | 'elevated' | 'outlined'
  padding: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  children: React.ReactNode
}
```

**Toast Component**
```typescript
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
}

interface ToastManager {
  show: (toast: Omit<ToastProps, 'onDismiss'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}
```
**Input Components**
```typescript
interface InputProps {
  label?: string
  error?: string
  helper?: string
  required?: boolean
  loading?: boolean
}

interface SelectProps extends InputProps {
  options: Array<{value: string, label: string}>
  searchable?: boolean
  multiple?: boolean
}
```

### 2. Opportunities Kanban

**OpportunitiesBoard Component**
```typescript
interface OpportunitiesBoard {
  opportunities: Opportunity[]
  onMoveOpportunity: (id: number, status: OpportunityStatus) => void
  onOpenOpportunity: (opportunity: Opportunity) => void
  filters: OpportunityFilters
  onFiltersChange: (filters: OpportunityFilters) => void
}

interface OpportunityCard {
  opportunity: Opportunity
  onMove: (status: OpportunityStatus) => void
  onClick: () => void
  draggable: boolean
}
```

**Opportunity Status Flow**
- **OPORTUNIDADES**: Leads recém-chegados via webhook
- **EM_CONTATO**: Seller fez primeiro contato, pode preencher dados
- **NEGOCIAÇÃO**: Valor foi apresentado, aguarda decisão do cliente

### 3. Proposals Kanban

**ProposalsBoard Component** (evolução do atual KanbanBoard)
```typescript
interface ProposalsBoard {
  proposals: Lead[]
  onMoveProposal: (id: number, status: KanbanStatus) => void
  onOpenProposal: (proposal: Lead) => void
  filters: ProposalFilters
  onFiltersChange: (filters: ProposalFilters) => void
}
```

### 4. Enhanced Dashboard

**DashboardLayout Component**
```typescript
interface DashboardLayout {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  children: React.ReactNode
}

interface MetricCard {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon: React.ReactNode
  color: string
}

interface InteractiveChart {
  data: ChartData[]
  type: 'bar' | 'line' | 'pie' | 'area'
  onDataPointClick?: (data: ChartData) => void
  loading?: boolean
}
```

### 5. Advanced Search and Filters

**SearchAndFilters Component**
```typescript
interface SearchAndFilters {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  savedFilters: SavedFilter[]
  onSaveFilter: (name: string, filters: FilterState) => void
}

interface FilterState {
  sellers?: string[]
  operators?: string[]
  dateRange?: DateRange
  status?: string[]
  source?: string[]
  valueRange?: {min: number, max: number}
}
```

### 6. Optimized Forms

**OpportunityForm Component**
```typescript
interface OpportunityForm {
  opportunity: Opportunity
  onSave: (data: Partial<Opportunity>) => void
  onCancel: () => void
  mode: 'view' | 'edit'
  requiredFields: string[]
}

interface ProposalForm {
  proposal: Lead
  onSave: (data: Partial<Lead>) => void
  onCancel: () => void
  sections: FormSection[]
  validationRules: ValidationRules
}
```

## Data Models

### Enhanced Opportunity Model

```typescript
interface Opportunity {
  id: number
  
  // Basic Info
  nome: string
  email: string
  telefone: string
  
  // Status and Flow
  status: OpportunityStatus
  created_at: string
  updated_at: string
  
  // Contact and Value
  first_contact_date?: string
  quoted_value?: number
  quoted_at?: string
  
  // Assignment
  vendedor: string
  vendedor_email: string
  vendedor_id: number
  
  // Source and Raw Data
  origem: string
  raw_json?: any
  
  // Loss Tracking
  lost_at?: string
  loss_reason?: LossReason
  loss_description?: string
  
  // Conversion
  converted_to_proposal_at?: string
  proposal_id?: number
}

type OpportunityStatus = 'OPORTUNIDADES' | 'EM_CONTATO' | 'NEGOCIAÇÃO'

interface LossReason {
  category: 'PREÇO' | 'CONCORRÊNCIA' | 'TIMING' | 'NECESSIDADE' | 'OUTROS'
  description?: string
}
```

### Enhanced User Model

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  
  // New fields for distribution control
  active_for_distribution: boolean; // Toggle for webhook lead distribution
  last_lead_assigned_at?: string;
  total_leads_assigned: number;
  
  // Activity tracking
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}
```

```typescript
interface Lead {
  // ... existing fields ...
  
  // New fields for tracking
  converted_from_opportunity_id?: number
  conversion_date?: string
  
  // Enhanced tracking
  last_activity_at: string
  activity_log: ActivityLog[]
  
  // Reassignment tracking
  assignment_history: AssignmentHistory[]
}

interface AssignmentHistory {
  id: string
  previous_seller_id?: number
  new_seller_id: number
  assigned_by_user_id: number
  assigned_by_name: string
  reason?: string
  created_at: string
}

interface ActivityLog {
  id: string
  type: 'STATUS_CHANGE' | 'DOCUMENT_UPLOAD' | 'NOTE_ADDED' | 'VALUE_UPDATED' | 'REASSIGNMENT'
  description: string
  user_id: number
  user_name: string
  created_at: string
  metadata?: any
}
```

### Notification Model

```typescript
interface Notification {
  id: string
  user_id: number
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  created_at: string
}

type NotificationType = 
  | 'NEW_OPPORTUNITY'
  | 'OPPORTUNITY_ASSIGNED'
  | 'PROPOSAL_STATUS_CHANGED'
  | 'DOCUMENT_UPLOADED'
  | 'DEADLINE_APPROACHING'
  | 'SYSTEM_MAINTENANCE'
```

### Analytics Model

```typescript
interface DashboardMetrics {
  opportunities: {
    total: number
    byStatus: Record<OpportunityStatus, number>
    conversionRate: number
    averageTimeToContact: number
    averageTimeToQuote: number
  }
  proposals: {
    total: number
    byStatus: Record<KanbanStatus, number>
    conversionRate: number
    averageValue: number
  }
  sellers: {
    performance: SellerPerformance[]
    leaderboard: SellerRanking[]
  }
  trends: {
    opportunitiesOverTime: TimeSeriesData[]
    proposalsOverTime: TimeSeriesData[]
    conversionRates: TimeSeriesData[]
  }
}

interface SellerPerformance {
  seller_id: number
  seller_name: string
  opportunities_assigned: number
  opportunities_contacted: number
  opportunities_quoted: number
  opportunities_converted: number
  proposals_won: number
  total_value: number
  conversion_rate: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Agora vou analisar os critérios de aceitação para determinar quais são testáveis como propriedades:

<function_calls>
<invoke name="prework">
<parameter name="featureName">crm-refactor

Baseado na análise dos critérios de aceitação, identifiquei as seguintes propriedades testáveis:

### Core Business Logic Properties

**Property 1: Webhook to Opportunity Creation**
*For any* valid webhook payload, the system should create an opportunity with status "OPORTUNIDADES" and assign it to a seller using round-robin distribution
**Validates: Requirements 2.1, 8.3**

**Property 2: Opportunity Status Transitions**
*For any* opportunity in "OPORTUNIDADES" status, it should be possible to move it to "EM_CONTATO", and from "EM_CONTATO" to "NEGOCIAÇÃO" only if a quoted value is provided
**Validates: Requirements 2.2, 2.3, 2.5**

**Property 3: Value Validation and Storage**
*For any* quoted value input, valid values should be stored with timestamps and invalid values should be rejected with appropriate error messages
**Validates: Requirements 2.4**

**Property 4: Opportunity to Proposal Conversion**
*For any* opportunity accepted in "NEGOCIAÇÃO", it should create a corresponding proposal with all data properly transferred
**Validates: Requirements 2.6**

**Property 5: Loss Tracking Completeness**
*For any* opportunity marked as lost, the system should require a loss reason category and store all tracking information (reason, description, timestamp, seller)
**Validates: Requirements 2.7, 2.8**

### User Interface Properties

**Property 6: Responsive Layout Adaptation**
*For any* screen size, the system should adapt the layout to maintain usability and accessibility of key functions
**Validates: Requirements 1.2**

**Property 7: Loading State Display**
*For any* data loading operation, the system should display appropriate loading states or skeleton screens until content is ready
**Validates: Requirements 1.4**

**Property 8: Kanban Status Updates**
*For any* proposal status change, the kanban board should immediately reflect the new status in the UI
**Validates: Requirements 3.2**

**Property 9: Card Information Display**
*For any* proposal card displayed, it should contain all essential information fields required for quick assessment
**Validates: Requirements 3.3**

**Property 10: Filter Functionality**
*For any* filter criteria applied, the system should show only items matching all active filters in real-time
**Validates: Requirements 3.5, 6.2**

### Dashboard and Analytics Properties

**Property 11: Dashboard Data Completeness**
*For any* dashboard view, all required KPIs and charts should be calculated and displayed with current data
**Validates: Requirements 4.1, 4.2**

**Property 12: Data Refresh Without Reload**
*For any* dashboard update, data should refresh automatically without requiring full page reload
**Validates: Requirements 4.4**

**Property 13: Trend Calculation Accuracy**
*For any* metric with trend data, calculations should be mathematically correct when compared to previous periods
**Validates: Requirements 4.5**

### Form and Validation Properties

**Property 14: Real-time Form Validation**
*For any* invalid input in forms, the system should display appropriate error messages immediately
**Validates: Requirements 5.2**

**Property 15: File Upload Validation**
*For any* file upload attempt, supported file types should be accepted and unsupported types should be rejected with clear messages
**Validates: Requirements 5.3**

**Property 16: Form Data Persistence**
*For any* navigation between form sections, previously entered data should be preserved
**Validates: Requirements 5.5**

**Property 17: Save Operation Feedback**
*For any* form save operation, the system should provide immediate feedback and update relevant status
**Validates: Requirements 5.4**

### Search Properties

**Property 18: Search Result Accuracy**
*For any* search term, results should include all items containing the search term in names, emails, or IDs
**Validates: Requirements 6.1**

### User Management Properties

**Property 19: User Creation and Role Assignment**
*For any* new user creation, the system should validate required data and assign the correct role with appropriate permissions
**Validates: Requirements 7.1**

**Property 20: User Management Completeness**
*For any* user listing or permission update, the system should display complete information and apply changes immediately
**Validates: Requirements 7.2, 7.3**

**Property 21: Role-based Access Control**
*For any* user role change, access permissions should be updated consistently across all system components
**Validates: Requirements 7.5**

### Webhook and Integration Properties

**Property 22: Webhook Payload Validation**
*For any* webhook request, valid payloads should be accepted and invalid payloads should be rejected with appropriate HTTP status codes
**Validates: Requirements 8.1, 8.5**

**Property 23: Error Logging Completeness**
*For any* webhook processing failure, detailed error information should be logged with appropriate context
**Validates: Requirements 8.2**

**Property 24: Data Transformation Consistency**
*For any* webhook data processed, it should be properly normalized and transformed before database storage
**Validates: Requirements 8.4**

### Performance Properties

**Property 25: Caching Efficiency**
*For any* repeated request, the system should use cached data when appropriate to minimize unnecessary API calls
**Validates: Requirements 9.3**

### Notification Properties

**Property 26: Assignment Notifications**
*For any* new opportunity assignment, the assigned seller should receive an appropriate notification
**Validates: Requirements 10.1**

**Property 27: Status Change Notifications**
*For any* status change, relevant users should receive real-time notifications
**Validates: Requirements 10.2**

**Property 28: Notification Management**
*For any* notification displayed, users should be able to mark it as read and manage preferences
**Validates: Requirements 10.5**

### Security Properties

**Property 29: Authentication Enforcement**
*For any* system access attempt, unauthenticated requests should be rejected with appropriate responses
**Validates: Requirements 11.1**

**Property 30: Audit Logging**
*For any* sensitive operation, comprehensive audit log entries should be created with user identification and timestamps
**Validates: Requirements 11.2, 11.5**

**Property 31: Permission Consistency**
*For any* permission check, role-based access control should be enforced consistently across all endpoints
**Validates: Requirements 11.4**

### Admin-Only Access Properties

**Property 32: Dashboard Access Control**
*For any* seller attempting to access the dashboard, the system should redirect them to the opportunities page
**Validates: Requirements 4.7**

**Property 33: Conversion Rate Calculation**
*For any* conversion rate calculation, the system should use only proposals that reach "IMPLANTADA" status as successful conversions
**Validates: Requirements 4.6**

### User Management Properties

**Property 34: Distribution Toggle Control**
*For any* seller with distribution toggle disabled, the round-robin system should skip them and distribute leads only to active sellers
**Validates: Requirements 7.6, 7.7, 8.6**

**Property 35: Lead Reassignment Tracking**
*For any* admin reassignment of leads or opportunities, the system should update assignments and create complete audit trails with notifications
**Validates: Requirements 7.8**

### Toast Notification Properties

**Property 36: Toast Display and Management**
*For any* system operation (success or error), elegant toast notifications should be displayed instead of browser alerts with proper positioning and auto-dismiss
**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

## Error Handling

### Client-Side Error Handling

1. **Network Errors**: Retry mechanisms with exponential backoff
2. **Validation Errors**: Real-time feedback with clear messaging
3. **Authentication Errors**: Automatic redirect to login with session recovery
4. **Permission Errors**: Clear messaging with suggested actions
5. **File Upload Errors**: Progress indication with error recovery options

### Server-Side Error Handling

1. **Webhook Failures**: Detailed logging with retry queues
2. **Database Errors**: Transaction rollback with error reporting
3. **Authentication Failures**: Secure logging without sensitive data
4. **Rate Limiting**: Graceful degradation with user feedback
5. **Data Validation**: Comprehensive validation with detailed error responses

### Error Recovery Strategies

1. **Optimistic UI Updates**: Rollback on failure with user notification
2. **Offline Support**: Queue operations for when connection is restored
3. **Data Consistency**: Conflict resolution for concurrent updates
4. **Graceful Degradation**: Core functionality remains available during partial failures

## Testing Strategy

### Dual Testing Approach

The system will use both **unit testing** and **property-based testing** to ensure comprehensive coverage:

**Unit Tests** will focus on:
- Specific examples and edge cases
- Integration points between components
- Error conditions and boundary cases
- UI component behavior with known inputs

**Property-Based Tests** will focus on:
- Universal properties that hold for all inputs
- Business logic correctness across random data
- Data transformation and validation rules
- System behavior under various conditions

### Property-Based Testing Configuration

- **Testing Library**: Fast-check for TypeScript/JavaScript
- **Test Iterations**: Minimum 100 iterations per property test
- **Test Tagging**: Each property test tagged with: **Feature: crm-refactor, Property {number}: {property_text}**
- **Data Generators**: Smart generators that create realistic test data within valid domains

### Testing Coverage Requirements

1. **Business Logic**: All opportunity and proposal state transitions
2. **Data Validation**: All form inputs and webhook payloads
3. **User Permissions**: All role-based access scenarios
4. **UI Components**: All interactive elements and responsive behavior
5. **Integration Points**: All API endpoints and database operations

### Performance Testing

1. **Load Testing**: Kanban boards with 1000+ items
2. **Stress Testing**: Concurrent user operations
3. **Memory Testing**: Long-running sessions with memory leak detection
4. **Network Testing**: Slow connections and intermittent connectivity

The testing strategy ensures that both specific scenarios (unit tests) and general correctness properties (property tests) are validated, providing confidence in system reliability and correctness.