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

    // Buscar dados do usuário na tabela users_profile APENAS no login
    const { data: userData, error: userError } = await supabase
      .from('users_profile')
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
        .from('users_profile')
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
    const { data, error } = await supabase.from('users_profile').select('*');
    if (error) throw error;
    return data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
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

      // Inserir na tabela users_profile
      const { data, error } = await supabase.from('users_profile').insert({
        auth_id: authData.user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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
    const { data: updated, error } = await supabase
      .from('users_profile')
      .update({
        name: data.name,
        email: data.email,
        role: data.role,
      })
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
    };
  },

  // Admin Only: Reset user password
  resetUserPassword: async (userId: number, newPassword: string): Promise<void> => {
    const { data: userData, error: userError } = await supabase
      .from('users_profile')
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
      .from('users_profile')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (userError) throw userError;

    // Deletar do auth (cascade vai deletar da tabela users_profile)
    const { error } = await supabase.auth.admin.deleteUser(userData.auth_id);
    if (error) throw error;
  },

  // Helper for Round Robin logic
  getActiveSellers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('role', 'SELLER');
    if (error) throw error;
    return data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  }
};