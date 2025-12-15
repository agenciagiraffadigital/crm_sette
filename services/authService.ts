import { User, Role } from '../types';
import { supabase } from './supabaseClient';

// Helper to get current session
const STORAGE_KEY = 'sette_crm_user';

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Fetch user details from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', data.user.id)
      .single();

    if (userError) throw userError;

    const user: User = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
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
    }));
  },

  // Admin Only: Create new user - Note: This requires server-side for auth user creation
  createUser: async (user: Omit<User, 'id'>): Promise<User> => {
    // For client-side, we can only insert into users table if auth user exists
    // Assuming auth user is created separately
    const { data, error } = await supabase.from('users').insert({
      name: user.name,
      email: user.email,
      role: user.role,
      auth_id: user.email, // Placeholder, should be actual auth_id
    }).select().single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
    };
  },

  // Admin Only: Update user (including password reset)
  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    const { data: updated, error } = await supabase
      .from('users')
      .update({
        name: data.name,
        email: data.email,
        role: data.role,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    };
  },

  // Admin Only: Delete user
  deleteUser: async (id: number): Promise<void> => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // Helper for Round Robin logic
  getActiveSellers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
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