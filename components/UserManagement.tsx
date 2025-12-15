import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authService } from '../services/authService';
import { Plus, Edit, Trash2, Save, X, Key, Shield } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await authService.getAllUsers();
    setUsers(data);
  };

  const handleEdit = (user: User) => {
    setCurrentUserData({ ...user, password: '' }); // Don't populate password
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentUserData({ name: '', email: '', role: 'SELLER', password: '' });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      await authService.deleteUser(id);
      loadUsers();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (currentUserData.id) {
        // Edit
        const { id, ...data } = currentUserData;
        // If password is empty, don't update it
        if (!data.password) delete data.password;
        await authService.updateUser(id, data);
      } else {
        // Create
        if (!currentUserData.password) {
            alert("Senha é obrigatória para novos usuários");
            setLoading(false);
            return;
        }
        await authService.createUser(currentUserData as User);
      }
      setIsEditing(false);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Usuários</h2>
        <button 
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">
                {currentUserData.id ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
              <input 
                value={currentUserData.name}
                onChange={e => setCurrentUserData({...currentUserData, name: e.target.value})}
                required
                className="w-full mt-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
              <input 
                type="email"
                value={currentUserData.email}
                onChange={e => setCurrentUserData({...currentUserData, email: e.target.value})}
                required
                className="w-full mt-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Função (Role)</label>
              <select 
                value={currentUserData.role}
                onChange={e => setCurrentUserData({...currentUserData, role: e.target.value as Role})}
                className="w-full mt-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                  <option value="SELLER">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center mb-2">
                    <Key className="w-4 h-4 text-slate-400 mr-2" />
                    <label className="text-xs font-bold text-slate-500 uppercase">
                        {currentUserData.id ? 'Alterar Senha (Opcional)' : 'Definir Senha'}
                    </label>
                </div>
                <input 
                    type="password"
                    placeholder={currentUserData.id ? "Deixe em branco para manter a atual" : "Digite a senha"}
                    value={currentUserData.password || ''}
                    onChange={e => setCurrentUserData({...currentUserData, password: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            <div className="flex justify-end pt-4 space-x-3">
                <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold"
                >
                    {loading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
                </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nome</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">E-mail</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Função</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 text-sm text-slate-500">#{user.id}</td>
                            <td className="p-4 font-medium text-slate-800">{user.name}</td>
                            <td className="p-4 text-sm text-slate-600">{user.email}</td>
                            <td className="p-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center w-fit ${
                                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {user.role === 'ADMIN' && <Shield className="w-3 h-3 mr-1" />}
                                    {user.role}
                                </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                                <button 
                                    onClick={() => handleEdit(user)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Editar"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(user.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};