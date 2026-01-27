import { supabase } from './supabaseClient';

export interface Operadora {
  id: number;
  nome: string;
  ativa: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Produto {
  id: number;
  operadora_id: number;
  nome: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export const operadoraService = {
  async getOperadoras(): Promise<Operadora[]> {
    const { data, error } = await supabase
      .from('operadoras')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data || [];
  },

  async createOperadora(nome: string): Promise<Operadora> {
    const { data, error } = await supabase
      .from('operadoras')
      .insert({ nome, ativa: true })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteOperadora(id: number): Promise<void> {
    const { error } = await supabase
      .from('operadoras')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async toggleOperadora(id: number, ativa: boolean): Promise<void> {
    const { error } = await supabase
      .from('operadoras')
      .update({ ativa })
      .eq('id', id);
    
    if (error) throw error;
  },

  async getProdutosByOperadora(operadoraId: number): Promise<Produto[]> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('operadora_id', operadoraId)
      .eq('ativo', true)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  },

  async createProduto(operadoraId: number, nome: string): Promise<Produto> {
    const { data, error } = await supabase
      .from('produtos')
      .insert({ operadora_id: operadoraId, nome, ativo: true })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteProduto(id: number): Promise<void> {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
