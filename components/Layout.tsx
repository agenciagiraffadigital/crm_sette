import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, KanbanSquare, Menu, X, Activity, LogOut, Users, Target, ChevronDown, XCircle, Building2 } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
  fullWidth?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout, fullWidth = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
        activeTab === id 
          ? 'bg-slate-800 text-white' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20">
            {/* Logo */}
            <button
              onClick={() => setActiveTab(user.role === 'ADMIN' ? 'dashboard' : 'opportunities')}
              className="flex items-center space-x-2 sm:space-x-3 mr-4 sm:mr-8 hover:opacity-80 transition-opacity"
            >
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-[21px] font-bold text-white">Sette CRM</h1>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2 ml-auto mr-4">
              {user.role === 'ADMIN' && (
                <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
              )}
              <NavItem id="opportunities" icon={Target} label="Oportunidades" />
              <NavItem id="kanban" icon={KanbanSquare} label="Propostas" />
              <NavItem id="lost" icon={XCircle} label="Perdidas" />
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-2 sm:space-x-4 ml-auto md:ml-0">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs sm:text-sm font-bold text-white">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                  <ChevronDown className="hidden sm:block w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}" />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {user.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
                      </p>
                    </div>
                    {user.role === 'ADMIN' && (
                      <>
                        <button
                          onClick={() => {
                            setActiveTab('users');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-start space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          <span>Usuários</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('operadoras');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-start space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Operadoras</span>
                        </button>
                        <div className="border-t border-slate-200 my-2"></div>
                      </>
                    )}
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center justify-start space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                )}
              </div>

              <Tooltip text={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} position="bottom">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-300"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 space-y-2 border-t border-slate-800">
              {user.role === 'ADMIN' && (
                <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
              )}
              <NavItem id="opportunities" icon={Target} label="Oportunidades" />
              <NavItem id="kanban" icon={KanbanSquare} label="Propostas" />
              <NavItem id="lost" icon={XCircle} label="Perdidas" />
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${fullWidth ? '' : 'p-4 md:p-8'}`}>
        {fullWidth ? (
          children
        ) : (
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};