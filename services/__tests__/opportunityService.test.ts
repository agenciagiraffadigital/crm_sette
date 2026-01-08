import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { opportunityService } from '../opportunityService';
import { supabase } from '../supabaseClient';
import { Opportunity, OpportunityStatus, User, LossReason } from '../../types';

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

describe('Opportunity Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Property-based tests
  describe('Property Tests', () => {
    /**
     * Feature: crm-refactor, Property 1: Webhook to Opportunity Creation
     * Validates: Requirements 2.1
     */
    it('should create opportunities with correct initial status and seller assignment for any valid webhook payload', () => {
      fc.assert(
        fc.property(
          fc.record({
            nome: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            email: fc.emailAddress(),
            telefone: fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s)),
            origem: fc.constantFrom('MAKE', 'SITE', 'WEBHOOK', 'MANUAL'),
            vendedor_id: fc.integer({ min: 1, max: 1000 }),
            vendedor: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            vendedor_email: fc.emailAddress(),
            raw_json: fc.object()
          }),
          async (webhookData) => {
            // Mock successful database insertion
            const mockOpportunity = {
              id: 1,
              ...webhookData,
              status: 'OPORTUNIDADES' as OpportunityStatus,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              first_contact_date: null,
              quoted_value: null,
              quoted_at: null,
              lost_at: null,
              loss_reason: null,
              loss_description: null,
              converted_to_proposal_at: null,
              proposal_id: null,
            };

            const mockSupabaseChain = {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockOpportunity, error: null })
              }))
            };

            (supabase.from as any).mockReturnValue({
              insert: vi.fn(() => mockSupabaseChain)
            });

            try {
              const result = await opportunityService.createOpportunity(webhookData);
              
              // Verify opportunity was created with correct initial status
              expect(result.status).toBe('OPORTUNIDADES');
              
              // Verify seller assignment is preserved
              expect(result.vendedor_id).toBe(webhookData.vendedor_id);
              expect(result.vendedor).toBe(webhookData.vendedor);
              expect(result.vendedor_email).toBe(webhookData.vendedor_email);
              
              // Verify basic data integrity
              expect(result.nome).toBe(webhookData.nome);
              expect(result.email).toBe(webhookData.email);
              expect(result.telefone).toBe(webhookData.telefone);
              expect(result.origem).toBe(webhookData.origem);
              
              // Verify initial state
              expect(result.first_contact_date).toBeNull();
              expect(result.quoted_value).toBeNull();
              expect(result.lost_at).toBeNull();
              expect(result.converted_to_proposal_at).toBeNull();
              
            } catch (error) {
              // Should not throw for valid data
              expect.fail(`Should not throw for valid webhook data: ${error}`);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * Feature: crm-refactor, Property 5: Loss Tracking Completeness
     * Validates: Requirements 2.7, 2.8
     */
    it('should require and store complete loss information for any opportunity marked as lost', () => {
      fc.assert(
        fc.property(
          fc.record({
            opportunityId: fc.integer({ min: 1, max: 1000 }),
            lossCategory: fc.constantFrom('PREÇO', 'CONCORRÊNCIA', 'TIMING', 'NECESSIDADE', 'OUTROS'),
            lossDescription: fc.option(fc.string({ minLength: 0, maxLength: 500 })),
            currentUser: fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              email: fc.emailAddress(),
              role: fc.constantFrom('ADMIN', 'SELLER')
            })
          }),
          async ({ opportunityId, lossCategory, lossDescription, currentUser }) => {
            const lossReason: LossReason = {
              category: lossCategory,
              description: lossDescription || undefined
            };

            // Mock existing opportunity
            const mockExistingOpportunity: Opportunity = {
              id: opportunityId,
              nome: 'Test Opportunity',
              email: 'test@example.com',
              telefone: '1234567890',
              status: 'NEGOCIAÇÃO',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              vendedor: 'Test Seller',
              vendedor_email: 'seller@example.com',
              vendedor_id: 1,
              origem: 'MAKE',
              first_contact_date: new Date().toISOString(),
              quoted_value: 100,
              quoted_at: new Date().toISOString(),
              lost_at: null,
              loss_reason: null,
              loss_description: null,
              converted_to_proposal_at: null,
              proposal_id: null,
            };

            // Mock updated opportunity with loss data
            const mockUpdatedOpportunity = {
              ...mockExistingOpportunity,
              lost_at: new Date().toISOString(),
              loss_reason: lossReason,
              loss_description: lossReason.description,
              updated_at: new Date().toISOString(),
            };

            // Mock Supabase calls
            (supabase.from as any).mockImplementation((table: string) => {
              if (table === 'opportunities') {
                return {
                  select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: mockExistingOpportunity, error: null })
                    }))
                  })),
                  update: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      select: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: mockUpdatedOpportunity, error: null })
                      }))
                    }))
                  }))
                };
              }
              if (table === 'activity_logs') {
                return {
                  insert: vi.fn().mockResolvedValue({ error: null })
                };
              }
              return {};
            });

            try {
              const result = await opportunityService.markOpportunityAsLost(
                opportunityId, 
                lossReason, 
                currentUser as User
              );
              
              // Verify loss tracking completeness
              expect(result.lost_at).toBeTruthy();
              expect(result.loss_reason).toEqual(lossReason);
              expect(result.loss_reason?.category).toBe(lossCategory);
              
              if (lossDescription) {
                expect(result.loss_description).toBe(lossDescription);
                expect(result.loss_reason?.description).toBe(lossDescription);
              }
              
              // Verify timestamp is recent (within last minute)
              const lostAtTime = new Date(result.lost_at!).getTime();
              const now = new Date().getTime();
              expect(now - lostAtTime).toBeLessThan(60000); // Less than 1 minute
              
              // Verify updated_at was updated
              expect(result.updated_at).toBeTruthy();
              
            } catch (error) {
              expect.fail(`Should not throw for valid loss data: ${error}`);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * Feature: crm-refactor, Property 2: Opportunity Status Transitions
     * Validates: Requirements 2.2, 2.3, 2.5
     */
    it('should enforce proper status transitions and value requirements for any opportunity', () => {
      fc.assert(
        fc.property(
          fc.record({
            opportunityId: fc.integer({ min: 1, max: 1000 }),
            currentStatus: fc.constantFrom('OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIAÇÃO'),
            targetStatus: fc.constantFrom('OPORTUNIDADES', 'EM_CONTATO', 'NEGOCIAÇÃO'),
            quotedValue: fc.option(fc.float({ min: 0.01, max: 10000, noNaN: true })),
            currentUser: fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              email: fc.emailAddress(),
              role: fc.constantFrom('ADMIN', 'SELLER')
            })
          }),
          async ({ opportunityId, currentStatus, targetStatus, quotedValue, currentUser }) => {
            // Mock existing opportunity
            const mockOpportunity: Opportunity = {
              id: opportunityId,
              nome: 'Test Opportunity',
              email: 'test@example.com',
              telefone: '1234567890',
              status: currentStatus,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              vendedor: 'Test Seller',
              vendedor_email: 'seller@example.com',
              vendedor_id: 1,
              origem: 'MAKE',
              first_contact_date: currentStatus !== 'OPORTUNIDADES' ? new Date().toISOString() : null,
              quoted_value: currentStatus === 'NEGOCIAÇÃO' ? 100 : null,
              quoted_at: currentStatus === 'NEGOCIAÇÃO' ? new Date().toISOString() : null,
              lost_at: null,
              loss_reason: null,
              loss_description: null,
              converted_to_proposal_at: null,
              proposal_id: null,
            };

            // Mock updated opportunity
            const mockUpdatedOpportunity = {
              ...mockOpportunity,
              status: targetStatus,
              quoted_value: quotedValue || mockOpportunity.quoted_value,
              quoted_at: quotedValue ? new Date().toISOString() : mockOpportunity.quoted_at,
              first_contact_date: targetStatus === 'EM_CONTATO' && !mockOpportunity.first_contact_date 
                ? new Date().toISOString() 
                : mockOpportunity.first_contact_date,
              updated_at: new Date().toISOString(),
            };

            // Mock Supabase calls
            (supabase.from as any).mockImplementation((table: string) => {
              if (table === 'opportunities') {
                return {
                  select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: mockOpportunity, error: null })
                    }))
                  })),
                  update: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      select: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: mockUpdatedOpportunity, error: null })
                      }))
                    }))
                  }))
                };
              }
              if (table === 'activity_logs') {
                return {
                  insert: vi.fn().mockResolvedValue({ error: null })
                };
              }
              return {};
            });

            try {
              // Test the transition
              if (targetStatus === 'NEGOCIAÇÃO' && !quotedValue && !mockOpportunity.quoted_value) {
                // Should throw error when trying to move to NEGOCIAÇÃO without quoted value
                await expect(
                  opportunityService.updateOpportunityStatus(
                    opportunityId, 
                    targetStatus, 
                    currentUser as User,
                    quotedValue ? { quoted_value: quotedValue } : undefined
                  )
                ).rejects.toThrow('Valor cotado é obrigatório para avançar para NEGOCIAÇÃO');
              } else {
                // Should succeed for valid transitions
                const result = await opportunityService.updateOpportunityStatus(
                  opportunityId, 
                  targetStatus, 
                  currentUser as User,
                  quotedValue ? { quoted_value: quotedValue } : undefined
                );
                
                // Verify status was updated
                expect(result.status).toBe(targetStatus);
                
                // Verify value requirements
                if (targetStatus === 'NEGOCIAÇÃO') {
                  expect(result.quoted_value).toBeTruthy();
                  expect(result.quoted_at).toBeTruthy();
                }
                
                // Verify contact date is set when moving to EM_CONTATO
                if (targetStatus === 'EM_CONTATO') {
                  expect(result.first_contact_date).toBeTruthy();
                }
                
                // Verify updated timestamp
                expect(result.updated_at).toBeTruthy();
              }
              
            } catch (error) {
              // Only expected error is missing quoted value for NEGOCIAÇÃO
              if (targetStatus === 'NEGOCIAÇÃO' && !quotedValue && !mockOpportunity.quoted_value) {
                expect((error as Error).message).toContain('Valor cotado é obrigatório');
              } else {
                expect.fail(`Unexpected error for valid transition: ${error}`);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    /**
     * Feature: crm-refactor, Property 4: Opportunity to Proposal Conversion
     * Validates: Requirements 2.6
     */
    it('should properly convert opportunities to proposals with complete data transfer for any valid opportunity', () => {
      fc.assert(
        fc.property(
          fc.record({
            opportunityId: fc.integer({ min: 1, max: 1000 }),
            quotedValue: fc.float({ min: 0.01, max: 10000, noNaN: true }),
            currentUser: fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              email: fc.emailAddress(),
              role: fc.constantFrom('ADMIN', 'SELLER')
            })
          }),
          async ({ opportunityId, quotedValue, currentUser }) => {
            // Mock opportunity in NEGOCIAÇÃO status with quoted value
            const mockOpportunity: Opportunity = {
              id: opportunityId,
              nome: 'Test Opportunity',
              email: 'test@example.com',
              telefone: '1234567890',
              status: 'NEGOCIAÇÃO',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              vendedor: 'Test Seller',
              vendedor_email: 'seller@example.com',
              vendedor_id: 1,
              origem: 'MAKE',
              first_contact_date: new Date().toISOString(),
              quoted_value: quotedValue,
              quoted_at: new Date().toISOString(),
              lost_at: null,
              loss_reason: null,
              loss_description: null,
              converted_to_proposal_at: null,
              proposal_id: null,
            };

            const mockLeadId = 123;
            const mockUpdatedOpportunity = {
              ...mockOpportunity,
              converted_to_proposal_at: new Date().toISOString(),
              proposal_id: mockLeadId,
              updated_at: new Date().toISOString(),
            };

            // Mock Supabase calls
            (supabase.from as any).mockImplementation((table: string) => {
              if (table === 'opportunities') {
                return {
                  select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ data: mockOpportunity, error: null })
                    }))
                  })),
                  update: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      select: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: mockUpdatedOpportunity, error: null })
                      }))
                    }))
                  }))
                };
              }
              if (table === 'leads') {
                return {
                  insert: vi.fn(() => ({
                    select: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({ 
                        data: { 
                          id: mockLeadId,
                          nome: mockOpportunity.nome,
                          email: mockOpportunity.email,
                          telefone: mockOpportunity.telefone,
                          valor_produto: quotedValue,
                          vendedor_id: mockOpportunity.vendedor_id,
                          converted_from_opportunity_id: opportunityId,
                          conversion_date: new Date().toISOString(),
                        }, 
                        error: null 
                      })
                    }))
                  }))
                };
              }
              if (table === 'activity_logs') {
                return {
                  insert: vi.fn().mockResolvedValue({ error: null })
                };
              }
              return {};
            });

            try {
              const result = await opportunityService.convertOpportunityToProposal(
                opportunityId, 
                currentUser as User
              );
              
              // Verify conversion tracking in opportunity
              expect(result.opportunity.converted_to_proposal_at).toBeTruthy();
              expect(result.opportunity.proposal_id).toBe(mockLeadId);
              
              // Verify lead ID is returned
              expect(result.leadId).toBe(mockLeadId);
              
              // Verify conversion timestamp is recent
              const conversionTime = new Date(result.opportunity.converted_to_proposal_at!).getTime();
              const now = new Date().getTime();
              expect(now - conversionTime).toBeLessThan(60000); // Less than 1 minute
              
            } catch (error) {
              expect.fail(`Should not throw for valid conversion: ${error}`);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  // Unit tests for specific examples and edge cases
  describe('Unit Tests', () => {
    it('should reject conversion of opportunity not in NEGOCIAÇÃO status', async () => {
      const mockOpportunity: Opportunity = {
        id: 1,
        nome: 'Test',
        email: 'test@example.com',
        telefone: '1234567890',
        status: 'EM_CONTATO', // Not in NEGOCIAÇÃO
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vendedor: 'Test Seller',
        vendedor_email: 'seller@example.com',
        vendedor_id: 1,
        origem: 'MAKE',
        quoted_value: 100,
        first_contact_date: null,
        quoted_at: null,
        lost_at: null,
        loss_reason: null,
        loss_description: null,
        converted_to_proposal_at: null,
        proposal_id: null,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockOpportunity, error: null })
          }))
        }))
      });

      const currentUser: User = {
        id: 1,
        name: 'Test User',
        email: 'user@example.com',
        role: 'SELLER'
      };

      await expect(
        opportunityService.convertOpportunityToProposal(1, currentUser)
      ).rejects.toThrow('Apenas oportunidades em NEGOCIAÇÃO podem ser convertidas para propostas');
    });

    it('should reject conversion without quoted value', async () => {
      const mockOpportunity: Opportunity = {
        id: 1,
        nome: 'Test',
        email: 'test@example.com',
        telefone: '1234567890',
        status: 'NEGOCIAÇÃO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vendedor: 'Test Seller',
        vendedor_email: 'seller@example.com',
        vendedor_id: 1,
        origem: 'MAKE',
        quoted_value: null, // No quoted value
        first_contact_date: null,
        quoted_at: null,
        lost_at: null,
        loss_reason: null,
        loss_description: null,
        converted_to_proposal_at: null,
        proposal_id: null,
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockOpportunity, error: null })
          }))
        }))
      });

      const currentUser: User = {
        id: 1,
        name: 'Test User',
        email: 'user@example.com',
        role: 'SELLER'
      };

      await expect(
        opportunityService.convertOpportunityToProposal(1, currentUser)
      ).rejects.toThrow('Valor cotado é obrigatório para conversão');
    });
  });
});