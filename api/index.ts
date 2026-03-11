import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// ── Hospital data (self-contained, no imports from src/) ──
interface Hospital {
  id: string;
  name: string;
  isStrokeCenter: boolean;
  location: { lat: number; lng: number; address: string };
  distance?: number;
  email?: string;
}

const mockHospitals: Hospital[] = [
  { id: 'h1', name: 'Hospital El Cruce (SAMIC)', isStrokeCenter: true, location: { lat: -34.786521, lng: -58.257342, address: 'Av. Calchaquí 5401, B1888 Florencio Varela, Provincia de Buenos Aires, Argentina' }, distance: 12, email: 'emergencias@hospitalelcruce.org' },
  { id: 'h2', name: 'Hospital Nacional Prof. Alejandro Posadas', isStrokeCenter: true, location: { lat: -34.630632, lng: -58.575611, address: 'Av. Pres. Arturo U. Illia s/n, B1684 El Palomar, Provincia de Buenos Aires, Argentina' }, distance: 25, email: 'acv@hospitalposadas.gov.ar' },
  { id: 'h3', name: 'Hospital General de Agudos Dr. Juan A. Fernández', isStrokeCenter: true, location: { lat: -34.581123, lng: -58.406145, address: 'Cerviño 3356, C1425 CABA, Argentina' }, distance: 18, email: 'guardia@hospitalfernandez.org' },
  { id: 'h4', name: 'Hospital General de Agudos Dr. Cosme Argerich', isStrokeCenter: true, location: { lat: -34.628050, lng: -58.359612, address: 'Pi y Margall 750, C1155 CABA, Argentina' }, distance: 5, email: 'stroke@hospitalargerich.org' },
  { id: 'h5', name: 'Hospital General de Agudos Carlos G. Durand', isStrokeCenter: true, location: { lat: -34.609412, lng: -58.437523, address: 'Av. Díaz Vélez 5044, C1405 CABA, Argentina' }, distance: 8, email: 'emergencias@hospitaldurand.org' },
  { id: 'h6', name: 'Hospital General de Agudos J. M. Ramos Mejía', isStrokeCenter: true, location: { lat: -34.615830, lng: -58.407250, address: 'Gral. Urquiza 609, C1221 CABA, Argentina' }, distance: 6, email: 'guardia@hospitalramosmejia.org' },
  { id: 'h7', name: 'Hospital General de Agudos Dr. Ignacio Pirovano', isStrokeCenter: true, location: { lat: -34.566123, lng: -58.472234, address: 'Av. Monroe 3555, C1430 CABA, Argentina' }, distance: 14, email: 'acv@hospitalpirovano.org' },
  { id: 'h8', name: 'Hospital General de Agudos Dr. Teodoro Álvarez', isStrokeCenter: false, location: { lat: -34.625350, lng: -58.468050, address: 'Dr. Juan F. Aranguren 2701, C1406 CABA, Argentina' }, distance: 10, email: 'contacto@hospitalalvarez.org' },
  { id: 'h9', name: 'Hospital General de Agudos Parmenio Piñero', isStrokeCenter: false, location: { lat: -34.640812, lng: -58.452834, address: 'Av. Varela 1301, C1406 CABA, Argentina' }, distance: 11, email: 'guardia@hospitalpinero.org' },
  { id: 'h10', name: 'Hospital General de Agudos Donación Francisco Santojanni', isStrokeCenter: true, location: { lat: -34.648200, lng: -58.516430, address: 'Pilar 950, C1408 CABA, Argentina' }, distance: 15, email: 'stroke@hospitalsantojanni.org' },
];

// ── Nodemailer ──
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ── Helpers ──
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getClosestHospitalByHaversine(lat: number, lng: number, hospitals: Hospital[]) {
  let closest: Hospital | null = null;
  let minDist = Infinity;
  for (const h of hospitals) {
    const d = calculateDistance(lat, lng, h.location.lat, h.location.lng);
    if (d < minDist) { minDist = d; closest = h; }
  }
  return { hospital: closest, etaText: null as string | null, etaSeconds: null as number | null };
}

