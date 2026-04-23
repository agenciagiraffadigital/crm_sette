import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EnhancedDashboard } from './components/dashboard/EnhancedDashboard';
import { OpportunitiesBoard } from './components/OpportunitiesBoard';
import { ProposalsBoard } from './components/ProposalsBoard';
import { SimulationPanel } from './components/SimulationPanel';
import { ModernLeadForm } from './components/ModernLeadForm';
import { UserManagement } from './components/UserManagement';
import { LostOpportunities } from './components/LostOpportunities';
import { OperadorasManagement } from './components/OperadorasManagement';
import { Auth } from './components/Auth';
import { ErrorToast } from './components/ErrorToast';
import { LostDialog } from './components/LostDialog';
import { leadService } from './services/leadService';
import { opportunityService } from './services/opportunityService';
import { authService } from './services/authService';
import { Lead, Opportunity, OpportunityStatus, KanbanStatus, User } from './types';
import { FilterState, defaultFilters } from './components/SearchAndFilters';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'opportunities');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunityFilters, setOpportunityFilters] = useState({});
  const [opportunitySearchFilters, setOpportunitySearchFilters] = useState<FilterState>(defaultFilters);
  const [proposalSearchFilters, setProposalSearchFilters] = useState<FilterState>(defaultFilters);
  const [lostSearchFilters, setLostSearchFilters] = useState<FilterState>(defaultFilters);
  const [loadingData, setLoadingData] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [showNewOpportunityForm, setShowNewOpportunityForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const [lostDialogVisible, setLostDialogVisible] = useState(false);
  const [selectedLostLead, setSelectedLostLead] = useState<Lead | null>(null);

  // Auto-hide success toast
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // Auto-hide error toast
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  // Check for existing session and setup auth listener
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const stored = localStorage.getItem('crm_user');
        if (stored && mounted) {
          setUser(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Init auth error:', error);
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    initAuth();

    // Setup auth state listener
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (mounted) {
        setUser(user);
        if (!user) {
          setSelectedLeadId(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch leads and opportunities when user changes or is set
  const loadLeads = useCallback(async () => {
      if (!user) return;
      setLoadingData(true);
      try {
        const [leadsData, opportunitiesData] = await Promise.all([
          leadService.getLeads(user),
          opportunityService.getOpportunities(user)
        ]);
        setLeads(leadsData);
        setOpportunities(opportunitiesData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoadingData(false);
      }
  }, [user]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'SELLER') {
      setActiveTab('opportunities');
      localStorage.setItem('activeTab', 'opportunities');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setSelectedLeadId(null);
  };

  const handleMoveLead = useCallback(async (id: number, newStatus: KanbanStatus) => {
    if (!user) return;
    try {
      await leadService.updateLeadStatus(id, newStatus, user);
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      await loadLeads();
    }
  }, [user, loadLeads]);

  const handleMoveOpportunity = useCallback(async (id: number, newStatus: OpportunityStatus, additionalData?: { quoted_value?: number }) => {
    if (!user) return;
    
    try {
      await opportunityService.updateOpportunityStatus(id, newStatus, user, additionalData);
      await loadLeads();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorMessage('Erro ao atualizar status: ' + errorMessage);
      setShowError(true);
    }
  }, [user, loadLeads]);

  const handleLeadLost = useCallback((lead: Lead) => {
    setSelectedLostLead(lead);
    setLostDialogVisible(true);
  }, []);

  const handleConfirmLost = useCallback(async (data: {
    motivo: string;
    detalhes?: string;
    followup: boolean;
    followupData?: string;
    followupStatus?: string;
  }) => {
    if (!selectedLostLead || !user) return;

    try {
      await leadService.markAsLost(selectedLostLead.id, data, user);
      setLostDialogVisible(false);
      setSelectedLostLead(null);
      await loadLeads();
      setSuccessMessage('Lead marcado como perdido com sucesso!');
      setShowSuccess(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorMessage('Erro ao marcar lead como perdido: ' + errorMessage);
      setShowError(true);
    }
  }, [selectedLostLead, user, loadLeads]);

  const handleNewLeadFromSimulation = useCallback((newLead: Lead) => {
    if (user?.role === 'ADMIN' || newLead.vendedor_id === user?.id) {
        setLeads(prev => [newLead, ...prev]);
        setTimeout(() => setActiveTab('opportunities'), 500); // Changed to opportunities
    }
  }, [user]);

  const handleSaveLead = useCallback(async (updatedLead: Lead) => {
      setLeads(current => current.map(l => l.id === updatedLead.id ? updatedLead : l));
      setSelectedLeadId(null); // Return to board after save
      // Board components reload their own data on mount, no need to call loadLeads here
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
    setSelectedLeadId(null); // Clear selected lead when changing tabs
    setShowNewOpportunityForm(false); // Clear new opportunity form when changing tabs
    
    // Recarregar dados ao mudar de aba
    if (tab === 'opportunities' || tab === 'kanban' || tab === 'lost') {
      loadLeads();
    }
  };

  if (initializing) {
    return (
      <div className="h-screen w-full bg-slate-100 flex items-center justify-center">
        <img src="/loading.gif" alt="Carregando..." className="w-64 h-64" />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (selectedLeadId) {
      return (
          <Layout activeTab={activeTab} setActiveTab={handleTabChange} user={user} onLogout={handleLogout} fullWidth>
              <ModernLeadForm 
                leadId={selectedLeadId} 
                currentUser={user} 
                onBack={() => setSelectedLeadId(null)} 
                onSave={handleSaveLead} 
              />
          </Layout>
      );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange} user={user} onLogout={handleLogout}>
      {activeTab === 'dashboard' && (
        user.role === 'ADMIN' ? (
          <EnhancedDashboard currentUser={user} />
        ) : (
          <Dashboard leads={leads} currentUser={user} />
        )
      )}
      
      {activeTab === 'opportunities' && (
        <OpportunitiesBoard
          opportunities={opportunities}
          onMoveOpportunity={handleMoveOpportunity}
          onOpenOpportunity={(opportunity) => {
            if (opportunity.status === 'OPORTUNIDADES' || opportunity.status === 'EM_CONTATO' || opportunity.status === 'NEGOCIACAO') {
              setSelectedLeadId(opportunity.id);
            }
          }}
          filters={opportunityFilters}
          onFiltersChange={setOpportunityFilters}
          currentUser={user}
          onDataChange={loadLeads}
          showNewOpportunityForm={showNewOpportunityForm}
          onShowNewOpportunityForm={setShowNewOpportunityForm}
          searchFilters={opportunitySearchFilters}
          onSearchFiltersChange={setOpportunitySearchFilters}
        />
      )}
      
      {activeTab === 'kanban' && (
        <ProposalsBoard
            onMoveProposal={handleMoveLead}
            user={user}
            onProposalClick={(l) => setSelectedLeadId(l.id)}
            onProposalLost={handleLeadLost}
            searchFilters={proposalSearchFilters}
            onSearchFiltersChange={setProposalSearchFilters}
        />
      )}
      
      {activeTab === 'lost' && (
        <LostOpportunities
          currentUser={user}
          searchFilters={lostSearchFilters}
          onSearchFiltersChange={setLostSearchFilters}
        />
      )}
      
      {activeTab === 'users' && user.role === 'ADMIN' && (
         <UserManagement />
      )}

      {activeTab === 'operadoras' && user.role === 'ADMIN' && (
        <OperadorasManagement />
      )}

      {activeTab === 'simulation' && user.role === 'ADMIN' && (
        <SimulationPanel onNewLead={handleNewLeadFromSimulation} />
      )}
      
      <ErrorToast 
        message={errorMessage}
        isVisible={showError}
        onClose={() => setShowError(false)}
      />

      <LostDialog
        visible={lostDialogVisible}
        onHide={() => {
          setLostDialogVisible(false);
          setSelectedLostLead(null);
        }}
        onConfirm={handleConfirmLost}
      />
    </Layout>
  );
}

export default App;