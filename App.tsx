import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { EnhancedDashboard } from './components/dashboard/EnhancedDashboard';
import { OpportunitiesBoard } from './components/OpportunitiesBoard';
import { ProposalsBoard } from './components/ProposalsBoard';
import { SimulationPanel } from './components/SimulationPanel';
import { ModernLeadForm } from './components/ModernLeadForm';
import { UserManagement } from './components/UserManagement';
import { Auth } from './components/Auth';
import { leadService } from './services/leadService';
import { opportunityService } from './services/opportunityService';
import { authService } from './services/authService';
import { Lead, Opportunity, OpportunityStatus, KanbanStatus, User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('opportunities'); // Changed default to opportunities
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [opportunityFilters, setOpportunityFilters] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Check for existing session and setup auth listener
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        setInitializing(false);
      } catch (error) {
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
    setActiveTab('opportunities'); // Changed default to opportunities
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
    console.log('handleMoveLead called with', id, newStatus);
    if (!user) return;
    
    // Optimistic UI Update
    setLeads(current => 
      current.map(l => l.id === id ? { ...l, status_kanban: newStatus } : l)
    );

    try {
      await leadService.updateLeadStatus(id, newStatus);
      console.log('Status updated successfully');
    } catch (error) {
      console.error("Failed to update status", error);
      loadLeads(); // Revert
    }
  }, [user, loadLeads]);

  const handleMoveOpportunity = useCallback(async (id: number, newStatus: OpportunityStatus, additionalData?: { quoted_value?: number }) => {
    if (!user) return;
    
    // Optimistic UI Update - update immediately
    setOpportunities(current => 
      current.map(o => o.id === id ? { 
        ...o, 
        status: newStatus,
        quoted_value: additionalData?.quoted_value || o.quoted_value
      } : o)
    );
    
    try {
      await opportunityService.updateOpportunityStatus(id, newStatus, user, additionalData);
    } catch (error) {
      console.error("Failed to update opportunity status", error);
      // Revert optimistic update on error
      const updatedOpportunities = await opportunityService.getOpportunities(user);
      setOpportunities(updatedOpportunities);
      throw error;
    }
  }, [user]);

  const handleNewLeadFromSimulation = useCallback((newLead: Lead) => {
    if (user?.role === 'ADMIN' || newLead.vendedor_id === user?.id) {
        setLeads(prev => [newLead, ...prev]);
        setTimeout(() => setActiveTab('opportunities'), 500); // Changed to opportunities
    }
  }, [user]);

  const handleSaveLead = useCallback((updatedLead: Lead) => {
      setLeads(current => current.map(l => l.id === updatedLead.id ? updatedLead : l));
      setSelectedLeadId(null); // Return to board after save
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedLeadId(null); // Clear selected lead when changing tabs
  };

  if (initializing) {
    return (
      <div className="h-screen w-full bg-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (selectedLeadId) {
      return (
          <Layout activeTab={activeTab} setActiveTab={handleTabChange} user={user} onLogout={handleLogout}>
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
            setSelectedLeadId(opportunity.id);
          }}
          filters={opportunityFilters}
          onFiltersChange={setOpportunityFilters}
          currentUser={user}
        />
      )}
      
      {activeTab === 'kanban' && (
        <ProposalsBoard 
            proposals={leads} 
            onMoveProposal={handleMoveLead} 
            user={user} 
            onProposalClick={(l) => setSelectedLeadId(l.id)} 
        />
      )}
      
      {activeTab === 'users' && user.role === 'ADMIN' && (
         <UserManagement />
      )}

      {activeTab === 'simulation' && user.role === 'ADMIN' && (
        <SimulationPanel onNewLead={handleNewLeadFromSimulation} />
      )}
    </Layout>
  );
}

export default App;