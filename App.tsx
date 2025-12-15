import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { SimulationPanel } from './components/SimulationPanel';
import { LeadForm } from './components/LeadForm';
import { UserManagement } from './components/UserManagement';
import { Auth } from './components/Auth';
import { leadService } from './services/leadService';
import { authService } from './services/authService';
import { Lead, KanbanStatus, User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('kanban');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Check for existing session
  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setInitializing(false);
  }, []);

  // Fetch leads when user changes or is set
  const loadLeads = useCallback(async () => {
      if (!user) return;
      setLoadingData(true);
      try {
        const data = await leadService.getLeads(user);
        setLeads(data);
      } catch (error) {
        console.error("Failed to fetch leads", error);
      } finally {
        setLoadingData(false);
      }
  }, [user]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveTab('kanban');
  };

  const handleLogout = () => {
    authService.logout();
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

  const handleNewLeadFromSimulation = useCallback((newLead: Lead) => {
    if (user?.role === 'ADMIN' || newLead.vendedor_id === user?.id) {
        setLeads(prev => [newLead, ...prev]);
        setTimeout(() => setActiveTab('kanban'), 500);
    }
  }, [user]);

  const handleSaveLead = useCallback((updatedLead: Lead) => {
      setLeads(current => current.map(l => l.id === updatedLead.id ? updatedLead : l));
      setSelectedLeadId(null); // Return to board after save
  }, []);

  if (initializing) {
    return <div className="h-screen w-full bg-slate-100" />;
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (selectedLeadId) {
      return (
          <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
              <LeadForm 
                leadId={selectedLeadId} 
                currentUser={user} 
                onBack={() => setSelectedLeadId(null)} 
                onSave={handleSaveLead} 
              />
          </Layout>
      );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
      {activeTab === 'dashboard' && <Dashboard leads={leads} />}
      
      {activeTab === 'kanban' && (
        <KanbanBoard 
            leads={leads} 
            onMoveLead={handleMoveLead} 
            user={user} 
            onLeadClick={(l) => setSelectedLeadId(l.id)} 
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