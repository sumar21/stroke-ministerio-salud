import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { AcvCase } from '../types';
import { Monitor, LogOut, LayoutDashboard, Settings, Hospital, Users, ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { images } from '../images';
import { MonitorView } from './dinesa/MonitorView';
import { DashboardView } from './dinesa/DashboardView';
import { HospitalsView } from './dinesa/HospitalsView';
import { UsersView } from './dinesa/UsersView';

interface DinesaViewProps {
  onLogout: () => void;
  cases: AcvCase[];
  onAssignHospital: (caseId: string, hospitalId: string) => void;
}

type ViewState = 'MONITOR' | 'DASHBOARD' | 'HOSPITALS' | 'USERS';

export function DinesaView({ onLogout, cases, onAssignHospital }: DinesaViewProps) {
  const [currentView, setCurrentView] = useState<ViewState>('MONITOR');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeCasesCount = cases.filter(c => ['PENDING_ASSIGNMENT', 'PRE_ASSIGNED', 'ASSIGNED_EN_ROUTE'].includes(c.status)).length;

  const handleNavClick = (view: ViewState) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        absolute md:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <img src={images.ministerioSalud} alt="Ministerio de Salud" className="h-10 object-contain" referrerPolicy="no-referrer" />
          <Button variant="ghost" size="sm" className="md:hidden p-1" onClick={() => setIsMobileMenuOpen(false)}>
            <Menu className="w-5 h-5 text-slate-600" />
          </Button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2 text-slate-800">
              <Monitor className="w-5 h-5 text-red-600" />
              <h1 className="font-bold text-lg tracking-tight">Central DINESA</h1>
            </div>
            <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-100 text-xs px-1.5 py-0.5">
              {activeCasesCount} Activos
            </Badge>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Menú Principal</p>
          <nav className="space-y-1 mb-8">
            <button 
              onClick={() => handleNavClick('MONITOR')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'MONITOR' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Monitor className="w-5 h-5" />
              Monitor de Emergencias
            </button>
            <button 
              onClick={() => handleNavClick('DASHBOARD')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'DASHBOARD' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
          </nav>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Administración</p>
          <div className="space-y-1">
            <button 
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                Configuración
              </div>
              {isConfigOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {isConfigOpen && (
              <div className="pl-11 pr-3 py-1 space-y-1">
                <button 
                  onClick={() => handleNavClick('HOSPITALS')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${currentView === 'HOSPITALS' ? 'text-red-700 bg-red-50 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  <Hospital className="w-4 h-4" />
                  Hospitales
                </button>
                <button 
                  onClick={() => handleNavClick('USERS')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${currentView === 'USERS' ? 'text-red-700 bg-red-50 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                  <Users className="w-4 h-4" />
                  Usuarios
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100" onClick={onLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            Salir
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col relative">
        {/* Mobile Header (only visible on small screens when sidebar is hidden) */}
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-1 -ml-2" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6 text-slate-600" />
          </Button>
          <div className="flex items-center gap-2 text-slate-800">
            <Monitor className="w-5 h-5 text-red-600" />
            <h1 className="font-bold text-lg tracking-tight">DINESA</h1>
          </div>
        </div>

        {currentView === 'MONITOR' && <MonitorView cases={cases} onAssignHospital={onAssignHospital} />}
        {currentView === 'DASHBOARD' && <DashboardView cases={cases} />}
        {currentView === 'HOSPITALS' && <HospitalsView />}
        {currentView === 'USERS' && <UsersView />}
      </main>
    </div>
  );
}
