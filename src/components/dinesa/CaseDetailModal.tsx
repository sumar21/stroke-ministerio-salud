import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { AcvCase, Hospital } from '../../types';
import { mockHospitals } from '../../data/mockHospitals';
import { X, MapPin, Clock, User, FileText, Phone, CheckCircle2, AlertCircle, Activity, Hospital as HospitalIcon } from 'lucide-react';
import { MapComponent } from '../MapComponent';
import { getRouteToHospital, RouteMetrics } from '../../lib/googleMaps';
import { motion, AnimatePresence } from 'motion/react';

interface CaseDetailModalProps {
  acvCase: AcvCase;
  isOpen: boolean;
  onClose: () => void;
  onAssignHospital: (caseId: string, hospitalId: string) => Promise<boolean>;
  canAssign?: boolean;
}

export function CaseDetailModal({ acvCase, isOpen, onClose, onAssignHospital, canAssign = true }: CaseDetailModalProps) {
  const [hospitalRoutes, setHospitalRoutes] = useState<Record<string, RouteMetrics>>({});
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);
  const [previewHospitalId, setPreviewHospitalId] = useState<string | null>(null);
  const [isAssigningHospitalId, setIsAssigningHospitalId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPreviewHospitalId(null);
      const calculateRoutes = async () => {
        setIsCalculatingRoutes(true);
        const routes: Record<string, RouteMetrics> = {};
        
        try {
          // If assigned, calculate route for assigned hospital
          if (acvCase.status === 'ASSIGNED_EN_ROUTE' && acvCase.assignedHospitalId) {
            const hospital = mockHospitals.find(h => h.id === acvCase.assignedHospitalId);
            if (hospital) {
              const metrics = await getRouteToHospital(acvCase.patient.location, hospital.location);
              routes[hospital.id] = metrics;
            }
          } 
          // If pending or pre-assigned, calculate routes for all hospitals
          else if (acvCase.status === 'PENDING_ASSIGNMENT' || acvCase.status === 'PRE_ASSIGNED') {
            const promises = mockHospitals.map(async (hospital) => {
              try {
                const metrics = await getRouteToHospital(acvCase.patient.location, hospital.location);
                routes[hospital.id] = metrics;
              } catch (e) {
                console.error(`Failed to get route for ${hospital.name}`, e);
              }
            });
            await Promise.all(promises);
          }
          
          setHospitalRoutes(routes);
        } finally {
          setIsCalculatingRoutes(false);
        }
      };
      
      calculateRoutes();
    }
  }, [isOpen, acvCase.id, acvCase.status, acvCase.patient.location, acvCase.assignedHospitalId]);

  const recommendedHospitalId = useMemo(() => {
    if (acvCase.status !== 'PENDING_ASSIGNMENT' && acvCase.status !== 'PRE_ASSIGNED') return null;
    
    let bestId: string | null = null;
    let minDuration = Infinity;
    
    Object.entries(hospitalRoutes).forEach(([id, metrics]) => {
      if (metrics.totalDurationSeconds < minDuration) {
        minDuration = metrics.totalDurationSeconds;
        bestId = id;
      }
    });
    
    return bestId;
  }, [hospitalRoutes, acvCase.status]);

  const sortedHospitals = useMemo(() => {
    return mockHospitals
      .filter(h => h.isStrokeCenter)
      .sort((a, b) => {
        if (a.id === recommendedHospitalId) return -1;
        if (b.id === recommendedHospitalId) return 1;
        
        const metricsA = hospitalRoutes[a.id];
        const metricsB = hospitalRoutes[b.id];
        
        if (metricsA && metricsB) {
          return metricsA.totalDurationSeconds - metricsB.totalDurationSeconds;
        }
        
        return (a.distance || 0) - (b.distance || 0);
      });
  }, [hospitalRoutes, recommendedHospitalId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(1)} km`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-sm border border-red-100">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Detalle de Emergencia</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-xs">
                  {acvCase.id}
                </Badge>
                {acvCase.status === 'PENDING_ASSIGNMENT' ? (
                  <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                    Pendiente de Asignación
                  </Badge>
                ) : acvCase.status === 'PRE_ASSIGNED' ? (
                  <Badge variant="warning" className="bg-amber-100 text-amber-700 border-amber-200">
                    Pre-Asignado
                  </Badge>
                ) : acvCase.status === 'ARRIVED' ? (
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                    Paciente Llegó
                  </Badge>
                ) : (
                  <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    Asignado
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
            <X className="w-6 h-6 text-slate-400" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Info & Map */}
            <div className="lg:col-span-7 space-y-8">
              {/* Map Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Ubicación en Tiempo Real
                </h3>
                <div className="h-[350px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50 relative">
                  <MapComponent 
                    patientLocation={acvCase.patient.location} 
                    hospitals={mockHospitals.filter(h => h.isStrokeCenter)}
                    recommendedHospitalId={previewHospitalId || recommendedHospitalId}
                    assignedHospitalId={acvCase.assignedHospitalId}
                    routes={hospitalRoutes}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Card */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" /> Paciente
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Nombre Completo</p>
                      <p className="font-bold text-slate-900 text-lg">{acvCase.patient.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">DNI</p>
                        <p className="font-bold text-slate-900">{acvCase.patient.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Edad / Sexo</p>
                        <p className="font-bold text-slate-900">{acvCase.patient.age} / {acvCase.patient.sex}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Cobertura</p>
                      <p className="font-bold text-slate-900">OBRA_SOCIAL</p>
                    </div>
                  </div>
                </div>

                {/* Clinical Card */}
                <div className="bg-red-50/30 rounded-3xl p-6 border border-red-100/50">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Cuadro Clínico
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-red-500 font-medium mb-0.5">Inicio de Síntomas</p>
                      <p className="font-black text-red-600 text-2xl">{acvCase.patient.symptomOnsetTime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-500 font-medium mb-2">Síntomas</p>
                      <div className="flex flex-wrap gap-2">
                        {acvCase.patient.symptoms.map((s, i) => (
                          <Badge key={i} variant="outline" className="bg-white text-red-600 border-red-100 text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-red-500 font-medium mb-1">Observaciones</p>
                      <p className="text-sm text-slate-700 italic leading-relaxed">
                        "Paciente hipertenso, refiere haber dejado la medicación hace 1 semana."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hospital Selection */}
            <div className="lg:col-span-5 flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <HospitalIcon className="w-4 h-4" /> Derivación Hospitalaria
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {acvCase.status === 'ARRIVED' ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Paciente Entregado</p>
                        <h4 className="text-xl font-bold text-slate-900">
                          {mockHospitals.find(h => h.id === acvCase.assignedHospitalId)?.name}
                        </h4>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{mockHospitals.find(h => h.id === acvCase.assignedHospitalId)?.location.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-indigo-700 font-bold">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Arribo confirmado: {acvCase.assignedAt ? new Date(acvCase.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recién'}</span>
                      </div>
                    </div>
                  </div>
                ) : acvCase.status === 'ASSIGNED_EN_ROUTE' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Hospital Asignado</p>
                        <h4 className="text-xl font-bold text-slate-900">
                          {mockHospitals.find(h => h.id === acvCase.assignedHospitalId)?.name}
                        </h4>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{mockHospitals.find(h => h.id === acvCase.assignedHospitalId)?.location.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Tiempo estimado: {
                            acvCase.assignedHospitalId && hospitalRoutes[acvCase.assignedHospitalId] 
                              ? `${Math.round(hospitalRoutes[acvCase.assignedHospitalId].totalDurationSeconds / 60)} min`
                              : 'Calculando...'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 mb-4">
                      {canAssign
                        ? 'Seleccione el destino óptimo basado en distancia y capacidad.'
                        : 'Vista de monitoreo: sin acciones de confirmación o reasignación.'}
                    </p>
                    {sortedHospitals.map(hospital => {
                      const isRecommended = hospital.id === recommendedHospitalId;
                      const isPreAssigned = hospital.id === acvCase.preAssignedHospitalId;
                      const metrics = hospitalRoutes[hospital.id];
                      
                      return (
                        <div 
                          key={hospital.id} 
                          onClick={() => setPreviewHospitalId(hospital.id)}
                          className={`
                            bg-white border rounded-2xl p-4 transition-all relative group cursor-pointer
                            ${(previewHospitalId === hospital.id || (!previewHospitalId && isRecommended)) ? 'border-blue-400 shadow-md ring-1 ring-blue-400/20' : 'border-slate-200 hover:border-slate-300'}
                          `}
                        >
                          {isRecommended && (
                            <div className="absolute -top-2.5 left-4">
                              <Badge className="bg-blue-600 text-white border-0 text-[10px] px-2 py-0.5 shadow-sm">
                                RECOMENDADO
                              </Badge>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-900 text-base truncate">{hospital.name}</h4>
                                {hospital.isStrokeCenter && (
                                  <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] px-1.5 py-0">
                                    Stroke Center
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mb-3">
                                <MapPin className="w-3 h-3" /> {hospital.location.address}
                              </p>
                              
                              <div className="flex items-center gap-4">
                                {metrics ? (
                                  <>
                                    <div className="flex items-center gap-1.5 text-sm font-black text-blue-600">
                                      <Clock className="w-4 h-4" />
                                      {formatDuration(metrics.totalDurationSeconds)}
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium">
                                      {formatDistance(metrics.totalDistanceMeters)}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs text-slate-400 italic">
                                    {isCalculatingRoutes ? 'Calculando...' : '~' + hospital.distance + ' km'}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {canAssign && (
                              <Button 
                                size="sm" 
                                variant={isRecommended ? 'primary' : 'outline'}
                                className={`shrink-0 px-6 rounded-xl ${isRecommended ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                disabled={!!isAssigningHospitalId}
                                onClick={async () => {
                                  setIsAssigningHospitalId(hospital.id);
                                  const success = await onAssignHospital(acvCase.id, hospital.id);
                                  setIsAssigningHospitalId(null);

                                  if (success) {
                                    onClose();
                                  } else {
                                    alert('No se pudieron enviar los correos. Verifique e intente nuevamente.');
                                  }
                                }}
                              >
                                {isAssigningHospitalId === hospital.id
                                  ? 'Enviando...'
                                  : isPreAssigned
                                    ? 'Confirmar'
                                    : 'Asignar'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
