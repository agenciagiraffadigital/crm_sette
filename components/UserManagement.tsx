import React, { useState, useEffect, useRef } from 'react';
import { User, Role, Lead, Opportunity, ActivityLog, AssignmentHistory } from '../types';
import { authService } from '../services/authService';
import { leadService } from '../services/leadService';
import { opportunityService } from '../services/opportunityService';
import { notificationService } from '../services/notificationService';
import { SystemModal } from './SystemModal';
import { Plus, Edit, Trash2, Save, X, Key, Shield, Users, Activity, TrendingUp, AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react';
import { Tooltip as AppTooltip } from './Tooltip';
import { formatDateTime } from '../utils/formatters';
import { InputSwitch } from 'primereact/inputswitch';
import { Dialog } from 'primereact/dialog';
import { SpeedDial } from 'primereact/speeddial';
import { Tooltip } from 'primereact/tooltip';
import { Dropdown } from 'primereact/dropdown';


export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<number, number>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [blockedDeleteUser, setBlockedDeleteUser] = useState<User | null>(null);
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


  const loadUsers = async () => {
    const data = await authService.getAllUsers();
    const counts: Record<number, number> = {};
    await Promise.all(data.map(async u => {
      const leads = await leadService.getLeadsByUser(u.id);
      counts[u.id] = leads.length;
    }));
    setLeadCounts(counts);
    setUsers(data);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleEdit = (user: User) => {
    setCurrentUserData({ ...user, password: '' }); // Don't populate password
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentUserData({ name: '', email: '', role: 'SELLER', password: '' });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const leads = await leadService.getLeadsByUser(id);
    if (leads.length > 0) {
      setBlockedDeleteUser(user);
      return;
    }

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
      const leads = await leadService.getLeadsByUser(user.id);
      setReassignmentData({
        type: 'lead',
        items: leads,
        targetUserId: -1,
        reason: '',
      });
      setShowReassignModal(true);
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Erro',
        message: 'Erro ao carregar leads: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const executeReassignment = async () => {
    if (!selectedUser || reassignmentData.targetUserId === 0) {
      setModal({ isOpen: true, type: 'error', title: 'Erro', message: 'Selecione um vendedor de destino' });
      return;
    }
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('crm_user') || '{}');
      const leads = reassignmentData.items as Lead[];
      const leadIds = leads.map(l => l.id);
      const mode = reassignmentData.targetUserId;

      if (mode === -1) {
        const includeAdminsAuto = (reassignmentData as any).includeAdminsAuto || false;
        const activeSellers = users.filter(u =>
          u.id !== selectedUser.id &&
          (u.role === 'SELLER' ? u.active_for_distribution : includeAdminsAuto)
        );
        if (!activeSellers.length) throw new Error('Nenhum usuário ativo para distribuição');
        await leadService.distributeLeadsRoundRobin(leadIds, activeSellers.map(u => u.id), currentUser);
      } else if (mode === -2 || mode === -3) {
        // Process manualMap first
        const manualMap = (reassignmentData as any).manualMap || {};
        const manualGrouped: Record<number, number[]> = {};
        const manualAllocatedIds = new Set<number>();
        for (const [leadId, sellerId] of Object.entries(manualMap)) {
          if (!(sellerId as number)) continue;
          const lid = parseInt(leadId);
          manualAllocatedIds.add(lid);
          if (!manualGrouped[sellerId as number]) manualGrouped[sellerId as number] = [];
          manualGrouped[sellerId as number].push(lid);
        }
        if (Object.keys(manualGrouped).length) {
          await Promise.all(Object.entries(manualGrouped).map(([sellerId, ids]) =>
            leadService.bulkReassignLeads(ids, parseInt(sellerId), currentUser)
          ));
        }
        // Process qtyMap on remaining leads
        const qtyMap = (reassignmentData as any).qtyMap || {};
        const remainingIds = leadIds.filter(id => !manualAllocatedIds.has(id));
        const entries = Object.entries(qtyMap)
          .map(([id, q]) => ({ id: parseInt(id), qty: Number(q) }))
          .filter(e => e.qty > 0);
        let idx = 0;
        for (const { id: sellerId, qty } of entries) {
          const chunk = remainingIds.slice(idx, idx + qty);
          if (chunk.length) await leadService.bulkReassignLeads(chunk, sellerId, currentUser);
          idx += qty;
        }
      } else {
        await leadService.bulkReassignLeads(leadIds, mode, currentUser);
      }

      const transferredCount = (mode === -2 || mode === -3)
        ? Object.values((reassignmentData as any).manualMap || {}).filter(Boolean).length +
          Object.values((reassignmentData as any).qtyMap || {}).reduce((a: number, b: any) => a + Number(b), 0)
        : leads.length;
      setModal({ isOpen: true, type: 'success', title: 'Sucesso', message: `${transferredCount} leads transferidos com sucesso!` });
      setShowReassignModal(false);
      loadUsers();
    } catch (error: any) {
      setModal({ isOpen: true, type: 'error', title: 'Erro', message: 'Erro na reatribuição: ' + error.message });
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

      <Dialog
        visible={isEditing}
        onHide={() => setIsEditing(false)}
        header={currentUserData.id ? 'Editar Usuário' : 'Novo Usuário'}
        style={{ width: '480px' }}
        modal
        appendTo={document.body}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
            <label className="text-xs font-bold text-slate-500 uppercase">Função</label>
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
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={currentUserData.active_for_distribution !== false}
                onChange={e => setCurrentUserData({...currentUserData, active_for_distribution: e.target.checked})}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Ativo para receber leads automaticamente</span>
            </label>
          )}
          <div className="pt-4 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1">
              <Key className="w-4 h-4" />
              {currentUserData.id ? 'Nova Senha (Opcional)' : 'Definir Senha'}
            </label>
            <input
              type="password"
              placeholder={currentUserData.id ? 'Deixe em branco para não alterar' : 'Digite a senha'}
              value={currentUserData.password || ''}
              onChange={e => setCurrentUserData({...currentUserData, password: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end pt-2 space-x-3">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold">
              {loading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" />Salvar</>}
            </button>
          </div>
        </form>
      </Dialog>

      <>
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-4 py-5 text-xs font-bold text-slate-300 uppercase tracking-wider text-left w-14">ID</th>
                <th className="px-4 py-5 text-xs font-bold text-slate-300 uppercase tracking-wider text-left w-40">Nome</th>
                <th className="px-4 py-5 text-xs font-bold text-slate-300 uppercase tracking-wider text-left w-36">E-mail</th>
                <th className="px-4 py-5 text-xs font-bold text-slate-300 uppercase tracking-wider text-center w-24">Leads</th>
                <th className="px-4 py-5 text-xs font-bold text-slate-300 uppercase tracking-wider text-center w-32">Função</th>
                <th className="px-4 py-5 text-xs font-bold text-slate-300 uppercase tracking-wider text-center w-36">Distribuição</th>
                <th className="px-4 py-5 text-xs font-bold text-slate-300 uppercase tracking-wider text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-400 font-mono">#{user.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[176px] truncate">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-slate-700">{leadCounts[user.id] ?? 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                      {user.role === 'ADMIN' ? 'Admin' : 'Vendedor'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.role === 'SELLER' && (
                      <InputSwitch
                        checked={user.active_for_distribution || false}
                        onChange={() => handleToggleDistribution(user.id, user.active_for_distribution || false)}
                      />
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <Tooltip target=".speeddial-action" />
                    <SpeedDial
                      model={[
                        { label: 'Excluir', icon: 'pi pi-trash', command: () => handleDelete(user.id), className: 'speeddial-action', tooltipOptions: { position: 'top' } },
                        { label: 'Transferir Leads', icon: 'pi pi-arrow-right-arrow-left', command: () => handleReassignItems(user), className: 'speeddial-action', tooltipOptions: { position: 'top' } },
                        { label: 'Resetar Senha', icon: 'pi pi-key', command: () => handleResetPassword(user.id), className: 'speeddial-action', tooltipOptions: { position: 'top' } },
                        { label: 'Editar', icon: 'pi pi-pencil', command: () => handleEdit(user), className: 'speeddial-action', tooltipOptions: { position: 'top' } },
                      ]}
                      direction="left"
                      type="semi-circle"
                      radius={60}
                      showIcon="pi pi-cog"
                      hideIcon="pi pi-times"
                      appendTo={document.body}
                      showTooltip
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Distribuição</span>
                    <InputSwitch
                      checked={user.active_for_distribution || false}
                      onChange={() => handleToggleDistribution(user.id, user.active_for_distribution || false)}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button onClick={() => handleEdit(user)} className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                  <Edit className="w-3.5 h-3.5" /><span>Editar</span>
                </button>
                <button onClick={() => handleResetPassword(user.id)} className="flex-1 px-2 py-1.5 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors flex items-center justify-center gap-1">
                  <Key className="w-3.5 h-3.5" /><span>Senha</span>
                </button>
                                <button onClick={() => handleReassignItems(user)} className="flex-1 px-2 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5" /><span>Transferir</span>
                  </button>
                <AppTooltip text="Excluir usuário" position="top">
                  <button onClick={() => handleDelete(user.id)} className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </AppTooltip>
              </div>
            </div>
          ))}
        </div>
        </>

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
                      ? formatDateTime(userPerformance.lastActivity)
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
                          {formatDateTime(activity.created_at)}
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
      {selectedUser && (() => {
        const mode = reassignmentData.targetUserId;
        const includeAdminsAuto = (reassignmentData as any).includeAdminsAuto || false;
        const includeAdminsQty = (reassignmentData as any).includeAdminsQty || false;
        const includeAdminsManual = (reassignmentData as any).includeAdminsManual || false;
        const sellers = users.filter(u => u.id !== selectedUser.id && (u.role === 'SELLER' || u.role === 'ADMIN'));
        const manualMap = (reassignmentData as any).manualMap || {};
        const manuallyAllocatedIds = new Set(Object.entries(manualMap).filter(([,v]) => v).map(([k]) => parseInt(k)));
        const qtyMap = (reassignmentData as any).qtyMap || {};
        const qtyAllocated = Object.values(qtyMap).reduce((a: number, b: any) => a + Number(b), 0);
        const availableForQty = reassignmentData.items.length - manuallyAllocatedIds.size;
        const tabs = [
          { value: -1, label: 'Automático', icon: <Activity className="w-4 h-4" /> },
          { value: -2, label: 'Por quantidade', icon: <TrendingUp className="w-4 h-4" /> },
          { value: -3, label: 'Manual', icon: <Users className="w-4 h-4" /> },
        ];
        return (
          <Dialog
            visible={showReassignModal}
            onHide={() => setShowReassignModal(false)}
            header={<div><div className="text-lg font-bold text-slate-800">Transferir Leads</div><div className="text-sm text-slate-500 font-normal">{reassignmentData.items.length} leads de {selectedUser.name}</div></div>}
            style={{ width: '560px' }}
            modal
            appendTo={document.body}
          >
          <div className="space-y-5">
                {/* Tabs */}
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  {tabs.map((tab, i) => (
                    <button
                      key={tab.value}
                      onClick={() => setReassignmentData({...reassignmentData, targetUserId: tab.value})}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${
                        i > 0 ? 'border-l border-slate-200' : ''
                      } ${
                        mode === tab.value ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>

                {/* Automático */}
                {mode === -1 && (
                  <div className="space-y-3" style={{height:'260px'}}>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-700">Incluir administradores na distribuição</span>
                      <InputSwitch
                        checked={includeAdminsAuto}
                        onChange={() => setReassignmentData(prev => ({...prev, includeAdminsAuto: !(prev as any).includeAdminsAuto} as any))}
                      />
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 space-y-1">
                      <p className="font-semibold text-slate-800">Distribuição automática igualitária</p>
                      <p>Os {reassignmentData.items.length} leads serão divididos um por um entre os vendedores ativos, na ordem, até acabar a lista.</p>
                    </div>
                  </div>
                )}

                {/* Por quantidade */}
                {mode === -2 && (
                  <div className="space-y-2" style={{height:'260px'}}>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-700">Incluir administradores na distribuição</span>
                      <InputSwitch
                        checked={includeAdminsQty}
                        onChange={() => setReassignmentData(prev => ({...prev, includeAdminsQty: !(prev as any).includeAdminsQty} as any))}
                      />
                    </div>
                    {manuallyAllocatedIds.size > 0 && (
                      <p className="text-xs text-amber-600 px-1">{manuallyAllocatedIds.size} lead(s) já alocado(s) manualmente — disponíveis: {availableForQty}</p>
                    )}
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {sellers.filter(u => includeAdminsQty || u.role === 'SELLER').map(u => {
                        const thisQty = Number((qtyMap as any)[u.id] || 0);
                        const otherQty = qtyAllocated - thisQty;
                        const maxForThis = availableForQty - otherQty;
                        return (
                        <div key={u.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {u.name.substring(0,2).toUpperCase()}
                          </div>
                          <div className="flex-1 text-sm font-medium text-slate-700">{u.name}</div>
                          <input
                            type="number" min={0} max={maxForThis} value={thisQty}
                            onChange={e => {
                              const raw = parseInt(e.target.value) || 0;
                              const qty = Math.min(raw, maxForThis);
                              setReassignmentData(prev => ({...prev, qtyMap: {...(prev as any).qtyMap, [u.id]: qty}} as any));
                            }}
                            className="w-20 p-1.5 border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-400 w-8">leads</span>
                        </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end text-xs text-slate-500 pt-1">
                      Total alocado: <span className="font-bold ml-1 text-slate-800">{qtyAllocated}</span>
                      <span className="mx-1">/</span>{availableForQty}
                    </div>
                  </div>
                )}

                {/* Manual */}
                {mode === -3 && (
                  <div className="space-y-2" style={{height:'260px'}}>
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <span className="text-sm text-slate-700">Incluir administradores na lista</span>
                      <InputSwitch
                        checked={includeAdminsManual}
                        onChange={() => setReassignmentData(prev => ({...prev, includeAdminsManual: !(prev as any).includeAdminsManual} as any))}
                      />
                    </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {reassignmentData.items.map((lead, i) => {
                      const leadId = (lead as Lead).id || i;
                      const allocatedQty = Object.values(qtyMap).reduce((a: number, b: any) => a + Number(b), 0);
                      const qtyLeadIds = (reassignmentData.items as Lead[])
                        .filter(l => !manuallyAllocatedIds.has(l.id))
                        .slice(0, allocatedQty)
                        .map(l => l.id);
                      const reservedByQty = qtyLeadIds.includes(leadId as number);
                      return (
                      <div key={leadId} className={`flex items-center gap-3 p-3 border rounded-lg ${
                        reservedByQty ? 'border-amber-200 bg-amber-50 opacity-60' : 'border-slate-200'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{lead.nome}</p>
                          <p className="text-xs text-slate-400 truncate">{(lead as Lead).email}</p>
                        </div>
                        {reservedByQty ? (
                          <span className="text-xs text-amber-600 w-36 text-right">alocado por quantidade</span>
                        ) : (
                          <Dropdown
                            value={(manualMap as any)[leadId] || 0}
                            onChange={e => setReassignmentData(prev => ({...prev, manualMap: {...(prev as any).manualMap, [leadId]: e.value}} as any))}
                            options={[
                              { label: 'Selecionar', value: 0 },
                              ...sellers.filter(u => includeAdminsManual || u.role === 'SELLER').map(u => ({ label: u.name, value: u.id }))
                            ]}
                            className="w-36 text-xs"
                            pt={{
                              root: { className: 'border border-slate-300 rounded shadow-sm' },
                              input: { className: 'text-xs py-1.5 px-2' },
                              item: { className: 'text-xs py-1.5 px-2' },
                              trigger: { className: 'w-6' },
                            }}
                          />
                        )}
                      </div>
                    );
                    })}
                  </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                  <button onClick={() => setShowReassignModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancelar</button>
                  <button
                    onClick={executeReassignment}
                    disabled={loading || reassignmentData.items.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                  >
                    {loading ? 'Transferindo...' : 'Confirmar transferência'}
                  </button>
                </div>
          </div>
          </Dialog>
        );
      })()}

      {blockedDeleteUser && (
        <SystemModal
          isOpen={true}
          type="error"
          title="Não é possível excluir"
          message={`${blockedDeleteUser.name} possui leads vinculados. Transfira os leads para outro vendedor antes de excluir.`}
          confirmText="Transferir Leads"
          cancelText="Fechar"
          onConfirm={() => {
            const user = blockedDeleteUser;
            setBlockedDeleteUser(null);
            handleReassignItems(user);
          }}
          onCancel={() => setBlockedDeleteUser(null)}
        />
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