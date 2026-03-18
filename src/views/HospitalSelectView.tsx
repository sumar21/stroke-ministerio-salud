import React from 'react';
import { Hospital } from '../types';
import { mockHospitals } from '../data/mockHospitals';
import { LogOut, MapPin, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { images } from '../images';

interface HospitalSelectViewProps {
  onSelect: (hospital: Hospital) => void;
  onLogout: () => void;
}

export function HospitalSelectView({ onSelect, onLogout }: HospitalSelectViewProps) {
  const strokeCenters = mockHospitals.filter(h => h.isStrokeCenter);
  const intermediates = mockHospitals.filter(h => !h.isStrokeCenter);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={images.ministerioSalud}
            alt="Ministerio de Salud"
            className="h-12 object-contain flex-shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-brand-navy font-bold text-base tracking-tight">Ministerio de Salud</span>
            <span className="text-slate-500 text-xs font-medium tracking-wide uppercase">República Argentina</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-500 hover:text-slate-800">
          <LogOut className="w-4 h-4 mr-2" />
          Salir
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Seleccionar Hospital</h1>
          <p className="text-sm text-slate-500 mt-1">Seleccione el hospital desde el cual está operando para continuar.</p>
        </div>

        {/* Stroke Centers */}
        <section className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Centros Stroke</p>
          <div className="space-y-2">
            {strokeCenters.map(h => (
              <button
                key={h.id}
                onClick={() => onSelect(h)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-brand-navy/40 hover:shadow-md hover:shadow-brand-navy/5 transition-all group flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 group-hover:text-brand-navy transition-colors">{h.name}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Centro Stroke
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="truncate">{h.location.address}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-navy transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Intermediate hospitals */}
        {intermediates.length > 0 && (
          <section className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hospitales Intermedios</p>
            <div className="space-y-2">
              {intermediates.map(h => {
                const parent = mockHospitals.find(p => p.id === h.strokeCenterId);
                return (
                  <button
                    key={h.id}
                    onClick={() => onSelect(h)}
                    className="w-full text-left bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-400 hover:shadow-md transition-all group flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">{h.name}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100">
                          <XCircle className="w-2.5 h-2.5" /> Intermedio
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="truncate">{h.location.address}</span>
                      </div>
                      {parent && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Centro Stroke de referencia: <span className="font-semibold text-slate-500">{parent.name}</span>
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
