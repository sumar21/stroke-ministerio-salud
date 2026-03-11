import React, { useState, useMemo } from 'react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { AcvCase } from '../../types';
import { Monitor, Clock, MapPin, ChevronRight, Activity, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CaseDetailModal } from '../../components/dinesa/CaseDetailModal';

interface MonitorViewProps {
  cases: AcvCase[];
  onAssignHospital: (caseId: string, hospitalId: string) => void;
}

export function MonitorView({ cases, onAssignHospital }: MonitorViewProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const activeCases = useMemo(() => cases.filter(c => c.status === 'PENDING_ASSIGNMENT' || c.status === 'PRE_ASSIGNED' || c.status === 'ASSIGNED_EN_ROUTE' || c.status === 'ARRIVED'), [cases]);
  
  const selectedCase = useMemo(() => activeCases.find(c => c.id === selectedCaseId), [activeCases, selectedCaseId]);

  return (
    <div className="flex-1 max-w-[1600px] mx-auto w-full p-4 md:p-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Monitor de Emergencias</h2>
          <p className="text-slate-500 mt-1">Gestión y derivación de pacientes con Código ACV activo.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header - Hidden on Mobile */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-5 border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <div className="col-span-2">Estado</div>
          <div className="col-span-2">ID Caso</div>
          <div className="col-span-3">Paciente</div>
          <div className="col-span-2">Inicio Síntomas</div>
          <div className="col-span-2">Ubicación</div>
          <div className="col-span-1 text-right">Acción</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100">
          <AnimatePresence mode="popLayout">
            {activeCases.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-20 text-center text-slate-500"
              >
                <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-xl font-bold text-slate-900">No hay emergencias activas</p>
                <p className="mt-2">Todos los casos han sido derivados o resueltos.</p>
              </motion.div>
            ) : (
              activeCases.map((acvCase) => (
                <motion.div 
                  key={acvCase.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col md:grid md:grid-cols-12 gap-4 p-5 items-start md:items-center transition-all hover:bg-slate-50/50 group"
                >
                  {/* Status - Mobile: Top row */}
                  <div className="col-span-2 flex justify-between w-full md:w-auto items-center">
                    {acvCase.status === 'PENDING_ASSIGNMENT' ? (
                      <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
                        Pendiente
                      </Badge>
                    ) : acvCase.status === 'PRE_ASSIGNED' ? (
                      <Badge variant="warning" className="bg-amber-50 text-amber-600 border-amber-100 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-amber-600 mr-2 animate-pulse"></span>
                        Pre Asignado
                      </Badge>
                    ) : acvCase.status === 'ARRIVED' ? (
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></span>
                        Llegó
                      </Badge>
                    ) : (
                      <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 mr-2"></span>
                        Asignado
                      </Badge>
                    )}
                    <div className="md:hidden font-mono text-xs font-bold text-slate-400">
                      {acvCase.id}
                    </div>
                  </div>

                  {/* ID - Desktop only */}
                  <div className="hidden md:block col-span-2 font-mono text-sm font-bold text-slate-400">
                    {acvCase.id}
                  </div>

                  {/* Patient */}
                  <div className="col-span-3 w-full">
                    <p className="font-bold text-slate-900 text-base">{acvCase.patient.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{acvCase.patient.age} años • {acvCase.patient.sex}</p>
                  </div>

                  {/* Symptom Time */}
                  <div className="col-span-2 flex items-center text-sm font-bold text-slate-600">
                    <Clock className="w-4 h-4 mr-2 text-slate-300" />
                    <span className="md:hidden text-xs text-slate-400 mr-1 font-normal uppercase tracking-wider">Inicio:</span>
                    {acvCase.patient.symptomOnsetTime}
                  </div>

                  {/* Location */}
                  <div className="col-span-2 flex items-center text-sm font-medium text-slate-500 w-full">
                    <MapPin className="w-4 h-4 mr-2 text-slate-300 shrink-0" />
                    <span className="truncate">{acvCase.patient.location.address}</span>
                  </div>

                  {/* Action */}
                  <div className="col-span-1 flex justify-end w-full md:w-auto pt-2 md:pt-0 border-t border-slate-50 md:border-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-bold group-hover:translate-x-1 transition-transform w-full md:w-auto justify-center md:justify-end"
                      onClick={() => setSelectedCaseId(acvCase.id)}
                    >
                      Ver Detalle <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCase && (
        <CaseDetailModal 
          acvCase={selectedCase}
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onAssignHospital={onAssignHospital}
        />
      )}
    </div>
  );
}
