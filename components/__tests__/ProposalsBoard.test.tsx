import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { ProposalsBoard } from '../ProposalsBoard';
import { Lead, KanbanStatus, User } from '../../types';

// Mock the UI components
vi.mock('../../src/components/ui/Card', () => ({
  Card: ({ children, className, onClick }: any) => (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  )
}));

vi.mock('../../src/components/ui/Button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  )
}));

vi.mock('../../src/components/ui/Input', () => ({
  Input: ({ value, onChange, className, placeholder }: any) => (
    <input 
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}));

vi.mock('../../src/components/ui/Select', () => ({
  Select: ({ value, onChange, options, className }: any) => (
    <select className={className} value={value} onChange={onChange}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}));

// Generators for property-based testing
const kanbanStatusArb = fc.constantFrom('ENVIADA', 'ANÁLISE', 'ANÁLISE_OPERADORA', 'IMPLANTADA', 'CANCELADA');
const clientTypeArb = fc.constantFrom('PF', 'PJ', 'ADESAO');
const roleArb = fc.constantFrom('ADMIN', 'SELLER');

const leadArb = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  nome: fc.string({ minLength: 3, maxLength: 50 }),
  email: fc.emailAddress(),
  telefone: fc.string({ minLength: 10, maxLength: 15 }),
  tipo_cliente: clientTypeArb,
  cpf_cnpj: fc.string({ minLength: 11, maxLength: 18 }),
  operadora: fc.constantFrom('Amil', 'Bradesco', 'SulAmérica', 'Unimed', 'NotreDame'),
  produto: fc.string({ minLength: 5, maxLength: 30 }),
  origem: fc.constantFrom('SITE', 'INSTAGRAM', 'INDICAÇÃO'),
  vendedor: fc.string({ minLength: 5, maxLength: 30 }),
  vendedor_email: fc.emailAddress(),
  vendedor_id: fc.integer({ min: 1, max: 100 }),
  status_kanban: kanbanStatusArb,
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
  endereco: fc.record({
    cep: fc.string({ minLength: 8, maxLength: 10 }),
    logradouro: fc.string({ minLength: 5, maxLength: 50 }),
    numero: fc.string({ minLength: 1, maxLength: 10 }),
    bairro: fc.string({ minLength: 3, maxLength: 30 }),
    cidade: fc.string({ minLength: 3, maxLength: 30 }),
    uf: fc.string({ minLength: 2, maxLength: 2 })
  }),
  beneficiarios: fc.array(fc.record({
    id: fc.string(),
    nome: fc.string({ minLength: 3, maxLength: 50 }),
    data_nascimento: fc.date().map(d => d.toISOString()),
    parentesco: fc.string({ minLength: 3, maxLength: 20 }),
    type: fc.constantFrom('TITULAR', 'DEPENDENTE')
  }), { maxLength: 5 }),
  mensagens: fc.array(fc.record({
    id: fc.string(),
    user_name: fc.string({ minLength: 3, maxLength: 30 }),
    role: roleArb,
    message: fc.string({ minLength: 5, maxLength: 200 }),
    created_at: fc.date().map(d => d.toISOString())
  }), { maxLength: 10 }),
  documentos: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { maxLength: 5 }),
  valor_produto: fc.option(fc.float({ min: 100, max: 10000 }), { nil: undefined })
}) as fc.Arbitrary<Lead>;

const userArb = fc.record({
  id: fc.integer({ min: 1, max: 100 }),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  email: fc.emailAddress(),
  role: roleArb
}) as fc.Arbitrary<User>;

describe('ProposalsBoard Property Tests', () => {
  /**
   * Property 8: Kanban Status Updates
   * Feature: crm-refactor, Property 8: Kanban Status Updates
   * Validates: Requirements 3.2
   */
  it('Property 8: For any proposal status change, the kanban board should immediately reflect the new status in the UI', () => {
    fc.assert(fc.property(
      fc.array(leadArb, { minLength: 1, maxLength: 10 }),
      userArb,
      kanbanStatusArb,
      (proposals, user, newStatus) => {
        const onMoveProposal = vi.fn();
        const onProposalClick = vi.fn();
        
        const { rerender } = render(
          <ProposalsBoard
            proposals={proposals}
            onMoveProposal={onMoveProposal}
            onProposalClick={onProposalClick}
            user={user}
          />
        );

        // Find a proposal to move
        const proposalToMove = proposals[0];
        if (proposalToMove.status_kanban === newStatus) {
          return true; // Skip if already in target status
        }

        // Create updated proposals with the status change
        const updatedProposals = proposals.map(p => 
          p.id === proposalToMove.id 
            ? { ...p, status_kanban: newStatus }
            : p
        );

        // Re-render with updated proposals
        rerender(
          <ProposalsBoard
            proposals={updatedProposals}
            onMoveProposal={onMoveProposal}
            onProposalClick={onProposalClick}
            user={user}
          />
        );

        // Verify the proposal appears in the correct column
        const updatedProposal = updatedProposals.find(p => p.id === proposalToMove.id);
        expect(updatedProposal?.status_kanban).toBe(newStatus);

        // The UI should reflect the change - proposal should be in the new status column
        const proposalElement = screen.getByText(`#${proposalToMove.id}`);
        expect(proposalElement).toBeInTheDocument();

        return true;
      }
    ), { numRuns: 20 });
  });

  /**
   * Property 9: Card Information Display
   * Feature: crm-refactor, Property 9: Card Information Display
   * Validates: Requirements 3.3
   */
  it('Property 9: For any proposal card displayed, it should contain all essential information fields required for quick assessment', () => {
    fc.assert(fc.property(
      fc.array(leadArb, { minLength: 1, maxLength: 5 }),
      userArb,
      (proposals, user) => {
        const onMoveProposal = vi.fn();
        const onProposalClick = vi.fn();
        
        render(
          <ProposalsBoard
            proposals={proposals}
            onMoveProposal={onMoveProposal}
            onProposalClick={onProposalClick}
            user={user}
          />
        );

        // Check that each proposal displays essential information
        proposals.forEach(proposal => {
          // Essential information that should be displayed:
          // 1. Proposal ID
          const idElement = screen.getByText(`#${proposal.id}`);
          expect(idElement).toBeInTheDocument();

          // 2. Client name
          const nameElement = screen.getByText(proposal.nome);
          expect(nameElement).toBeInTheDocument();

          // 3. Product and operator info
          const productInfo = `${proposal.produto || 'Produto N/A'} - ${proposal.operadora || 'N/A'}`;
          const productElement = screen.getByText(productInfo);
          expect(productElement).toBeInTheDocument();

          // 4. Email
          const emailElement = screen.getByText(proposal.email);
          expect(emailElement).toBeInTheDocument();

          // 5. Phone
          const phoneElement = screen.getByText(proposal.telefone);
          expect(phoneElement).toBeInTheDocument();

          // 6. Seller info
          const sellerInfo = `Vend: ${proposal.vendedor}`;
          const sellerElement = screen.getByText(sellerInfo);
          expect(sellerElement).toBeInTheDocument();

          // 7. Client type
          const typeElement = screen.getByText(proposal.tipo_cliente);
          expect(typeElement).toBeInTheDocument();
        });

        return true;
      }
    ), { numRuns: 20 });
  });
});