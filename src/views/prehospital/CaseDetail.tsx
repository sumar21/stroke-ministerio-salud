import React from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { AcvCase, RecentPregnancy } from '../../types';
import { CheckCircle2, Clock, MapPin, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { mockHospitals } from '../../data/mockHospitals';
import { jsPDF } from 'jspdf';
import { images } from '../../images';

const BEFAST_QUESTIONS = [
  { id: 'equilibrio', label: '¿Sufrió una pérdida repentina del equilibrio o mareo intenso?' },
  { id: 'vision',     label: '¿Perdió la visión en un ojo o ve doble/borroso de repente?' },
  { id: 'cara',       label: '¿Un lado de la cara está caído o no se mueve?' },
  { id: 'brazos',     label: '¿Uno de los brazos se cae o no puede subirlo?' },
  { id: 'habla',      label: '¿Arrastra las palabras o suena extraño?' },
];

const PREGNANCY_LABEL: Record<RecentPregnancy, string> = {
  en_curso: 'En curso',
  '3_meses': '3 meses',
  '6_meses': '6 meses',
};

async function getImageDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no canvas ctx')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function generatePatientPDF(caseData: AcvCase) {
  const doc = new jsPDF();
  const p = caseData.patient;

  const MARGIN = 16;
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const BOTTOM_MARGIN = 20;
  let y = MARGIN;

  const checkPageBreak = (needed = 16) => {
    if (y + needed > PAGE_H - BOTTOM_MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const yStep = (n = 1) => { y += n; };

  const line = (label: string, value: string | number | undefined | null, unit = '') => {
    if (value == null || value === '') return;
    checkPageBreak(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), MARGIN, y);
    yStep(5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`${value}${unit ? ' ' + unit : ''}`, MARGIN, y);
    yStep(8);
  };

  const sectionHeader = (n: number, title: string) => {
    checkPageBreak(20);
    yStep(4);
    doc.setFillColor(15, 23, 64);
    doc.roundedRect(MARGIN, y - 4, PAGE_W - MARGIN * 2, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${n}.  ${title.toUpperCase()}`, MARGIN + 3, y + 1);
    yStep(12);
    doc.setTextColor(30, 30, 30);
  };

  // Logo + header
  try {
    const logoDataUrl = await getImageDataUrl(images.ministerioSalud);
    const logoSize = 18;
    doc.addImage(logoDataUrl, 'PNG', MARGIN, y - 2, logoSize, logoSize);
    const textX = MARGIN + logoSize + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 64);
    doc.text('Ministerio de Salud', textX, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('REPÚBLICA ARGENTINA', textX, y + 10);
    yStep(logoSize + 2);
  } catch {
    // If logo fails, skip it gracefully
    yStep(4);
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  yStep(6);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 64);
  doc.text('Registro de Caso ACV', MARGIN, y);
  yStep(6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Caso #${caseData.id}  ·  ${new Date(caseData.createdAt).toLocaleString('es-AR')}`, MARGIN, y);
  yStep(10);
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  yStep(8);

  // Módulo 1
  sectionHeader(1, 'Datos del Paciente');
  line('DNI', p.id);
  line('Nombre completo', p.name);
  line('Edad', p.age !== '' ? p.age : undefined, 'años');
  line('Sexo', p.sex === 'M' ? 'Masculino' : p.sex === 'F' ? 'Femenino' : p.sex === 'X' ? 'Otro' : undefined);
  line('Cobertura médica', p.hasCoverage == null ? undefined : p.hasCoverage ? 'Sí' : 'No');

  // Módulo 2
  sectionHeader(2, 'Parámetros Clínicos');
  if (p.systolicBP && p.diastolicBP) line('Tensión Arterial', `${p.systolicBP}/${p.diastolicBP}`, 'mmHg');
  line('Medicación antihipertensiva', p.bloodPressureMeds == null ? undefined : p.bloodPressureMeds ? 'Sí' : 'No');
  line('Glucemia', p.glucemia, 'mg/dL');
  line('Temperatura', p.temperature, '°C');
  line('Frecuencia cardíaca', p.heartRate, 'lpm');
  line('Pulso', p.pulseRegular == null ? undefined : p.pulseRegular ? 'Regular' : 'Irregular');
  line('Embarazo reciente', p.recentPregnancy == null ? 'No' : PREGNANCY_LABEL[p.recentPregnancy]);
  line('ACV previo', p.priorStroke == null ? undefined : p.priorStroke ? 'Sí' : 'No');
  line('Traumatismo craneal reciente', p.recentCranialTrauma == null ? undefined : p.recentCranialTrauma ? 'Sí' : 'No');

  // Módulo 3
  sectionHeader(3, 'Síntomas BE-FAST');
  BEFAST_QUESTIONS.forEach(q => {
    const isYes = p.symptoms.includes(q.id);
    line(q.label, isYes ? 'Sí' : 'No');
  });
  line('Inicio de síntomas', p.symptomOnsetTime);
  line('Información de contacto', p.contactInfo);
  if (p.clinicalObservations) {
    const wrapped = doc.splitTextToSize(p.clinicalObservations, PAGE_W - MARGIN * 2);
    checkPageBreak(13 + wrapped.length * 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('OBSERVACIONES CLÍNICAS', MARGIN, y);
    yStep(5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 5 + 3;
  }
  line('Ubicación del evento', p.location.address);

  doc.save(`caso-acv-${caseData.id}.pdf`);
}

interface CaseDetailProps {
  caseData: AcvCase;
  onBack: () => void;
  onArrive?: (caseId: string) => void;
}

// ── Read-only field helpers ──────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{children}</p>
  );
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-slate-800">{children || <span className="text-slate-300 font-normal">—</span>}</p>
  );
}

function ReadOnlyToggle({ value, trueLabel = 'Sí', falseLabel = 'No' }: { value: boolean | null | undefined; trueLabel?: string; falseLabel?: string }) {
  if (value == null) return <span className="text-sm text-slate-300">—</span>;
  return (
    <span className={`inline-block px-3 py-0.5 rounded-lg text-xs font-bold border ${
      value
        ? 'bg-brand-navy text-white border-brand-navy'
        : 'bg-slate-100 text-slate-600 border-slate-200'
    }`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-6 h-6 rounded-full bg-brand-navy text-white text-xs font-black flex items-center justify-center shrink-0">{n}</div>
      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">{children}</h3>
    </div>
  );
}

export function CaseDetail({ caseData, onBack, onArrive }: CaseDetailProps) {
  const isPending = caseData.status === 'PENDING_ASSIGNMENT' || caseData.status === 'PRE_ASSIGNED';

  const assignedHospital = caseData.assignedHospitalId
    ? mockHospitals.find(h => h.id === caseData.assignedHospitalId)
    : null;

  const p = caseData.patient;

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
              isPending ? 'bg-amber-100 text-amber-700' :
              caseData.status === 'ARRIVED' ? 'bg-indigo-100 text-indigo-700' :
              caseData.status === 'REASSIGNED' ? 'bg-orange-100 text-orange-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {isPending ? 'PENDIENTE' :
               caseData.status === 'ARRIVED' ? 'LLEGÓ' :
               caseData.status === 'REASSIGNED' ? 'REASIGNADO' :
               'ASIGNADO'}
            </span>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto mt-4 space-y-6">
        {/* Status Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className={`border-l-4 ${
            isPending ? 'border-l-amber-500' :
            caseData.status === 'ARRIVED' ? 'border-l-indigo-500' :
            caseData.status === 'REASSIGNED' ? 'border-l-orange-500' :
            'border-l-emerald-500'
          }`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-4">
                {isPending ? (
                  <>
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div className="w-full">
                      <h2 className="text-xl font-bold text-slate-900">
                        {caseData.preAssignedHospitalId ? 'Destino Sugerido' : 'Esperando Asignación'}
                      </h2>
                      <p className="text-slate-600 mt-1">
                        {caseData.preAssignedHospitalId
                          ? 'El sistema ha sugerido un destino. Aguardando confirmación del Centro Stroke.'
                          : 'El caso ha sido notificado a la central. Aguarde confirmación del hospital de destino.'}
                      </p>
                      {caseData.preAssignedHospitalId && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left w-full space-y-4">
                          <div>
                            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Destino Sugerido</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                              {mockHospitals.find(h => h.id === caseData.preAssignedHospitalId)?.name ?? 'Calculando...'}
                            </p>
                          </div>
                          <div className="pt-3 border-t border-slate-200 space-y-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-brand-navy mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origen (Ubicación del Evento)</p>
                                <p className="text-sm text-slate-700 font-medium leading-tight mt-0.5">{p.location.address}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-brand-blue mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destino (Hospital)</p>
                                <p className="text-sm text-slate-700 font-medium leading-tight mt-0.5">
                                  {mockHospitals.find(h => h.id === caseData.preAssignedHospitalId)?.location.address ?? 'Calculando...'}
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
                      )}
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
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      caseData.status === 'REASSIGNED' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {caseData.status === 'REASSIGNED' ? 'Hospital Reasignado' : 'Hospital Asignado'}
                      </h2>
                      <p className="text-slate-600 mt-1">Diríjase inmediatamente al centro asignado.</p>
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left w-full space-y-4">
                        <div>
                          <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Destino</p>
                          <p className="text-2xl font-bold text-slate-900 mt-1">
                            {assignedHospital ? assignedHospital.name : caseData.assignedHospitalId}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-brand-navy mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Origen (Ubicación del Evento)</p>
                              <p className="text-sm text-slate-700 font-medium leading-tight mt-0.5">{p.location.address}</p>
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
                      {(caseData.status === 'ASSIGNED_EN_ROUTE' || caseData.status === 'REASSIGNED') && onArrive && (
                        <div className="pt-4 mt-4 border-t border-slate-200 w-full">
                          <Button
                            variant="default"
                            className="w-full py-6 text-lg font-bold uppercase tracking-widest shadow-lg shadow-brand-navy/20"
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

        {/* Full patient form — read only */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-slate-500 uppercase tracking-wider">Información del Paciente</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generatePatientPDF(caseData)}
                  className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-brand-navy hover:bg-slate-100"
                  title="Descargar PDF"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">

              {/* Módulo 1 */}
              <div>
                <SectionTitle n={1}>Datos del Paciente</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <FieldLabel>DNI</FieldLabel>
                    <FieldValue>{p.id}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Nombre completo</FieldLabel>
                    <FieldValue>{p.name}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Edad</FieldLabel>
                    <FieldValue>{p.age !== '' ? `${p.age} años` : undefined}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Sexo</FieldLabel>
                    <FieldValue>
                      {p.sex === 'M' ? 'Masculino' : p.sex === 'F' ? 'Femenino' : p.sex === 'X' ? 'Otro' : undefined}
                    </FieldValue>
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Cobertura médica</FieldLabel>
                    <ReadOnlyToggle value={p.hasCoverage} />
                  </div>
                </div>
              </div>

              {/* Módulo 2 */}
              <div>
                <SectionTitle n={2}>Parámetros Clínicos</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <FieldLabel>Tensión Arterial Sistólica</FieldLabel>
                    <FieldValue>{p.systolicBP ? `${p.systolicBP} mmHg` : undefined}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Tensión Arterial Diastólica</FieldLabel>
                    <FieldValue>{p.diastolicBP ? `${p.diastolicBP} mmHg` : undefined}</FieldValue>
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Medicación antihipertensiva</FieldLabel>
                    <ReadOnlyToggle value={p.bloodPressureMeds} />
                  </div>
                  <div>
                    <FieldLabel>Glucemia</FieldLabel>
                    <FieldValue>{p.glucemia ? `${p.glucemia} mg/dL` : undefined}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Temperatura</FieldLabel>
                    <FieldValue>{p.temperature ? `${p.temperature} °C` : undefined}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Frecuencia cardíaca</FieldLabel>
                    <FieldValue>{p.heartRate ? `${p.heartRate} lpm` : undefined}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Pulso</FieldLabel>
                    {p.pulseRegular == null
                      ? <span className="text-sm text-slate-300">—</span>
                      : <span className={`inline-block px-3 py-0.5 rounded-lg text-xs font-bold border ${
                          p.pulseRegular
                            ? 'bg-brand-navy text-white border-brand-navy'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {p.pulseRegular ? 'Regular' : 'Irregular'}
                        </span>
                    }
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Embarazo reciente</FieldLabel>
                    {p.recentPregnancy == null
                      ? <span className="inline-block px-3 py-0.5 rounded-lg text-xs font-bold border bg-slate-100 text-slate-600 border-slate-200">No</span>
                      : <span className="inline-block px-3 py-0.5 rounded-lg text-xs font-bold border bg-brand-navy text-white border-brand-navy">
                          {PREGNANCY_LABEL[p.recentPregnancy]}
                        </span>
                    }
                  </div>
                  <div>
                    <FieldLabel>ACV previo</FieldLabel>
                    <ReadOnlyToggle value={p.priorStroke} />
                  </div>
                  <div>
                    <FieldLabel>Traumatismo craneal reciente</FieldLabel>
                    <ReadOnlyToggle value={p.recentCranialTrauma} />
                  </div>
                </div>
              </div>

              {/* Módulo 3 */}
              <div>
                <SectionTitle n={3}>Síntomas BE-FAST</SectionTitle>
                <div className="space-y-3 mb-4">
                  {BEFAST_QUESTIONS.map(q => {
                    const isYes = p.symptoms.includes(q.id);
                    return (
                      <div key={q.id} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                        <p className="text-sm text-slate-700 leading-snug flex-1">{q.label}</p>
                        <span className={`px-3 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          isYes ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isYes ? 'Sí' : 'No'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
                  <div className="col-span-2">
                    <FieldLabel>Inicio de síntomas</FieldLabel>
                    <FieldValue>{p.symptomOnsetTime}</FieldValue>
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Información de contacto</FieldLabel>
                    <FieldValue>{p.contactInfo}</FieldValue>
                  </div>
                  {p.clinicalObservations && (
                    <div className="col-span-2">
                      <FieldLabel>Observaciones clínicas</FieldLabel>
                      <FieldValue>{p.clinicalObservations}</FieldValue>
                    </div>
                  )}
                  <div className="col-span-2">
                    <FieldLabel>Ubicación del evento</FieldLabel>
                    <FieldValue>{p.location.address}</FieldValue>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </main>
    </motion.div>
  );
}
