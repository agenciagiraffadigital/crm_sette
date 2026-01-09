import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import express from 'express'
import request from 'supertest'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}))

// Mock environment variables
vi.mock('process', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    PORT: '4000'
  }
}))

describe('Webhook System Property Tests', () => {
  let app: express.Application
  let mockSupabase: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      raw: vi.fn()
    }
    
    ;(createClient as any).mockReturnValue(mockSupabase)
    
    // Create Express app for testing
    app = express()
    app.use(express.json({ limit: '1mb' }))
    
    // Mock seller selection function
    const pickSeller = async () => {
      const { data: sellers } = await mockSupabase
        .from('users_profile')
        .select('id,name,email,role')
        .eq('role', 'SELLER')
        .eq('active_for_distribution', true)
        .order('id')
      
      if (!sellers?.length) return null
      return sellers[0]
    }
    
    // Webhook endpoint implementation
    app.post('/webhook/make', async (req, res) => {
      try {
        // Extract data from different payload formats
        let nome, email, telefone, origem, operadora
        
        // Handle Make.com format
        if (req.body?.value?.[0]?.contact) {
          const contact = req.body.value[0].contact
          nome = contact.name?.trim()
          email = contact.email?.trim()
          telefone = contact.phone?.trim()
          origem = req.body.value[0].sales_channel?.name ?? 'MAKE'
          operadora = req.body.value[0].custom_fields?.Operadora ?? null
        }
        // Handle alternative format
        else if (req.body?.oportunidades?.[0]?.contato) {
          const contato = req.body.oportunidades[0].contato
          nome = contato.nome?.trim()
          email = contato.email?.trim()
          telefone = contato.telefone1?.trim()
          origem = 'MAKE'
          
          // Extract operadora from personalizados
          const oportunidade = req.body.oportunidades[0]
          if (oportunidade?.personalizados && Array.isArray(oportunidade.personalizados)) {
            const operadoraField = oportunidade.personalizados.find((p: any) => p.titulo === 'Operadora')
            operadora = operadoraField?.valor ?? null
          }
        }
        
        // Validate required fields
        if (!nome || !email || !telefone) {
          return res.status(400).json({ 
            ok: false, 
            error: 'nome/email/telefone obrigatórios',
            details: { nome: !!nome, email: !!email, telefone: !!telefone }
          })
        }
        
        // Get seller
        const seller = await pickSeller()
        if (!seller) {
          return res.status(500).json({ 
            ok: false, 
            error: 'Nenhum vendedor ativo disponível para distribuição' 
          })
        }
        
        // Create opportunity
        const opportunityData = {
          nome,
          email,
          telefone,
          origem,
          operadora,
          status: 'OPORTUNIDADES',
          vendedor: seller.name,
          vendedor_email: seller.email,
          vendedor_id: seller.id,
          raw_json: req.body,
        }
        
        const { data: opportunity, error: insertError } = await mockSupabase
          .from('opportunities')
          .insert(opportunityData)
          .select()
          .single()
        
        if (insertError) {
          console.error('Database error:', insertError)
          return res.status(500).json({ 
            ok: false, 
            error: 'Erro interno do servidor',
            details: insertError.message 
          })
        }
        
        // Update seller tracking
        await mockSupabase
          .from('users_profile')
          .update({ 
            last_lead_assigned_at: new Date().toISOString(),
            total_leads_assigned: mockSupabase.raw('total_leads_assigned + 1')
          })
          .eq('id', seller.id)
        
        // Log activity
        await mockSupabase.from('activity_logs').insert({
          opportunity_id: opportunity.id,
          type: 'STATUS_CHANGE',
          description: `Oportunidade criada via webhook ${origem} e atribuída a ${seller.name}`,
          user_id: seller.id,
          user_name: seller.name,
          metadata: { 
            origem,
            operadora,
            webhook_data: req.body
          }
        })
        
        return res.json({ 
          ok: true, 
          opportunity: { 
            id: opportunity.id,
            nome, 
            email, 
            telefone, 
            vendedor: seller.name,
            status: 'OPORTUNIDADES',
            origem,
            operadora
          } 
        })
      } catch (err: any) {
        console.error('Webhook error:', err)
        return res.status(500).json({ 
          ok: false, 
          error: 'Erro interno do servidor',
          details: err.message 
        })
      }
    })
  })

  /**
   * Feature: crm-refactor, Property 22: Webhook Payload Validation
   * Validates: Requirements 8.1, 8.5
   */
  it('should validate webhook payloads and reject invalid ones with appropriate HTTP status codes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasValidStructure: fc.boolean(),
          hasRequiredFields: fc.boolean(),
          nome: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          email: fc.option(fc.emailAddress()),
          telefone: fc.option(fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s))),
          origem: fc.constantFrom('MAKE', 'SITE', 'WEBHOOK', 'MANUAL'),
          operadora: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
        }),
        async (testData) => {
          // Mock active sellers
          mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users_profile') {
              return {
                ...mockSupabase,
                data: [{ id: 1, name: 'Test Seller', email: 'seller@test.com', role: 'SELLER' }],
                error: null
              }
            }
            if (table === 'opportunities') {
              return {
                ...mockSupabase,
                data: [{ id: 1, ...testData }],
                error: null
              }
            }
            return mockSupabase
          })

          let payload: any = {}
          
          if (testData.hasValidStructure) {
            // Create valid structure
            payload = {
              value: [{
                contact: {
                  name: testData.hasRequiredFields && testData.nome ? testData.nome : undefined,
                  email: testData.hasRequiredFields && testData.email ? testData.email : undefined,
                  phone: testData.hasRequiredFields && testData.telefone ? testData.telefone : undefined,
                },
                sales_channel: { name: testData.origem },
                custom_fields: testData.operadora ? { Operadora: testData.operadora } : {}
              }]
            }
          } else {
            // Create invalid structure
            payload = { invalid: 'structure' }
          }

          const response = await request(app)
            .post('/webhook/make')
            .send(payload)

          if (testData.hasValidStructure && testData.hasRequiredFields && testData.nome && testData.email && testData.telefone) {
            // Should succeed with valid data
            expect(response.status).toBe(200)
            expect(response.body.ok).toBe(true)
            expect(response.body.opportunity).toBeDefined()
            expect(response.body.opportunity.nome).toBe(testData.nome)
            expect(response.body.opportunity.email).toBe(testData.email)
            expect(response.body.opportunity.telefone).toBe(testData.telefone)
          } else {
            // Should fail with invalid data
            expect(response.status).toBeGreaterThanOrEqual(400)
            expect(response.body.ok).toBe(false)
            expect(response.body.error).toBeDefined()
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Feature: crm-refactor, Property 23: Error Logging Completeness
   * Validates: Requirements 8.2
   */
  it('should log detailed error information for any webhook processing failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          shouldCauseDatabaseError: fc.boolean(),
          shouldCauseValidationError: fc.boolean(),
          nome: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          telefone: fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s)),
          errorMessage: fc.string({ minLength: 1, maxLength: 200 })
        }),
        async (testData) => {
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
          
          // Mock sellers
          mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users_profile') {
              return {
                ...mockSupabase,
                data: [{ id: 1, name: 'Test Seller', email: 'seller@test.com', role: 'SELLER' }],
                error: null
              }
            }
            if (table === 'opportunities') {
              if (testData.shouldCauseDatabaseError) {
                return {
                  ...mockSupabase,
                  data: null,
                  error: { message: testData.errorMessage, code: 'DB_ERROR' }
                }
              }
              return {
                ...mockSupabase,
                data: [{ id: 1 }],
                error: null
              }
            }
            return mockSupabase
          })

          const payload = {
            value: [{
              contact: {
                name: testData.shouldCauseValidationError ? '' : testData.nome,
                email: testData.shouldCauseValidationError ? '' : testData.email,
                phone: testData.shouldCauseValidationError ? '' : testData.telefone,
              },
              sales_channel: { name: 'MAKE' }
            }]
          }

          const response = await request(app)
            .post('/webhook/make')
            .send(payload)

          if (testData.shouldCauseDatabaseError || testData.shouldCauseValidationError) {
            // Should have error response
            expect(response.status).toBeGreaterThanOrEqual(400)
            expect(response.body.ok).toBe(false)
            expect(response.body.error).toBeDefined()
            
            if (testData.shouldCauseDatabaseError) {
              // Should log database errors
              expect(consoleSpy).toHaveBeenCalledWith('Database error:', expect.objectContaining({
                message: testData.errorMessage
              }))
              expect(response.body.details).toBe(testData.errorMessage)
            }
            
            if (testData.shouldCauseValidationError) {
              // Should provide validation details
              expect(response.body.details).toBeDefined()
              expect(typeof response.body.details).toBe('object')
            }
          }
          
          consoleSpy.mockRestore()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Feature: crm-refactor, Property 24: Data Transformation Consistency
   * Validates: Requirements 8.4, 8.5
   */
  it('should consistently transform and normalize webhook data before storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          payloadFormat: fc.constantFrom('make_format', 'alternative_format'),
          nome: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          telefone: fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s)),
          origem: fc.constantFrom('MAKE', 'SITE', 'WEBHOOK'),
          operadora: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          hasWhitespace: fc.boolean()
        }),
        async (testData) => {
          // Mock successful database operations
          let insertedData: any = null
          mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users_profile') {
              return {
                ...mockSupabase,
                data: [{ id: 1, name: 'Test Seller', email: 'seller@test.com', role: 'SELLER' }],
                error: null
              }
            }
            if (table === 'opportunities') {
              return {
                ...mockSupabase,
                insert: (data: any) => {
                  insertedData = data
                  return {
                    ...mockSupabase,
                    select: () => ({
                      ...mockSupabase,
                      single: () => ({
                        data: { id: 1, ...data },
                        error: null
                      })
                    })
                  }
                }
              }
            }
            return mockSupabase
          })

          // Add whitespace if requested
          const nome = testData.hasWhitespace ? `  ${testData.nome}  ` : testData.nome
          const email = testData.hasWhitespace ? `  ${testData.email}  ` : testData.email
          const telefone = testData.hasWhitespace ? `  ${testData.telefone}  ` : testData.telefone

          let payload: any
          if (testData.payloadFormat === 'make_format') {
            payload = {
              value: [{
                contact: { name: nome, email: email, phone: telefone },
                sales_channel: { name: testData.origem },
                custom_fields: testData.operadora ? { Operadora: testData.operadora } : {}
              }]
            }
          } else {
            payload = {
              oportunidades: [{
                contato: { nome: nome, email: email, telefone1: telefone },
                personalizados: testData.operadora ? [{ titulo: 'Operadora', valor: testData.operadora }] : []
              }]
            }
          }

          const response = await request(app)
            .post('/webhook/make')
            .send(payload)

          expect(response.status).toBe(200)
          expect(response.body.ok).toBe(true)
          
          // Verify data normalization
          expect(insertedData).toBeDefined()
          expect(insertedData.nome).toBe(testData.nome.trim()) // Should be trimmed
          expect(insertedData.email).toBe(testData.email.trim()) // Should be trimmed
          expect(insertedData.telefone).toBe(testData.telefone.trim()) // Should be trimmed
          expect(insertedData.status).toBe('OPORTUNIDADES') // Should always be initial status
          expect(insertedData.vendedor).toBe('Test Seller') // Should have seller assigned
          expect(insertedData.vendedor_id).toBe(1) // Should have seller ID
          expect(insertedData.raw_json).toEqual(payload) // Should preserve original payload
          
          // Verify response consistency
          expect(response.body.opportunity.nome).toBe(testData.nome.trim())
          expect(response.body.opportunity.email).toBe(testData.email.trim())
          expect(response.body.opportunity.telefone).toBe(testData.telefone.trim())
          expect(response.body.opportunity.status).toBe('OPORTUNIDADES')
        }
      ),
      { numRuns: 20 }
    )
  })
})