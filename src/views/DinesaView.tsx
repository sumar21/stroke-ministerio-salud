import React, { useState } from 'react';
import { Button } from '../components/Button';
import { AcvCase, Hospital as HospitalType } from '../types';
import { Monitor, LogOut, LayoutDashboard, Settings, Hospital, Users, Radio, ChevronDown, ChevronRight, Menu, ArrowLeftRight } from 'lucide-react';
import { images } from '../images';
import { MonitorView } from './dinesa/MonitorView';
import { DashboardView } from './dinesa/DashboardView';
import { HospitalsView } from './dinesa/HospitalsView';
import { UsersView } from './dinesa/UsersView';
import { OperativeCentersView } from './dinesa/OperativeCentersView';

interface DinesaViewProps {
  mode?: 'COORDINATION' | 'DINESA' | 'ADMIN';
  onLogout: () => void;
  cases: AcvCase[];
  onAssignHospital: (caseId: string, hospitalId: string) => Promise<boolean>;
  onCancelCase?: (caseId: string, observation: string) => void;
  selectedHospital?: HospitalType;
  onChangeHospital?: () => void;
}

type ViewState = 'MONITOR' | 'DASHBOARD' | 'HOSPITALS' | 'USERS' | 'OPERATIVE_CENTERS';

export function DinesaView({ mode = 'COORDINATION', onLogout, cases, onAssignHospital, onCancelCase, selectedHospital, onChangeHospital }: DinesaViewProps) {
  const isAdminMode = mode === 'ADMIN';
  const isMonitorOnlyMode = mode === 'DINESA';
  const isCoordinationMode = mode === 'COORDINATION';
  const canReassign = isCoordinationMode ? (selectedHospital?.isStrokeCenter ?? false) : true;
  const [currentView, setCurrentView] = useState<ViewState>(isAdminMode ? 'HOSPITALS' : 'MONITOR');
  const [isConfigOpen, setIsConfigOpen] = useState(isAdminMode);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


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
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={images.ministerioSalud}
              alt="Ministerio de Salud"
              className="h-12 object-contain flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-brand-navy font-bold text-sm tracking-tight">Ministerio de Salud</span>
              <span className="text-slate-500 text-[10px] font-medium tracking-wide uppercase">República Argentina</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="md:hidden p-1" onClick={() => setIsMobileMenuOpen(false)}>
            <Menu className="w-5 h-5 text-slate-600" />
          </Button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 px-2 text-slate-800">
            <Monitor className="w-5 h-5 text-brand-navy shrink-0" />
            <h1 className="font-bold text-base tracking-tight">
              {isAdminMode ? 'Administrador' : isMonitorOnlyMode ? 'DINESA' : isCoordinationMode ? 'Hospital' : 'DINESA'}
            </h1>
          </div>

          {isCoordinationMode && selectedHospital && (
            <div className="mb-6 px-2">
              <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-3 space-y-2">
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{selectedHospital.name}</p>
                  {selectedHospital.isStrokeCenter ? (
                    <span className="inline-block mt-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Centro Stroke</span>
                  ) : (
                    <span className="inline-block mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Intermedio</span>
                  )}
                </div>
                {onChangeHospital && (
                  <button
                    onClick={onChangeHospital}
                    className="flex items-center gap-1.5 text-xs text-brand-navy font-semibold hover:underline"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    Cambiar hospital
                  </button>
                )}
              </div>
            </div>
          )}

          {!isAdminMode ? (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Menú Principal</p>
              <nav className="space-y-1 mb-8">
                <button 
                  onClick={() => handleNavClick('MONITOR')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'MONITOR' ? 'bg-brand-navy/10 text-brand-navy' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Monitor className="w-5 h-5" />
                  Monitor de Stroke
                </button>
                {isMonitorOnlyMode && (
                  <button 
                    onClick={() => handleNavClick('DASHBOARD')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'DASHBOARD' ? 'bg-brand-navy/10 text-brand-navy' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                  </button>
                )}
              </nav>
            </>
          ) : (
            <>
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
                  <div className="pl-9 pr-3 py-1 space-y-1">
                    <button
                      onClick={() => handleNavClick('HOSPITALS')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${currentView === 'HOSPITALS' ? 'text-brand-navy bg-brand-navy/10 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                      <Hospital className="w-4 h-4 shrink-0" />
                      Hospitales
                    </button>
                    <button
                      onClick={() => handleNavClick('USERS')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${currentView === 'USERS' ? 'text-brand-navy bg-brand-navy/10 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      Usuarios
                    </button>
                    <button
                      onClick={() => handleNavClick('OPERATIVE_CENTERS')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${currentView === 'OPERATIVE_CENTERS' ? 'text-brand-navy bg-brand-navy/10 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                    >
                      <Radio className="w-4 h-4 shrink-0" />
                      Centros Operativos
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
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
            <Monitor className="w-5 h-5 text-brand-navy" />
            <h1 className="font-bold text-lg tracking-tight">
              {isAdminMode ? 'Administrador' : isMonitorOnlyMode ? 'DINESA' : 'Coordinación'}
            </h1>
          </div>
        </div>

        {!isAdminMode && currentView === 'MONITOR' && (
          <MonitorView
            cases={cases}
            onAssignHospital={onAssignHospital}
            onCancelCase={onCancelCase}
            canAssign={canReassign}
            showAllHospitals={canReassign}
          />
        )}
        {!isAdminMode && isMonitorOnlyMode && currentView === 'DASHBOARD' && <DashboardView cases={cases} />}
        {isAdminMode && currentView === 'HOSPITALS' && <HospitalsView />}
        {isAdminMode && currentView === 'USERS' && <UsersView />}
        {isAdminMode && currentView === 'OPERATIVE_CENTERS' && <OperativeCentersView />}
      </main>
    </div>
  );
}
