import { User, Role } from '../types';
import { supabase, supabaseAdmin } from './supabaseClient';
import type { AuthError, Session } from '@supabase/supabase-js';

export const authService = {
  // Login usando Supabase Auth
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Usuário não encontrado');

    // Buscar dados do usuário na tabela users APENAS no login
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    if (userError) throw new Error('Dados do usuário não encontrados');

    // Armazenar no localStorage para acesso rápido
    const user = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
    };
    
    localStorage.setItem('crm_user', JSON.stringify(user));
    return user;
  },

  // Logout
  logout: async (): Promise<void> => {
    localStorage.removeItem('crm_user');
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  // Obter usuário atual da sessão
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();

      if (error) return null;

      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      };
    } catch (error) {
      return null;
    }
  },

  // Listener para mudanças de autenticação
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Usar dados do localStorage se disponível (mais rápido)
        const stored = localStorage.getItem('crm_user');
        if (stored) {
          callback(JSON.parse(stored));
          return;
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('crm_user');
        callback(null);
      }
    });
  },

  // Admin Only: Get all users
  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active_for_distribution: u.active_for_distribution,
      last_lead_assigned_at: u.last_lead_assigned_at,
      total_leads_assigned: u.total_leads_assigned,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }));
  },

  // Admin Only: Create new user
  createUser: async (user: Omit<User, 'id'>, password: string): Promise<User> => {
    try {
      // Usar o cliente normal mas com signUp (mais seguro)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password,
        options: {
          data: {
            name: user.name,
            role: user.role
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Erro ao criar autenticação: ${authError.message}`);
      }
      
      if (!authData.user) {
        throw new Error('Falha ao criar usuário na autenticação');
      }

      // Inserir na tabela users
      const { data, error } = await supabase.from('users').insert({
        auth_id: authData.user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active_for_distribution: user.role === 'SELLER', // Default to true for sellers
        total_leads_assigned: 0,
      }).select().single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Erro ao salvar usuário: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      };
    } catch (error: any) {
      console.error('Create user error:', error);
      throw new Error(error.message || 'Erro desconhecido ao criar usuário');
    }
  },

  // Admin Only: Update user
  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active_for_distribution !== undefined) updateData.active_for_distribution = data.active_for_distribution;

    const { data: updated, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Atualizar email no auth se mudou
    if (data.email && data.email !== updated.email) {
      await supabase.auth.admin.updateUserById(updated.auth_id, {
        email: data.email,
      });
    }

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      active_for_distribution: updated.active_for_distribution,
      last_lead_assigned_at: updated.last_lead_assigned_at,
      total_leads_assigned: updated.total_leads_assigned,
      last_login_at: updated.last_login_at,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  },

  // Admin Only: Reset user password
  resetUserPassword: async (userId: number, newPassword: string): Promise<void> => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const { error } = await supabase.auth.admin.updateUserById(userData.auth_id, {
      password: newPassword,
    });

    if (error) throw error;
  },

  // Admin Only: Delete user
  deleteUser: async (id: number): Promise<void> => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (userError) throw userError;

    // Deletar do auth (cascade vai deletar da tabela users)
    const { error } = await supabase.auth.admin.deleteUser(userData.auth_id);
    if (error) throw error;
  },

  // Helper for Round Robin logic - only active sellers
  getActiveSellers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'SELLER')
      .eq('active_for_distribution', true);
    if (error) throw error;
    return data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active_for_distribution: u.active_for_distribution,
      last_lead_assigned_at: u.last_lead_assigned_at,
      total_leads_assigned: u.total_leads_assigned,
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }));
  },

  // Update user login timestamp
  updateLastLogin: async (userId: number): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) throw error;
  },

  // Update lead assignment tracking
  updateLeadAssignmentTracking: async (userId: number): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ 
        last_lead_assigned_at: new Date().toISOString(),
        total_leads_assigned: supabase.raw('total_leads_assigned + 1')
      })
      .eq('id', userId);
    
    if (error) throw error;
  },

  // Toggle user distribution status (Admin only)
  toggleUserDistribution: async (userId: number, active: boolean, currentUser: User): Promise<User> => {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Apenas administradores podem alterar status de distribuição');
    }

    const { data, error } = await supabase
      .from('users')
      .update({ active_for_distribution: active })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      active_for_distribution: data.active_for_distribution,
      last_lead_assigned_at: data.last_lead_assigned_at,
      total_leads_assigned: data.total_leads_assigned,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
};