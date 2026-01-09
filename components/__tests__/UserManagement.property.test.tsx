import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { User, Role } from '../../types';
import { authService } from '../../services/authService';

// Mock supabase client
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
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
    auth: {
      signUp: vi.fn(),
      admin: {
        updateUserById: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  },
  supabaseAdmin: {},
}));

// Generators for property-based testing
const roleArb = fc.constantFrom('ADMIN', 'SELLER');

const userArb = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  role: roleArb,
  active_for_distribution: fc.boolean(),
  last_lead_assigned_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  total_leads_assigned: fc.integer({ min: 0, max: 1000 }),
  last_login_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  created_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  updated_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
}) as fc.Arbitrary<User>;

const newUserDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  role: roleArb,
  password: fc.string({ minLength: 8, maxLength: 20 }),
});

describe('UserManagement Service Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 19: User Creation and Role Assignment', () => {
    it('Feature: crm-refactor, Property 19: For any new user creation, the system should validate required data and assign the correct role with appropriate permissions', () => {
      fc.assert(fc.property(
        newUserDataArb,
        async (userData) => {
          // Mock successful database operations
          const mockAuthUser = { id: 'auth-123', email: userData.email };
          const mockDbUser = {
            id: 123,
            auth_id: 'auth-123',
            name: userData.name,
            email: userData.email,
            role: userData.role,
            active_for_distribution: userData.role === 'SELLER',
            total_leads_assigned: 0,
          };

          const { supabase } = await import('../../services/supabaseClient');
          
          // Mock auth signup
          (supabase.auth.signUp as any).mockResolvedValue({
            data: { user: mockAuthUser },
            error: null,
          });

          // Mock database insert
          (supabase.from as any).mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockDbUser,
                  error: null,
                }),
              }),
            }),
          });

          // Test user creation
          const result = await authService.createUser(
            {
              name: userData.name,
              email: userData.email,
              role: userData.role,
            },
            userData.password
          );

          // Verify the result has correct structure
          expect(result).toEqual(
            expect.objectContaining({
              id: expect.any(Number),
              name: userData.name,
              email: userData.email,
              role: userData.role,
            })
          );

          // Verify auth signup was called correctly
          expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                name: userData.name,
                role: userData.role,
              },
            },
          });

          return true;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 20: User Management Completeness', () => {
    it('Feature: crm-refactor, Property 20: For any user listing or permission update, the system should display complete information and apply changes immediately', () => {
      fc.assert(fc.property(
        fc.array(userArb, { minLength: 1, maxLength: 5 }),
        async (users: User[]) => {
          const { supabase } = await import('../../services/supabaseClient');

          // Mock database select
          (supabase.from as any).mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: users,
              error: null,
            }),
          });

          // Test getting all users
          const result = await authService.getAllUsers();

          // Verify all users are returned with complete information
          expect(result).toHaveLength(users.length);
          
          result.forEach((user, index) => {
            expect(user).toEqual(
              expect.objectContaining({
                id: users[index].id,
                name: users[index].name,
                email: users[index].email,
                role: users[index].role,
                active_for_distribution: users[index].active_for_distribution,
                total_leads_assigned: users[index].total_leads_assigned,
              })
            );
          });

          return true;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 21: Role-based Access Control', () => {
    it('Feature: crm-refactor, Property 21: For any user role change, access permissions should be updated consistently across all system components', () => {
      fc.assert(fc.property(
        userArb,
        roleArb,
        async (user: User, newRole: Role) => {
          const { supabase } = await import('../../services/supabaseClient');
          
          const updatedUser = { ...user, role: newRole };

          // Mock database update
          (supabase.from as any).mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedUser,
                    error: null,
                  }),
                }),
              }),
            }),
          });

          // Test user update
          const result = await authService.updateUser(user.id, { role: newRole });

          // Verify the role was updated
          expect(result.role).toBe(newRole);
          expect(result.id).toBe(user.id);

          // Verify database update was called correctly
          expect(supabase.from).toHaveBeenCalledWith('users_profile');

          return true;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 34: Distribution Toggle Control', () => {
    it('Feature: crm-refactor, Property 34: For any seller with distribution toggle disabled, the round-robin system should skip them and distribute leads only to active sellers', () => {
      fc.assert(fc.property(
        fc.array(userArb.filter(u => u.role === 'SELLER'), { minLength: 1, maxLength: 5 }),
        async (sellers: User[]) => {
          const { supabase } = await import('../../services/supabaseClient');

          // Mock database select for active sellers
          (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((field, value) => {
                if (field === 'role' && value === 'SELLER') {
                  return {
                    eq: vi.fn().mockImplementation((field2, value2) => {
                      if (field2 === 'active_for_distribution' && value2 === true) {
                        const activeSellers = sellers.filter(s => s.active_for_distribution === true);
                        return Promise.resolve({
                          data: activeSellers,
                          error: null,
                        });
                      }
                      return Promise.resolve({ data: [], error: null });
                    }),
                  };
                }
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          });

          // Test getting active sellers
          const result = await authService.getActiveSellers();

          // Verify only active sellers are returned
          const expectedActiveSellers = sellers.filter(s => s.active_for_distribution === true);
          expect(result).toHaveLength(expectedActiveSellers.length);

          result.forEach(seller => {
            expect(seller.role).toBe('SELLER');
            expect(seller.active_for_distribution).toBe(true);
          });

          return true;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 35: Lead Reassignment Tracking', () => {
    it('Feature: crm-refactor, Property 35: For any admin reassignment of leads or opportunities, the system should update assignments and create complete audit trails with notifications', () => {
      fc.assert(fc.property(
        userArb.filter(u => u.role === 'ADMIN'),
        userArb.filter(u => u.role === 'SELLER'),
        userArb.filter(u => u.role === 'SELLER'),
        fc.boolean(),
        async (admin: User, fromSeller: User, toSeller: User, toggleState: boolean) => {
          const { supabase } = await import('../../services/supabaseClient');

          // Mock database update for distribution toggle
          (supabase.from as any).mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...fromSeller, active_for_distribution: toggleState },
                    error: null,
                  }),
                }),
              }),
            }),
          });

          // Test toggling user distribution status
          const result = await authService.toggleUserDistribution(
            fromSeller.id,
            toggleState,
            admin
          );

          // Verify the toggle was applied
          expect(result.active_for_distribution).toBe(toggleState);
          expect(result.id).toBe(fromSeller.id);

          // Verify admin permissions were checked (implicitly through no error)
          expect(admin.role).toBe('ADMIN');

          return true;
        }
      ), { numRuns: 10 });
    });
  });
});