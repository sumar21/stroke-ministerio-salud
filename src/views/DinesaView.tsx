import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { AcvCase, Hospital } from '../types';
import { mockHospitals } from '../data/mockHospitals';
import { Monitor, AlertCircle, MapPin, Clock, CheckCircle2, LogOut, Activity, ChevronRight, X, User, Phone, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapComponent } from '../components/MapComponent';
import { images } from '../images';
import { getRouteToHospital, RouteMetrics } from '../lib/googleMaps';

interface DinesaViewProps {
  onLogout: () => void;
  cases: AcvCase[];
  onAssignHospital: (caseId: string, hospitalId: string) => void;
}

export function DinesaView({ onLogout, cases, onAssignHospital }: DinesaViewProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [hospitalRoutes, setHospitalRoutes] = useState<Record<string, RouteMetrics>>({});
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState(false);

  const activeCases = cases.filter(c => c.status === 'PENDING_ASSIGNMENT' || c.status === 'ASSIGNED_EN_ROUTE');
  const selectedCase = activeCases.find(c => c.id === selectedCaseId);

  useEffect(() => {
    if (selectedCase && selectedCase.status === 'PENDING_ASSIGNMENT') {
      const calculateRoutes = async () => {
        setIsCalculatingRoutes(true);
        const routes: Record<string, RouteMetrics> = {};
        
        try {
          const promises = mockHospitals.map(async (hospital) => {
            if (hospital.isStrokeCenter) {
              try {
                const metrics = await getRouteToHospital(selectedCase.patient.location, hospital.location);
                routes[hospital.id] = metrics;
              } catch (e) {
                console.error(`Failed to get route for ${hospital.name}`, e);
              }
            }
          });
          
          await Promise.all(promises);
          setHospitalRoutes(routes);
        } finally {
          setIsCalculatingRoutes(false);
        }
      };
      
      calculateRoutes();
    } else if (selectedCase && selectedCase.status === 'ASSIGNED_EN_ROUTE' && selectedCase.assignedHospitalId) {
      const calculateAssignedRoute = async () => {
        const hospital = mockHospitals.find(h => h.id === selectedCase.assignedHospitalId);
        if (hospital) {
          try {
            const metrics = await getRouteToHospital(selectedCase.patient.location, hospital.location);
            setHospitalRoutes({ [hospital.id]: metrics });
          } catch (e) {
            console.error(`Failed to get route for assigned hospital`, e);
          }
        }
      };
      calculateAssignedRoute();
    } else {
      setHospitalRoutes({});
    }
  }, [selectedCase?.id, selectedCase?.status, selectedCase?.assignedHospitalId]);

  const recommendedHospitalId = useMemo(() => {
    if (!selectedCase || selectedCase.status !== 'PENDING_ASSIGNMENT') return null;
    
    let bestId: string | null = null;
    let minDuration = Infinity;
    
    Object.entries(hospitalRoutes).forEach(([id, metrics]) => {
      if (metrics.totalDurationSeconds < minDuration) {
        minDuration = metrics.totalDurationSeconds;
        bestId = id;
      }
    });
    
    return bestId;
  }, [hospitalRoutes, selectedCase]);

  const sortedHospitals = useMemo(() => {
    return [...mockHospitals].sort((a, b) => {
      // 1. Recommended first
      if (a.id === recommendedHospitalId) return -1;
      if (b.id === recommendedHospitalId) return 1;

      // 2. Stroke centers first
      if (a.isStrokeCenter && !b.isStrokeCenter) return -1;
      if (!a.isStrokeCenter && b.isStrokeCenter) return 1;
      
      // 3. If both have metrics, sort by duration
      const metricsA = hospitalRoutes[a.id];
      const metricsB = hospitalRoutes[b.id];
      
      if (metricsA && metricsB) {
        return metricsA.totalDurationSeconds - metricsB.totalDurationSeconds;
      }
      
      // 4. Fallback to mock distance
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src={images.ministerioSalud} alt="Ministerio de Salud" className="h-10 object-contain" referrerPolicy="no-referrer" />
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-2 text-slate-800">
            <Monitor className="w-5 h-5 text-red-600" />
            <h1 className="font-bold text-lg tracking-tight">Central DINESA</h1>
          </div>
          <Badge variant="secondary" className="ml-2 bg-red-50 text-red-700 border-red-100">
            {activeCases.length} Activos
          </Badge>
        </div>
        <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </header>

      {/* Main Content - Data Grid */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Monitor de Emergencias</h2>
            <p className="text-slate-500 mt-1">Gestión y derivación de pacientes con Código ACV activo.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4 pl-6">Estado</th>
                  <th className="p-4">ID Caso</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Inicio Síntomas</th>
                  <th className="p-4">Ubicación</th>
                  <th className="p-4 text-right pr-6">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-slate-200 mb-3" />
                        <p className="text-lg font-medium text-slate-600">No hay emergencias activas</p>
                        <p className="text-sm">Los nuevos casos aparecerán aquí automáticamente.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeCases.map((c) => (
                    <tr 
                      key={c.id} 
                      className={`group transition-colors hover:bg-slate-50 cursor-pointer ${selectedCaseId === c.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-2">
                          {c.status === 'PENDING_ASSIGNMENT' ? (
                            <>
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Pendiente</Badge>
                            </>
                          ) : (
                            <>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Asignado</Badge>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm font-medium text-slate-700">{c.id}</td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">{c.patient.name || 'N.N.'}</p>
                        <p className="text-xs text-slate-500">{c.patient.age || '?'} años • {c.patient.sex || '?'}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{c.patient.symptomOnsetTime || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-600 max-w-[250px]">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate" title={c.patient.location.address}>{c.patient.location.address}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          Ver Detalle <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Slide-over Modal for Details */}
      <AnimatePresence>
        {selectedCase && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCaseId(null)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%', boxShadow: '-20px 0 40px rgba(0,0,0,0)' }}
              animate={{ x: 0, boxShadow: '-20px 0 40px rgba(0,0,0,0.1)' }}
              exit={{ x: '100%', boxShadow: '-20px 0 40px rgba(0,0,0,0)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white z-50 flex flex-col shadow-2xl border-l border-slate-200"
            >
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedCase.status === 'PENDING_ASSIGNMENT' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {selectedCase.status === 'PENDING_ASSIGNMENT' ? <Activity className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Detalle de Emergencia</h2>
                    <p className="text-sm font-mono text-slate-500">{selectedCase.id}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedCaseId(null)} className="rounded-full hover:bg-slate-200">
                  <X className="w-5 h-5 text-slate-500" />
                </Button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                
                {/* Map Section */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" /> Ubicación y Ruta
                  </h3>
                  <div className="h-[300px] w-full rounded-xl overflow-hidden bg-slate-100 relative">
                    <MapComponent 
                      patientLocation={selectedCase.patient.location} 
                      hospitals={mockHospitals}
                      assignedHospitalId={selectedCase.assignedHospitalId}
                      recommendedHospitalId={recommendedHospitalId}
                      routes={hospitalRoutes}
                    />
                  </div>
                </div>

                {/* Patient Info Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" /> Datos del Paciente
                    </h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Nombre Completo</p>
                        <p className="font-semibold text-slate-900">{selectedCase.patient.name || 'N.N.'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">DNI</p>
                          <p className="font-medium text-slate-900">{selectedCase.patient.id || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Edad / Sexo</p>
                          <p className="font-medium text-slate-900">{selectedCase.patient.age || '?'} / {selectedCase.patient.sex || '?'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Cobertura Médica</p>
                        <p className="font-medium text-slate-900">{selectedCase.patient.coverage || 'No especificada'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" /> Cuadro Clínico
                    </h3>
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3">
                      <div>
                        <p className="text-xs text-red-500/80 mb-0.5">Inicio de Síntomas</p>
                        <p className="font-bold text-red-700 text-lg">{selectedCase.patient.symptomOnsetTime || 'Desconocido'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-red-500/80 mb-1.5">Síntomas Detectados</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCase.patient.symptoms.map(s => (
                            <Badge key={s} variant="secondary" className="bg-white text-red-700 border border-red-200 text-[10px] py-0">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {selectedCase.patient.clinicalObservations && (
                        <div>
                          <p className="text-xs text-red-500/80 mb-0.5">Observaciones</p>
                          <p className="text-sm text-slate-700 italic">"{selectedCase.patient.clinicalObservations}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assignment Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" /> Derivación Hospitalaria
                  </h3>
                  
                  {selectedCase.status === 'ASSIGNED_EN_ROUTE' ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900 text-lg">
                          {mockHospitals.find(h => h.id === selectedCase.assignedHospitalId)?.name}
                        </h4>
                        <p className="text-emerald-700 text-sm mt-1">
                          Ambulancia notificada y en camino. Preadmisión hospitalaria completada.
                        </p>
                        {hospitalRoutes[selectedCase.assignedHospitalId!] && (
                          <p className="text-emerald-800 font-medium mt-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> ETA: {formatDuration(hospitalRoutes[selectedCase.assignedHospitalId!].totalDurationSeconds)}
                            <span className="text-emerald-300">|</span>
                            <span>{formatDistance(hospitalRoutes[selectedCase.assignedHospitalId!].totalDistanceMeters)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {sortedHospitals.map(hospital => {
                        const isRecommended = hospital.id === recommendedHospitalId;
                        const metrics = hospitalRoutes[hospital.id];
                        
                        return (
                          <div key={hospital.id} className={`p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors ${isRecommended ? 'ring-2 ring-blue-500 m-0.5 rounded-lg' : ''}`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{hospital.name}</span>
                                {hospital.isStrokeCenter && (
                                  <Badge variant="success" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">Centro Stroke</Badge>
                                )}
                                {isRecommended && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200">Recomendado</Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {hospital.location.address}
                              </p>
                              {metrics ? (
                                <p className="text-sm font-medium text-slate-700 flex items-center gap-2 mt-1">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" /> ETA: {formatDuration(metrics.totalDurationSeconds)}
                                  <span className="text-slate-300">|</span>
                                  <span>{formatDistance(metrics.totalDistanceMeters)}</span>
                                </p>
                              ) : isCalculatingRoutes && hospital.isStrokeCenter ? (
                                <p className="text-sm text-slate-400 animate-pulse mt-1">Calculando ruta...</p>
                              ) : (
                                <p className="text-sm text-slate-400 mt-1">Aprox. {hospital.distance} km (Línea recta)</p>
                              )}
                            </div>
                            <Button 
                              variant={isRecommended ? 'default' : hospital.isStrokeCenter ? 'outline' : 'ghost'}
                              className={isRecommended ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' : hospital.isStrokeCenter ? 'border-blue-200 text-blue-700 hover:bg-blue-50' : 'text-slate-400'}
                              onClick={() => {
                                onAssignHospital(selectedCase.id, hospital.id);
                              }}
                              disabled={!hospital.isStrokeCenter}
                            >
                              Asignar Destino
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