async function getClosestHospitalByETA(lat: number, lng: number, hospitals: Hospital[]) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return getClosestHospitalByHaversine(lat, lng, hospitals);

  const origins = `${lat},${lng}`;
  const destinations = hospitals.map(h => `${h.location.lat},${h.location.lng}`).join('|');
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`);
    const data = await res.json();
    if (data.status === 'OK' && data.rows?.[0]?.elements) {
      let minDur = Infinity, idx = -1;
      data.rows[0].elements.forEach((el: any, i: number) => {
        if (el.status === 'OK' && el.duration.value < minDur) { minDur = el.duration.value; idx = i; }
      });
      if (idx !== -1) return { hospital: hospitals[idx], etaText: data.rows[0].elements[idx].duration.text, etaSeconds: data.rows[0].elements[idx].duration.value };
    }
  } catch (e) { console.error('Distance Matrix error:', e); }
  return getClosestHospitalByHaversine(lat, lng, hospitals);
}

function buildPatientTableRows(p: any) {
  const row = (label: string, val: string, color = '#0f172a') =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:40%;color:#64748b;font-weight:500">${label}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:${color}">${val}</td></tr>`;
  return [
    row('Nombre', p.name || 'N/A'),
    row('DNI', p.id || 'N/A'),
    row('Edad / Sexo', `${p.age || 'N/A'} / ${p.sex || 'N/A'}`),
    row('Cobertura', p.coverage || 'N/A'),
    row('Inicio de Síntomas', p.symptomOnsetTime || 'N/A', '#ef4444'),
    row('Contacto', p.contactInfo || 'N/A'),
  ].join('');
}

const EMAIL_FOOTER = `<div style="background-color:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">Este es un mensaje automático del Sistema de Gestión de ACV. Por favor, no responda a este correo.</div>`;

