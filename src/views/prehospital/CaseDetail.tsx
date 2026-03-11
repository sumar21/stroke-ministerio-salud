import React from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { AcvCase } from '../../types';
import { CheckCircle2, Clock, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

import { mockHospitals } from '../../data/mockHospitals';

interface CaseDetailProps {
    caseData: AcvCase;
    onBack: () => void;
    onArrive?: (caseId: string) => void;
}

export function CaseDetail({ caseData, onBack, onArrive }: CaseDetailProps) {
    const assignedHospital = caseData.assignedHospitalId 
        ? mockHospitals.find(h => h.id === caseData.assignedHospitalId)
        : null;

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-slate-50 pb-24"
      >
        <header className="bg-white border-b border-slate-200 text-slate-900 p-4 sticky top-0 z-10 shadow-sm">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                ← Volver
              </Button>
              <h1 className="font-bold text-lg">Detalle del Caso</h1>
            </div>
            <div className="flex items-center gap-2">
               <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                 caseData.status === 'PENDING_ASSIGNMENT' ? 'bg-amber-100 text-amber-700' : 
                 caseData.status === 'PRE_ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                 caseData.status === 'ARRIVED' ? 'bg-indigo-100 text-indigo-700' :
                 'bg-emerald-100 text-emerald-700'
               }`}>
                 {caseData.status === 'PENDING_ASSIGNMENT' ? 'PENDIENTE' : 
                  caseData.status === 'PRE_ASSIGNED' ? 'PRE ASIGNADO' :
                  caseData.status === 'ARRIVED' ? 'LLEGÓ' :
                  'ASIGNADO'}
               </span>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-3xl mx-auto mt-4 space-y-6">
          {/* Status Card */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <Card className={`border-l-4 ${
              caseData.status === 'PENDING_ASSIGNMENT' ? 'border-l-amber-500' : 
              caseData.status === 'PRE_ASSIGNED' ? 'border-l-blue-500' :
              caseData.status === 'ARRIVED' ? 'border-l-indigo-500' :
              'border-l-emerald-500'
            }`}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  {caseData.status === 'PENDING_ASSIGNMENT' ? (
                    <>
                      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center animate-pulse">
                        <Clock className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Esperando Asignación</h2>
                        <p className="text-slate-600 mt-1">
                          El caso ha sido notificado a la central. Aguarde confirmación del hospital de destino.
                        </p>
                      </div>
                    </>
                  ) : caseData.status === 'PRE_ASSIGNED' ? (
                    <>
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
                        <Clock className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Pre Asignado</h2>
                        <p className="text-slate-600 mt-1">
                          El sistema ha sugerido un destino. Aguardando confirmación final de DINESA.
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left w-full space-y-4">
                          <div>
                            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Destino Sugerido</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                              {caseData.preAssignedHospitalId 
                                ? mockHospitals.find(h => h.id === caseData.preAssignedHospitalId)?.name 
                                : 'Calculando...'}
                            </p>
                          </div>
                          
                          <div className="pt-3 border-t border-slate-200 space-y-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origen (Ubicación del Evento)</p>
                                <p className="text-sm text-slate-700 font-medium leading-tight mt-0.5">{caseData.patient.location.address}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destino (Hospital)</p>
                                <p className="text-sm text-slate-700 font-medium leading-tight mt-0.5">
                                  {caseData.preAssignedHospitalId 
                                    ? mockHospitals.find(h => h.id === caseData.preAssignedHospitalId)?.location.address 
                                    : 'Calculando...'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {caseData.etaText && (
                            <div className="pt-2">
                              <p className="text-sm font-bold text-blue-700 bg-blue-100 py-1.5 px-3 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                                <Clock className="w-4 h-4" />
                                ETA Estimado: {caseData.etaText}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : caseData.status === 'ARRIVED' ? (
                    <>
                      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Paciente Entregado</h2>
                        <p className="text-slate-600 mt-1">
                          Se ha confirmado la llegada al hospital. El caso está siendo procesado por el centro médico.
                        </p>
                        <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-left w-full">
                           <p className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                             <Clock className="w-4 h-4" />
                             Llegada: {caseData.assignedAt ? new Date(caseData.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recién'}
                           </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Hospital Asignado</h2>
                        <p className="text-slate-600 mt-1">
                          Diríjase inmediatamente al centro asignado.
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left w-full space-y-4">
                          <div>
                            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Destino</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                              {assignedHospital ? assignedHospital.name : caseData.assignedHospitalId}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-200 space-y-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origen (Ubicación del Evento)</p>
                                <p className="text-sm text-slate-700 font-medium leading-tight mt-0.5">{caseData.patient.location.address}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destino (Hospital)</p>
                                <p className="text-sm text-slate-700 font-medium leading-tight mt-0.5">
                                  {assignedHospital ? assignedHospital.location.address : 'Calculando...'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {caseData.status === 'ASSIGNED_EN_ROUTE' && onArrive && (
                          <div className="pt-4 mt-4 border-t border-slate-200">
                            <Button 
                              variant="danger" 
                              className="w-full py-6 text-lg font-bold uppercase tracking-widest shadow-lg shadow-red-500/20"
                              onClick={() => onArrive(caseData.id)}
                            >
                              ¡Llegué al Hospital!
                            </Button>
                            <p className="text-[10px] text-center text-slate-400 mt-2 uppercase font-bold tracking-tighter">
                              Presione este botón al momento exacto de ingresar al hospital
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Patient Summary */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-slate-500 uppercase tracking-wider">Información del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nombre</p>
                  <p className="font-medium">{caseData.patient.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">DNI</p>
                  <p className="font-medium">{caseData.patient.id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Edad / Sexo</p>
                  <p className="font-medium">{caseData.patient.age} / {caseData.patient.sex}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Inicio Síntomas</p>
                  <p className="font-medium">{caseData.patient.symptomOnsetTime}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">Síntomas</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {caseData.patient.symptoms.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                   <p className="text-sm text-slate-500">Ubicación del Evento</p>
                   <p className="font-medium text-sm">{caseData.patient.location.address}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </motion.div>
    );
}
