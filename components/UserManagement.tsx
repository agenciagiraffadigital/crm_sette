import React, { useState, useEffect } from 'react';
import { User, Role, Lead, Opportunity, ActivityLog, AssignmentHistory } from '../types';
import { authService } from '../services/authService';
import { leadService } from '../services/leadService';
import { opportunityService } from '../services/opportunityService';
import { notificationService } from '../services/notificationService';
import { SystemModal } from './SystemModal';
import { Plus, Edit, Trash2, Save, X, Key, Shield, ToggleLeft, ToggleRight, Users, Activity, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [userPerformance, setUserPerformance] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<ActivityLog[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ userId: 0, newPassword: '' });
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'success' | 'error';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });
  const [reassignmentData, setReassignmentData] = useState<{
    type: 'lead' | 'opportunity';
    items: (Lead | Opportunity)[];
    targetUserId: number;
    reason: string;
  }>({
    type: 'lead',
    items: [],
    targetUserId: 0,
    reason: '',
  });

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
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este usuário?',
      onConfirm: async () => {
        try {
          await authService.deleteUser(id);
          loadUsers();
          setModal({ isOpen: false, type: 'alert', title: '', message: '' });
        } catch (error: any) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Erro',
            message: error.message
          });
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (currentUserData.id) {
        // Edit
        const { id, ...data } = currentUserData;
        await authService.updateUser(id, data);
      } else {
        // Create
        if (!currentUserData.password) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Erro',
            message: 'Senha é obrigatória para novos usuários'
          });
          setLoading(false);
          return;
        }
        await authService.createUser(currentUserData as Omit<User, 'id'>, currentUserData.password);
      }
      setIsEditing(false);
      loadUsers();
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    setPasswordData({ userId, newPassword: '' });
    setShowPasswordModal(true);
  };

  const executePasswordReset = async () => {
    if (!passwordData.newPassword) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Digite uma senha'
      });
      return;
    }
    
    try {
      await authService.resetUserPassword(passwordData.userId, passwordData.newPassword);
      setShowPasswordModal(false);
      setPasswordData({ userId: 0, newPassword: '' });
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Sucesso',
        message: 'Senha alterada com sucesso!'
      });
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao alterar senha: ' + error.message
      });
    }
  };

  const handleToggleDistribution = async (userId: number, currentStatus: boolean) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
      const currentUser = JSON.parse(localStorage.getItem('crm_user') || '{}');
      
      if (!currentUser.id || currentUser.role !== 'ADMIN') {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: 'Apenas administradores podem alterar status de distribuição'
        });
        return;
      }
      
      await authService.toggleUserDistribution(userId, !currentStatus, currentUser);
      await loadUsers();
      
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Sucesso',
        message: `Status de distribuição ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`
      });
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao alterar status de distribuição: ' + error.message
      });
    }
  };

  const handleViewPerformance = async (user: User) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      // Get user's leads and opportunities for performance metrics
      const leads = await leadService.getLeadsByUser(user.id);
      const opportunities = await opportunityService.getOpportunitiesByUser(user.id);
      
      // Calculate performance metrics
      const totalLeads = leads.length;
      const convertedLeads = leads.filter(l => l.status_kanban === 'IMPLANTADA').length;
      const totalOpportunities = opportunities.length;
      const convertedOpportunities = opportunities.filter(o => o.converted_to_proposal_at).length;
      
      const performance = {
        totalLeads,
        convertedLeads,
        conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0',
        totalOpportunities,
        convertedOpportunities,
        opportunityConversionRate: totalOpportunities > 0 ? ((convertedOpportunities / totalOpportunities) * 100).toFixed(1) : '0',
        totalAssigned: user.total_leads_assigned || 0,
        lastActivity: user.last_login_at,
      };
      
      setUserPerformance(performance);
      setShowPerformanceModal(true);
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao carregar métricas: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewActivity = async (user: User) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      // Get activity logs for this user
      const activities: ActivityLog[] = [];
      
      // Get activities from leads
      const leads = await leadService.getLeadsByUser(user.id);
      for (const lead of leads) {
        if (lead.activity_log) {
          activities.push(...lead.activity_log.filter(log => log.user_id === user.id));
        }
      }
      
      // Get activities from opportunities
      const opportunities = await opportunityService.getOpportunitiesByUser(user.id);
      for (const opportunity of opportunities) {
        const oppActivities = await opportunityService.getOpportunityActivityLogs(opportunity.id);
        activities.push(...oppActivities.filter(log => log.user_id === user.id));
      }
      
      // Sort by date (most recent first)
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setUserActivity(activities.slice(0, 50)); // Show last 50 activities
      setShowActivityModal(true);
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao carregar atividades: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReassignItems = async (user: User) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      // Get user's leads and opportunities
      const leads = await leadService.getLeadsByUser(user.id);
      const opportunities = await opportunityService.getOpportunitiesByUser(user.id);
      
      setReassignmentData({
        type: 'lead',
        items: [...leads, ...opportunities],
        targetUserId: 0,
        reason: '',
      });
      setShowReassignModal(true);
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao carregar itens para reatribuição: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const executeReassignment = async () => {
    if (!selectedUser || !reassignmentData.targetUserId) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Selecione um usuário de destino'
      });
      return;
    }

    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('crm_user') || '{}');
      const targetUser = users.find(u => u.id === reassignmentData.targetUserId);
      
      if (!targetUser) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Erro',
          message: 'Usuário de destino não encontrado'
        });
        return;
      }
      
      // Filter items by type
      const leads = reassignmentData.items.filter(item => 'status_kanban' in item) as Lead[];
      const opportunities = reassignmentData.items.filter(item => 'status' in item) as Opportunity[];
      
      // Reassign leads
      for (const lead of leads) {
        await leadService.reassignLead(lead.id, reassignmentData.targetUserId, currentUser);
        
        // Send notifications
        await notificationService.notifyReassignment(selectedUser.id, {
          type: 'lead',
          itemName: lead.nome,
          fromUser: currentUser.name,
          toUser: targetUser.name,
          reason: reassignmentData.reason,
          isReceiver: false,
        });
        
        await notificationService.notifyReassignment(reassignmentData.targetUserId, {
          type: 'lead',
          itemName: lead.nome,
          fromUser: currentUser.name,
          toUser: targetUser.name,
          reason: reassignmentData.reason,
          isReceiver: true,
        });
      }
      
      // Reassign opportunities
      for (const opportunity of opportunities) {
        await opportunityService.reassignOpportunity(
          opportunity.id, 
          reassignmentData.targetUserId, 
          currentUser, 
          reassignmentData.reason
        );
        
        // Send notifications
        await notificationService.notifyReassignment(selectedUser.id, {
          type: 'opportunity',
          itemName: opportunity.nome,
          fromUser: currentUser.name,
          toUser: targetUser.name,
          reason: reassignmentData.reason,
          isReceiver: false,
        });
        
        await notificationService.notifyReassignment(reassignmentData.targetUserId, {
          type: 'opportunity',
          itemName: opportunity.nome,
          fromUser: currentUser.name,
          toUser: targetUser.name,
          reason: reassignmentData.reason,
          isReceiver: true,
        });
      }
      
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Sucesso',
        message: `${leads.length + opportunities.length} itens reatribuídos com sucesso!`
      });
      setShowReassignModal(false);
      loadUsers(); // Refresh user data
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro na reatribuição: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestão de Usuários</h1>
          <p className="text-slate-600 mt-1">Gerencie usuários, permissões e distribuição de leads</p>
        </div>
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

            {currentUserData.role === 'SELLER' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Distribuição de Leads</label>
                <div className="mt-1">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={currentUserData.active_for_distribution !== false}
                      onChange={e => setCurrentUserData({...currentUserData, active_for_distribution: e.target.checked})}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Ativo para receber leads automaticamente</span>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center mb-2">
                    <Key className="w-4 h-4 text-slate-400 mr-2" />
                    <label className="text-xs font-bold text-slate-500 uppercase">
                        {currentUserData.id ? 'Nova Senha (Opcional)' : 'Definir Senha'}
                    </label>
                </div>
                <input 
                    type="password"
                    placeholder={currentUserData.id ? "Deixe em branco para não alterar" : "Digite a senha"}
                    value={currentUserData.password || ''}
                    onChange={e => setCurrentUserData({...currentUserData, password: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {currentUserData.id && (
                  <p className="text-xs text-slate-500 mt-1">
                    Para alterar senha, use o botão "Resetar Senha" na lista de usuários
                  </p>
                )}
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
        <>
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nome</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">E-mail</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Função</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Distribuição</th>
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
                            <td className="p-4">
                                {user.role === 'SELLER' && (
                                    <button
                                        onClick={() => handleToggleDistribution(user.id, user.active_for_distribution || false)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                            user.active_for_distribution ? 'bg-green-600' : 'bg-gray-200'
                                        }`}
                                        title={user.active_for_distribution ? 'Ativo para distribuição' : 'Inativo para distribuição'}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                user.active_for_distribution ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                )}
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
                                    onClick={() => handleResetPassword(user.id)}
                                    className="p-2 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                    title="Resetar Senha"
                                >
                                    <Key className="w-4 h-4" />
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

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {users.map(user => (
            <div key={user.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{user.name}</h3>
                  <p className="text-xs text-slate-500">#{user.id}</p>
                </div>
                <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                  user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role}
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <p className="text-xs text-slate-600 truncate">{user.email}</p>
                {user.role === 'SELLER' && (
                  <div className="flex items-center justify-between pr-2">
                    <span className="text-xs text-slate-500">Distribuição</span>
                    <button
                      onClick={() => handleToggleDistribution(user.id, user.active_for_distribution || false)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        user.active_for_distribution ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        user.active_for_distribution ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button 
                  onClick={() => handleEdit(user)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button 
                  onClick={() => handleResetPassword(user.id)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Senha</span>
                </button>
                <button 
                  onClick={() => handleDelete(user.id)}
                  className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Performance Modal */}
      {showPerformanceModal && selectedUser && userPerformance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">
                  Performance - {selectedUser.name}
                </h3>
                <button 
                  onClick={() => setShowPerformanceModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Propostas</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{userPerformance.totalLeads}</div>
                  <div className="text-sm text-blue-600">
                    {userPerformance.convertedLeads} convertidas ({userPerformance.conversionRate}%)
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Oportunidades</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">{userPerformance.totalOpportunities}</div>
                  <div className="text-sm text-green-600">
                    {userPerformance.convertedOpportunities} convertidas ({userPerformance.opportunityConversionRate}%)
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-800">Total Atribuído</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">{userPerformance.totalAssigned}</div>
                  <div className="text-sm text-purple-600">Leads recebidos</div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-orange-800">Última Atividade</span>
                  </div>
                  <div className="text-sm text-orange-900">
                    {userPerformance.lastActivity 
                      ? new Date(userPerformance.lastActivity).toLocaleString('pt-BR')
                      : 'Nunca'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">
                  Atividades Recentes - {selectedUser.name}
                </h3>
                <button 
                  onClick={() => setShowActivityModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {userActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Nenhuma atividade registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'STATUS_CHANGE' ? 'bg-blue-500' :
                        activity.type === 'REASSIGNMENT' ? 'bg-orange-500' :
                        activity.type === 'CONVERSION' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{activity.description}</div>
                        <div className="text-sm text-slate-500 mt-1">
                          {new Date(activity.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Modal */}
      {showReassignModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">
                  Reatribuir Itens - {selectedUser.name}
                </h3>
                <button 
                  onClick={() => setShowReassignModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Reatribuir Para</label>
                  <select 
                    value={reassignmentData.targetUserId}
                    onChange={e => setReassignmentData({...reassignmentData, targetUserId: parseInt(e.target.value)})}
                    className="w-full mt-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value={0}>Selecione um usuário</option>
                    {users.filter(u => u.id !== selectedUser.id && u.role === 'SELLER').map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Motivo</label>
                  <input 
                    value={reassignmentData.reason}
                    onChange={e => setReassignmentData({...reassignmentData, reason: e.target.value})}
                    placeholder="Motivo da reatribuição"
                    className="w-full mt-1 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-2">
                  Itens para reatribuir ({reassignmentData.items.length}):
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded">
                  {reassignmentData.items.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      Nenhum item encontrado para reatribuição
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {reassignmentData.items.map((item, index) => (
                        <div key={index} className="p-3 hover:bg-slate-50">
                          <div className="font-medium text-slate-800">
                            {'status_kanban' in item ? 'Proposta' : 'Oportunidade'}: {item.nome}
                          </div>
                          <div className="text-sm text-slate-500">{item.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeReassignment}
                  disabled={loading || !reassignmentData.targetUserId || reassignmentData.items.length === 0}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
                >
                  {loading ? 'Reatribuindo...' : 'Reatribuir Itens'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SystemModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal({ isOpen: false, type: 'alert', title: '', message: '' })}
      />

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed top-20 left-0 right-0 flex justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-[90%] border-2 border-slate-300">
            <div className="p-4 border-b bg-yellow-50 border-yellow-200">
              <div className="flex items-center space-x-3">
                <Key className="w-6 h-6 text-yellow-600" />
                <h3 className="text-lg font-semibold text-slate-800">Resetar Senha</h3>
              </div>
            </div>
            
            <div className="p-6">
              <label className="text-sm font-medium text-slate-700 block mb-2">Nova Senha</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Digite a nova senha"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
            
            <div className="p-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ userId: 0, newPassword: '' });
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executePasswordReset}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
              >
                Alterar Senha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};