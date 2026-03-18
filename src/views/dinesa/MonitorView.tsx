import React, { useState, useMemo } from 'react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { AcvCase } from '../../types';
import { Monitor, Clock, MapPin, Activity, CheckCircle2, Eye, Building2, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CaseDetailModal } from '../../components/dinesa/CaseDetailModal';

interface MonitorViewProps {
  cases: AcvCase[];
  onAssignHospital: (caseId: string, hospitalId: string) => Promise<boolean>;
  onCancelCase?: (caseId: string, observation: string) => void;
  canAssign?: boolean;
  showAllHospitals?: boolean;
}

export function MonitorView({ cases, onAssignHospital, onCancelCase, canAssign = true, showAllHospitals = false }: MonitorViewProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [openInAssignMode, setOpenInAssignMode] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancelCaseId, setCancelCaseId] = useState<string | null>(null);
  const [cancelObs, setCancelObs] = useState('');
  const activeCases = useMemo(() => cases.filter(c => ['PENDING_ASSIGNMENT', 'PRE_ASSIGNED', 'ASSIGNED_EN_ROUTE', 'REASSIGNED', 'ARRIVED'].includes(c.status)), [cases]);
  const allDisplayCases = useMemo(() => [...activeCases, ...cases.filter(c => c.status === 'CANCELLED')], [activeCases, cases]);

  const selectedCase = useMemo(() => allDisplayCases.find(c => c.id === selectedCaseId), [allDisplayCases, selectedCaseId]);

  const openDetail = (id: string) => { setOpenInAssignMode(false); setSelectedCaseId(id); };
  const openAssign = (id: string) => { setOpenInAssignMode(true); setSelectedCaseId(id); };

  const handleApprove = async (acvCase: AcvCase) => {
    const hospitalId = acvCase.preAssignedHospitalId;
    if (!hospitalId) {
      // No pre-assigned hospital — open manual assignment modal
      openAssign(acvCase.id);
      return;
    }
    setApprovingId(acvCase.id);
    await onAssignHospital(acvCase.id, hospitalId);
    setApprovingId(null);
  };

  const handleReject = (caseId: string) => {
    setCancelObs('');
    setCancelCaseId(caseId);
  };

  const handleConfirmCancel = () => {
    if (!cancelCaseId || !cancelObs.trim()) return;
    onCancelCase?.(cancelCaseId, cancelObs.trim());
    setCancelCaseId(null);
    setCancelObs('');
  };

  return (
    <div className="flex-1 max-w-[1600px] mx-auto w-full p-4 md:p-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Monitor de Stroke</h2>
          <p className="text-slate-500 mt-1">Gestión y derivación de pacientes con Código ACV activo.</p>
        </div>
        <span className="bg-brand-navy/10 text-brand-navy border border-brand-navy/20 text-sm font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
          {activeCases.length} Activos
        </span>
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
            {allDisplayCases.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-20 text-center text-slate-500"
              >
                <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-xl font-bold text-slate-900">No hay casos stroke activos</p>
                <p className="mt-2">Todos los casos han sido derivados o resueltos.</p>
              </motion.div>
            ) : (
              allDisplayCases.map((acvCase) => (
                <motion.div
                  key={acvCase.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex flex-col md:grid md:grid-cols-12 gap-4 p-5 items-start md:items-center transition-all group ${acvCase.status === 'CANCELLED' ? 'opacity-50 bg-slate-50/30' : 'hover:bg-slate-50/50'}`}
                >
                  {/* Status - Mobile: Top row */}
                  <div className="col-span-2 flex justify-between w-full md:w-auto items-center">
                    {acvCase.status === 'CANCELLED' ? (
                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                        Cancelado
                      </Badge>
                    ) : (acvCase.status === 'PENDING_ASSIGNMENT' || acvCase.status === 'PRE_ASSIGNED') ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                        Pendiente
                      </Badge>
                    ) : acvCase.status === 'ARRIVED' ? (
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></span>
                        Llegó
                      </Badge>
                    ) : acvCase.status === 'REASSIGNED' ? (
                      <Badge variant="warning" className="bg-orange-50 text-orange-600 border-orange-100 font-bold px-3 py-1">
                        <span className="w-2 h-2 rounded-full bg-orange-600 mr-2"></span>
                        Reasignado
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
                  <div className="col-span-1 flex justify-end items-center gap-1 w-full md:w-auto pt-2 md:pt-0 border-t border-slate-50 md:border-0">
                    {acvCase.status === 'CANCELLED' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Ver detalle"
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        onClick={() => openDetail(acvCase.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : canAssign && (acvCase.status === 'PENDING_ASSIGNMENT' || acvCase.status === 'PRE_ASSIGNED') ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Aprobar"
                          disabled={approvingId === acvCase.id}
                          className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                          onClick={() => handleApprove(acvCase)}
                        >
                          {approvingId === acvCase.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Check className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Rechazar"
                          className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleReject(acvCase.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Ver detalle"
                          className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          onClick={() => openDetail(acvCase.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canAssign && acvCase.status !== 'ARRIVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Asignar / Reasignar hospital"
                            className="h-8 w-8 p-0 rounded-lg text-brand-navy hover:text-brand-navy hover:bg-brand-navy/10"
                            onClick={() => openAssign(acvCase.id)}
                          >
                            <Building2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reject / Cancel dialog */}
      <AnimatePresence>
        {cancelCaseId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Rechazar caso</h3>
                  <p className="text-sm text-slate-500">Se notificará a la ambulancia.</p>
                </div>
              </div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo de rechazo <span className="text-red-500">*</span></label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none h-28 focus-visible:outline-none focus-visible:border-brand-blue focus-visible:ring-1 focus-visible:ring-brand-blue"
                placeholder="Describa el motivo del rechazo..."
                value={cancelObs}
                onChange={e => setCancelObs(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="ghost" onClick={() => { setCancelCaseId(null); setCancelObs(''); }}>Volver</Button>
                <Button
                  variant="destructive"
                  disabled={!cancelObs.trim()}
                  onClick={handleConfirmCancel}
                >
                  Confirmar rechazo
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          acvCase={selectedCase}
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onAssignHospital={onAssignHospital}
          onCancelCase={onCancelCase}
          canAssign={canAssign}
          showAllHospitals={showAllHospitals}
          openInAssignMode={openInAssignMode}
        />
      )}
    </div>
  );
}
