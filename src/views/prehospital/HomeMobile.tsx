import React from 'react';
import { Button } from '../../components/Button';
import { Activity, LogOut, Ambulance, MapPin, Clock, Phone, Hourglass, XCircle, X } from 'lucide-react';
import { AcvCase } from '../../types';
import { images } from '../../images';

const BEFAST_LABELS: Record<string, string> = {
  equilibrio: 'Pérdida de equilibrio',
  vision:     'Alteración visual',
  cara:       'Asimetría facial',
  brazos:     'Debilidad en brazo',
  habla:      'Dificultad para hablar',
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING_ASSIGNMENT: { label: 'Pendiente',   color: 'bg-amber-100 text-amber-700' },
  PRE_ASSIGNED:       { label: 'Pendiente',    color: 'bg-amber-100 text-amber-700' },
  ASSIGNED_EN_ROUTE:  { label: 'Asignado',    color: 'bg-emerald-100 text-emerald-700' },
  REASSIGNED:         { label: 'Reasignado',  color: 'bg-orange-100 text-orange-700' },
  ARRIVED:            { label: 'Llegó',        color: 'bg-indigo-100 text-indigo-700' },
  RECEIVED:           { label: 'Recibido',     color: 'bg-slate-100 text-slate-700' },
  DRAFT:              { label: 'Borrador',     color: 'bg-slate-100 text-slate-500' },
  CANCELLED:          { label: 'Cancelado',    color: 'bg-red-100 text-red-700' },
};

interface HomeMobileProps {
  onLogout: () => void;
  onNewCase: () => void;
  onSelectCase: (caseId: string) => void;
  activeCase: AcvCase | null;
  onDismissCase?: () => void;
}

export function HomeMobile({ onLogout, onNewCase, onSelectCase, activeCase, onDismissCase }: HomeMobileProps) {
  const isCancelled = activeCase?.status === 'CANCELLED';
  const hasActiveCase = activeCase !== null && !isCancelled;
  const positiveSymptoms = activeCase
    ? activeCase.patient.symptoms.filter(s => !s.endsWith(':no'))
    : [];
  const statusInfo = activeCase
    ? (STATUS_MAP[activeCase.status] ?? { label: activeCase.status, color: 'bg-slate-100 text-slate-700' })
    : null;

  const p = activeCase?.patient;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={images.ministerioSalud} alt="Ministerio de Salud" className="h-10 object-contain flex-shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-brand-navy font-bold text-sm tracking-tight">Ministerio de Salud</span>
              <span className="text-slate-500 text-[10px] font-medium tracking-wide uppercase">República Argentina</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prehospitalario</h1>
          <p className="text-sm text-slate-500 mt-0.5">Unidad móvil / Ambulancia</p>
        </div>

        {/* New protocol card */}
        <div className={`bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-4 transition-opacity ${hasActiveCase ? 'opacity-50' : ''}`}>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Nuevo Código ACV</h2>
            <p className="text-sm text-slate-500">
              {hasActiveCase ? 'Finalice el caso activo para iniciar uno nuevo' : 'Activar protocolo de emergencia'}
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            className="whitespace-nowrap shadow-md shadow-brand-navy/20 font-bold"
            onClick={onNewCase}
            disabled={hasActiveCase}
          >
            <Activity className="w-4 h-4 mr-2" />
            INICIAR
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Caso en curso</h3>

          {activeCase === null ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed gap-3">
              <Ambulance className="w-9 h-9 opacity-35" />
              <div className="text-center">
                <p className="font-semibold text-slate-500">Sin caso en curso</p>
                <p className="text-sm mt-0.5">Presione INICIAR para activar un nuevo protocolo.</p>
              </div>
            </div>
          ) : (
            <div
              onClick={isCancelled ? undefined : () => onSelectCase(activeCase!.id)}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isCancelled ? 'border-red-200 cursor-default' : 'border-slate-200 hover:shadow-md cursor-pointer active:scale-[0.98]'}`}
            >
              {/* Header row */}
              <div className="flex justify-between items-center px-4 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">#{activeCase!.id}</span>
                  {statusInfo && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {new Date(activeCase!.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isCancelled && onDismissCase && (
                    <button
                      onClick={e => { e.stopPropagation(); onDismissCase(); }}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Descartar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Patient identity */}
              <div className="px-4 pb-3 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-xl leading-tight">{p!.name || 'Paciente Desconocido'}</h4>
                <p className="text-sm text-slate-500 mt-0.5">
                  {p!.age !== '' ? `${p!.age} años` : '—'}
                  {p!.sex ? ` · ${p!.sex === 'M' ? 'Masculino' : p!.sex === 'F' ? 'Femenino' : 'Otro'}` : ''}
                  {p!.id ? ` · DNI ${p!.id}` : ''}
                  {p!.hasCoverage != null ? ` · Cobertura: ${p!.hasCoverage ? 'Sí' : 'No'}` : ''}
                </p>
              </div>

              {/* Status banners */}
              {activeCase!.status === 'PENDING_ASSIGNMENT' && (
                <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <Hourglass className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                  <p className="text-xs font-semibold text-amber-700">Esperando aprobación y asignación de hospital</p>
                </div>
              )}
              {isCancelled && (
                <div className="mx-4 mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-700">Caso rechazado</p>
                    {activeCase!.cancellationObservation && (
                      <p className="text-xs text-red-600 mt-0.5">{activeCase!.cancellationObservation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-700">{p!.location.address}</span>
                </div>

                {p!.symptomOnsetTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700">
                      Inicio de síntomas: <span className="font-semibold">{p!.symptomOnsetTime}</span>
                    </span>
                  </div>
                )}

                {p!.contactInfo && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700">{p!.contactInfo}</span>
                  </div>
                )}

                {positiveSymptoms.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">BE-FAST Positivos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {positiveSymptoms.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-semibold">
                          {BEFAST_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(p!.systolicBP || p!.glucemia || p!.heartRate) && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Parámetros Clínicos</p>
                    <div className="flex flex-wrap gap-2">
                      {(p!.systolicBP && p!.diastolicBP) && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          TA {p!.systolicBP}/{p!.diastolicBP} mmHg
                        </span>
                      )}
                      {p!.glucemia && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          Gluc. {p!.glucemia} mg/dL
                        </span>
                      )}
                      {p!.heartRate && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          FC {p!.heartRate} lpm
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