const NOTIFICATION_RECIPIENTS = [
  { role: 'DINESA', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Coordinador SAME', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Stroke', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
];

// ── Route handlers ──
async function handleSubmitAcv(body: any) {
  const patientData = body;
  const strokeCenters = mockHospitals.filter(h => h.isStrokeCenter);
  const { hospital: closestHospital, etaText, etaSeconds } = await getClosestHospitalByETA(patientData.location.lat, patientData.location.lng, strokeCenters);

  const preAssignedHospital = closestHospital ? closestHospital.name : 'Hospital Stroke Center (Default)';
  const preAssignedHospitalId = closestHospital ? closestHospital.id : null;
  const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';

  const emailContent = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:680px;margin:0 auto;color:#334155;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background-color:#ef4444;padding:20px;color:white;text-align:center">
        <h1 style="margin:0;font-size:24px;font-weight:600">ALERTA: CÓDIGO ACV - PRE ASIGNADO</h1>
        <p style="margin:8px 0 0 0;font-size:16px;opacity:0.9">Destino Pre-asignado: <strong>${preAssignedHospital}${etaDisplay}</strong></p>
      </div>
      <div style="padding:24px;background-color:#f8fafc">
        <h2 style="margin-top:0;color:#0f172a;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Información del Paciente</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">${buildPatientTableRows(patientData)}</table>
        <h3 style="margin-top:24px;color:#0f172a;font-size:16px">Síntomas Detectados</h3>
        <ul style="margin-top:8px;padding-left:20px;color:#0f172a">${(patientData.symptoms || []).map((s: string) => `<li style="margin-bottom:4px">${s}</li>`).join('')}</ul>
        <h3 style="margin-top:24px;color:#0f172a;font-size:16px">Ubicación del Evento</h3>
        <p style="margin-top:8px;color:#0f172a;background-color:#e2e8f0;padding:12px;border-radius:6px">${patientData.location?.address || 'N/A'}</p>
        ${patientData.clinicalObservations ? `<h3 style="margin-top:24px;color:#0f172a;font-size:16px">Observaciones Clínicas</h3><p style="margin-top:8px;color:#0f172a;background-color:#f1f5f9;padding:12px;border-radius:6px;border-left:4px solid #94a3b8">${patientData.clinicalObservations}</p>` : ''}
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  for (const r of NOTIFICATION_RECIPIENTS) {
    await transporter.sendMail({
      from: '"Sistema ACV" <no-reply@sumardigital.com.ar>',
      to: r.email, cc: r.cc,
      subject: `[${r.role}] Nuevo Código ACV - ${preAssignedHospital}`,
      html: emailContent,
    });
  }

  return { success: true, status: 'PRE_ASSIGNED', preAssignedHospitalId, etaText, etaSeconds };
}

async function handleConfirmHospital(body: any) {
  const { caseId, patientData, confirmedHospitalId, etaText } = body;
  const confirmed = mockHospitals.find(h => h.id === confirmedHospitalId);
  const hospitalName = confirmed?.name ?? 'Hospital desconocido';
  const hospitalAddress = confirmed?.location.address ?? 'Dirección no disponible';
  const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';

  const html = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:680px;margin:0 auto;color:#334155;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background-color:#10b981;padding:24px;color:white;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:700">✔ DERIVACIÓN CONFIRMADA – CÓDIGO ACV</h1>
        <p style="margin:10px 0 0 0;font-size:15px;opacity:0.9">Hospital de destino: <strong>${hospitalName}${etaDisplay}</strong></p>
      </div>
      <div style="padding:24px;background-color:#f8fafc">
        <div style="background-color:#d1fae5;border:1px solid #a7f3d0;border-radius:6px;padding:14px 18px;margin-bottom:20px">
          <p style="margin:0;color:#065f46;font-weight:600;font-size:14px">📋 Caso: ${caseId}</p>
          <p style="margin:6px 0 0 0;color:#047857;font-size:13px">DINESA ha confirmado la derivación del paciente a <strong>${hospitalName}</strong>.<br/>El hospital destino debe preparar el equipo de stroke para la recepción.</p>
        </div>
        <h2 style="margin-top:0;color:#0f172a;font-size:17px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Información del Paciente</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">${buildPatientTableRows(patientData)}</table>
        ${patientData.symptoms?.length ? `<h3 style="margin-top:22px;color:#0f172a;font-size:15px">Síntomas Detectados</h3><ul style="margin-top:8px;padding-left:20px;color:#0f172a">${patientData.symptoms.map((s: string) => `<li style="margin-bottom:4px">${s}</li>`).join('')}</ul>` : ''}
        <h3 style="margin-top:22px;color:#0f172a;font-size:15px">Ubicación del Evento</h3>
        <p style="margin-top:8px;color:#0f172a;background-color:#e2e8f0;padding:12px;border-radius:6px">${patientData.location?.address || 'N/A'}</p>
        <h3 style="margin-top:22px;color:#0f172a;font-size:15px">Hospital Confirmado</h3>
        <p style="margin-top:8px;color:#0f172a;background-color:#d1fae5;padding:12px;border-radius:6px;border-left:4px solid #10b981"><strong>${hospitalName}</strong><br/><span style="font-size:13px;color:#374151">${hospitalAddress}</span></p>
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  for (const r of NOTIFICATION_RECIPIENTS) {
    await transporter.sendMail({
      from: '"Sistema ACV" <no-reply@sumardigital.com.ar>',
      to: r.email, cc: r.cc,
      subject: `[CONFIRMACIÓN] Código ACV ${caseId} – Derivación confirmada: ${hospitalName}`,
      html,
    });
  }
  return { success: true };
}

async function handleReassignHospital(body: any) {
  const { caseId, patientData, cancelledHospitalId, newHospitalId, etaText } = body;
  const cancelledHospital = mockHospitals.find(h => h.id === cancelledHospitalId);
  const newHospital = mockHospitals.find(h => h.id === newHospitalId);
  const cancelledName = cancelledHospital?.name ?? 'Hospital anterior';
  const newHospitalName = newHospital?.name ?? 'Hospital nuevo';
  const newHospitalAddress = newHospital?.location.address ?? 'Dirección no disponible';
  const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';

  const cancellationHtml = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:680px;margin:0 auto;color:#334155;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background-color:#f59e0b;padding:24px;color:white;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:700">⚠ CANCELACIÓN DE DERIVACIÓN – CÓDIGO ACV</h1>
        <p style="margin:10px 0 0 0;font-size:15px;opacity:0.95">Hospital cancelado: <strong>${cancelledName}</strong></p>
      </div>
      <div style="padding:24px;background-color:#f8fafc">
        <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;margin-bottom:20px">
          <p style="margin:0;color:#92400e;font-weight:600;font-size:14px">📋 Caso: ${caseId}</p>
          <p style="margin:6px 0 0 0;color:#b45309;font-size:13px">La derivación del paciente a <strong>${cancelledName}</strong> ha sido <strong>cancelada</strong> por decisión operativa de DINESA.<br/>El paciente ha sido redirigido a otro centro asistencial.</p>
        </div>
        <h2 style="margin-top:0;color:#0f172a;font-size:17px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Información del Paciente</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">${buildPatientTableRows(patientData)}</table>
        <h3 style="margin-top:22px;color:#0f172a;font-size:15px">Ubicación del Evento</h3>
        <p style="margin-top:8px;color:#0f172a;background-color:#e2e8f0;padding:12px;border-radius:6px">${patientData.location?.address || 'N/A'}</p>
        <div style="margin-top:22px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:14px 18px">
          <p style="margin:0;color:#9a3412;font-size:13px;font-weight:600">Centro de destino final: ${newHospitalName}</p>
          <p style="margin:4px 0 0 0;color:#c2410c;font-size:12px">Para consultas operativas, contactar a la Central DINESA.</p>
        </div>
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  const newAssignmentHtml = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:680px;margin:0 auto;color:#334155;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="background-color:#ef4444;padding:24px;color:white;text-align:center">
        <h1 style="margin:0;font-size:22px;font-weight:700">🚨 ALERTA: CÓDIGO ACV – DERIVACIÓN CONFIRMADA</h1>
        <p style="margin:10px 0 0 0;font-size:15px;opacity:0.9">Hospital de destino: <strong>${newHospitalName}${etaDisplay}</strong></p>
      </div>
      <div style="padding:24px;background-color:#f8fafc">
        <div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:6px;padding:14px 18px;margin-bottom:20px">
          <p style="margin:0;color:#7f1d1d;font-weight:600;font-size:14px">📋 Caso: ${caseId}</p>
          <p style="margin:6px 0 0 0;color:#991b1b;font-size:13px">DINESA ha confirmado la derivación de un paciente con <strong>Código ACV</strong> a su institución.<br/>Se solicita activación inmediata del equipo de stroke y preparación de guardia neurológica.</p>
        </div>
        <h2 style="margin-top:0;color:#0f172a;font-size:17px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Información del Paciente</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">${buildPatientTableRows(patientData)}</table>
        ${patientData.symptoms?.length ? `<h3 style="margin-top:22px;color:#0f172a;font-size:15px">Síntomas Detectados</h3><ul style="margin-top:8px;padding-left:20px;color:#0f172a">${patientData.symptoms.map((s: string) => `<li style="margin-bottom:4px">${s}</li>`).join('')}</ul>` : ''}
        <h3 style="margin-top:22px;color:#0f172a;font-size:15px">Ubicación del Evento</h3>
        <p style="margin-top:8px;color:#0f172a;background-color:#e2e8f0;padding:12px;border-radius:6px">${patientData.location?.address || 'N/A'}</p>
        ${patientData.clinicalObservations ? `<h3 style="margin-top:22px;color:#0f172a;font-size:15px">Observaciones Clínicas</h3><p style="margin-top:8px;color:#0f172a;background-color:#f1f5f9;padding:12px;border-radius:6px;border-left:4px solid #94a3b8">${patientData.clinicalObservations}</p>` : ''}
        <h3 style="margin-top:22px;color:#0f172a;font-size:15px">Hospital Confirmado como Destino</h3>
        <p style="margin-top:8px;color:#0f172a;background-color:#fee2e2;padding:12px;border-radius:6px;border-left:4px solid #ef4444"><strong>${newHospitalName}</strong><br/><span style="font-size:13px;color:#374151">${newHospitalAddress}</span></p>
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  for (const r of NOTIFICATION_RECIPIENTS) {
    await transporter.sendMail({ from: '"Sistema ACV" <no-reply@sumardigital.com.ar>', to: r.email, cc: r.cc, subject: `[CANCELACIÓN] Código ACV ${caseId} – Derivación cancelada para ${cancelledName}`, html: cancellationHtml });
  }
  for (const r of NOTIFICATION_RECIPIENTS) {
    await transporter.sendMail({ from: '"Sistema ACV" <no-reply@sumardigital.com.ar>', to: r.email, cc: r.cc, subject: `[DERIVACIÓN] Código ACV ${caseId} – Paciente en camino a ${newHospitalName}`, html: newAssignmentHtml });
  }
  return { success: true };
}

// ── Single Vercel Serverless Function handler ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Route based on the URL path
  const path = req.url?.replace(/\?.*$/, '') || '';

  try {
    if (path === '/api/submit-acv') {
      const result = await handleSubmitAcv(req.body);
      return res.status(200).json(result);
    }
    if (path === '/api/confirm-hospital') {
      const result = await handleConfirmHospital(req.body);
      return res.status(200).json(result);
    }
    if (path === '/api/reassign-hospital') {
      const result = await handleReassignHospital(req.body);
      return res.status(200).json(result);
    }
    return res.status(404).json({ error: 'Not Found' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
