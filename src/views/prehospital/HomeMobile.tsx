import React from 'react';
import { Button } from '../../components/Button';
import { Activity, LogOut, Ambulance } from 'lucide-react';
import { AcvCase } from '../../types';

interface HomeMobileProps {
  onLogout: () => void;
  onNewCase: () => void;
  onSelectCase: (caseId: string) => void;
  cases: AcvCase[];
}

export function HomeMobile({ onLogout, onNewCase, onSelectCase, cases }: HomeMobileProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Ambulance className="w-6 h-6 text-red-600" />
            <h1 className="font-bold text-lg text-slate-900">Prehospitalario</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-6">
        {/* Smaller card for new protocol */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
            <div>
                <h2 className="font-bold text-slate-900 text-lg">Nuevo Código ACV</h2>
                <p className="text-sm text-slate-500">Activar protocolo de emergencia</p>
            </div>
            <Button 
              variant="danger" 
              size="default" 
              className="whitespace-nowrap shadow-md shadow-red-500/20 font-bold"
              onClick={onNewCase}
            >
              <Activity className="w-4 h-4 mr-2" />
              INICIAR
            </Button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Casos Recientes</h3>
          <div className="space-y-3">
            {cases.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                <p>No hay casos registrados hoy.</p>
              </div>
            ) : (
              cases.slice().reverse().map((c) => (
                <div 
                  key={c.id}
                  onClick={() => onSelectCase(c.id)}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">#{c.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        c.status === 'PENDING_ASSIGNMENT' ? 'bg-amber-100 text-amber-700' : 
                        c.status === 'PRE_ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'ARRIVED' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {c.status === 'PENDING_ASSIGNMENT' ? 'Pendiente' : 
                         c.status === 'PRE_ASSIGNED' ? 'Pre Asignado' :
                         c.status === 'ARRIVED' ? 'Llegó' :
                         'Asignado'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg mb-1">{c.patient.name || 'Paciente Desconocido'}</h4>
                  <p className="text-sm text-slate-500 line-clamp-1">{c.patient.location.address}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
