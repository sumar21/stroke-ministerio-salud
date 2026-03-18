import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { mockHospitals } from "./src/data/mockHospitals.js";

dotenv.config();

// ── Logo (embedded as base64 so it works in any email client) ────────────────
let LOGO_DATA_URI = '';
try {
  const buf = fs.readFileSync(path.join(process.cwd(), 'src/public/LogoMSAL.png'));
  LOGO_DATA_URI = `data:image/png;base64,${buf.toString('base64')}`;
} catch { console.warn('[server] Could not load LogoMSAL.png – emails will have no logo'); }

// ── Brand colours ─────────────────────────────────────────────────────────────
const C = {
  navy:   '#242C4F',
  blue:   '#45658D',
  gold:   '#ffffff',
  red:    '#ef4444',
  amber:  '#f59e0b',
  green:  '#10b981',
  slate:  '#f8fafc',
  border: '#e2e8f0',
  text:   '#334155',
  muted:  '#64748b',
};

// ── BE-FAST symptom labels ────────────────────────────────────────────────────
const BEFAST_LABELS: Record<string, string> = {
  equilibrio: 'Pérdida de equilibrio / mareo intenso',
  vision:     'Pérdida de visión (un ojo o doble/borroso)',
  cara:       'Asimetría facial (un lado de la cara caído)',
  brazos:     'Debilidad en brazos',
  habla:      'Dificultad para hablar',
};

function formatSymptoms(symptoms: string[]): string {
  const positive = symptoms.filter(s => !s.endsWith(':no'));
  const negative = symptoms.filter(s => s.endsWith(':no'));
  const rows = [
    ...positive.map(s => `<tr><td style="padding:6px 0;border-bottom:1px solid ${C.border}"><span style="display:inline-block;width:20px;text-align:center;color:${C.red};font-weight:700">✓</span> <span style="font-weight:600;color:${C.red}">${BEFAST_LABELS[s] ?? s}</span></td></tr>`),
    ...negative.map(s => `<tr><td style="padding:6px 0;border-bottom:1px solid ${C.border}"><span style="display:inline-block;width:20px;text-align:center;color:${C.muted}">✗</span> <span style="color:${C.muted}">${BEFAST_LABELS[s.slice(0, -3)] ?? s.slice(0, -3)}</span></td></tr>`),
  ];
  return `<table style="width:100%;border-collapse:collapse">${rows.join('')}</table>`;
}

// ── Shared email chrome ───────────────────────────────────────────────────────
function emailHeader(bannerBg: string, bannerText: string, bannerSub: string) {
  return `
    <div style="background:${C.navy};padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px">
      ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="Ministerio de Salud" style="height:44px;object-fit:contain;flex-shrink:0" />` : '<span style="color:#fff;font-weight:700;font-size:13px">Ministerio de Salud</span>'}
      <span style="color:${C.gold};font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-align:right">Sistema de Gestión de ACV</span>
    </div>
    <div style="background:${bannerBg};padding:22px 24px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:21px;font-weight:700;letter-spacing:-0.3px">${bannerText}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:14px">${bannerSub}</p>
    </div>`;
}

function patientTable(p: any): string {
  const row = (label: string, value: string, highlight = false) =>
    `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};width:38%;color:${C.muted};font-size:13px;font-weight:500">${label}</td>
      <td style="padding:9px 12px;border-bottom:1px solid ${C.border};font-weight:600;font-size:13px;color:${highlight ? C.red : C.navy}">${value || '—'}</td>
    </tr>`;
  const coverage = p.hasCoverage != null ? (p.hasCoverage ? 'Sí' : 'No') : (p.coverage || '—');
  return `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:6px;overflow:hidden;border:1px solid ${C.border}">
    ${row('Nombre', p.name)}
    ${row('DNI', p.id)}
    ${row('Edad / Sexo', `${p.age ?? '—'} años / ${p.sex ?? '—'}`)}
    ${row('Cobertura médica', coverage)}
    ${row('Inicio de síntomas', p.symptomOnsetTime, true)}
    ${row('Contacto', p.contactInfo)}
  </table>`;
}

const EMAIL_FOOTER = `
  <div style="background:${C.navy};padding:14px 24px;text-align:center">
    <p style="margin:0;color:${C.gold};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Ministerio de Salud · República Argentina</p>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:11px">Mensaje automático – Sistema de Gestión de ACV. No responder a este correo.</p>
  </div>`;

const app = express();
app.use(express.json());

const PORT = 3000;

// Configure Nodemailer
const smtpConfig = {
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
};
console.log('[SMTP] config (no password):', { ...smtpConfig, auth: { user: smtpConfig.auth.user } });
const transporter = nodemailer.createTransport(smtpConfig);
transporter.verify().then(() => console.log('[SMTP] verify OK')).catch((err: any) => console.error('[SMTP] verify FAILED:', err.message, err.code, err.response));


const NOTIFICATION_RECIPIENTS = [
  { role: 'DINESA', email: 'harry.yang@sumardigital.com.ar', cc: 'santiago.bianucci@sumardigital.com.ar,rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Coordinador SAME', email: 'harry.yang@sumardigital.com.ar', cc: 'santiago.bianucci@sumardigital.com.ar,rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Stroke', email: 'harry.yang@sumardigital.com.ar', cc: 'santiago.bianucci@sumardigital.com.ar,rodrigo.rizzo@sumardigital.com.ar' },
];
const processedActions = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 60_000;

function parseEmails(value?: string) {
  if (!value) return [] as string[];
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function getDistributionList() {
  const toSet = new Set<string>();
  const ccSet = new Set<string>();

  for (const recipient of NOTIFICATION_RECIPIENTS) {
    if (recipient.email) toSet.add(recipient.email);
    for (const ccEmail of parseEmails(recipient.cc)) {
      ccSet.add(ccEmail);
    }
  }

  for (const toEmail of toSet) {
    ccSet.delete(toEmail);
  }

  return {
    to: Array.from(toSet).join(','),
    cc: Array.from(ccSet).join(','),
  };
}

function isDuplicateAction(actionKey: string) {
  const now = Date.now();
  for (const [key, timestamp] of processedActions.entries()) {
    if (now - timestamp > IDEMPOTENCY_WINDOW_MS) {
      processedActions.delete(key);
    }
  }

  const previous = processedActions.get(actionKey);
  if (previous && now - previous <= IDEMPOTENCY_WINDOW_MS) {
    return true;
  }

  processedActions.set(actionKey, now);
  return false;
}

type MapsAction = 'geocode-place-id' | 'geocode-address' | 'reverse-geocode' | 'route' | 'autocomplete';

function getServerMapsApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GOOGLE_MAPS_API_KEY');
  }
  return apiKey;
}

app.post('/api/maps', async (req, res) => {
  try {
    const action: MapsAction | undefined = req.body?.action;
    if (!action) {
      return res.status(400).json({ error: 'Missing action' });
    }

    const apiKey = getServerMapsApiKey();

    if (action === 'geocode-place-id') {
      const placeId = req.body?.placeId;
      if (!placeId) return res.status(400).json({ error: 'Missing placeId' });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`
      );
      const data = await response.json();
      return res.status(response.ok ? 200 : 500).json(data);
    }

    if (action === 'geocode-address') {
      const address = req.body?.address;
      if (!address) return res.status(400).json({ error: 'Missing address' });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const data = await response.json();
      return res.status(response.ok ? 200 : 500).json(data);
    }

    if (action === 'reverse-geocode') {
      const lat = req.body?.lat;
      const lng = req.body?.lng;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'Missing lat/lng' });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();
      return res.status(response.ok ? 200 : 500).json(data);
    }

    if (action === 'autocomplete') {
      const input = req.body?.input;
      if (!input) return res.status(400).json({ error: 'Missing input' });

      const lat = req.body?.lat;
      const lng = req.body?.lng;

      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:ar&language=es&key=${apiKey}`;
      if (typeof lat === 'number' && typeof lng === 'number') {
        url += `&location=${lat},${lng}&radius=50000`;
      }

      const response = await fetch(url);
      const data = await response.json();
      console.log('[autocomplete] status:', data.status, data.error_message || '');
      return res.status(response.ok ? 200 : 500).json(data);
    }

    if (action === 'route') {
      const origin = req.body?.origin;
      const destination = req.body?.destination;

      if (
        typeof origin?.lat !== 'number' ||
        typeof origin?.lng !== 'number' ||
        typeof destination?.lat !== 'number' ||
        typeof destination?.lng !== 'number'
      ) {
        return res.status(400).json({ error: 'Missing origin/destination' });
      }

      const requestBody = {
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } }
        },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };

      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (!response.ok) console.log('[route] error:', JSON.stringify(data));
      return res.status(response.ok ? 200 : 500).json(data);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Maps proxy error' });
  }
});

app.post("/api/submit-acv", async (req, res) => {
  const patientData = req.body;
  const preAssignedHospitalId: string | null = patientData.preAssignedHospitalId ?? null;
  const etaText: string | null = patientData.etaText ?? null;
  const closestHospital = preAssignedHospitalId ? mockHospitals.find(h => h.id === preAssignedHospitalId) ?? null : null;
  const preAssignedHospital = closestHospital ? closestHospital.name : 'A confirmar por DINESA';
  const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';

  const emailContent = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;color:${C.text};border:1px solid ${C.border};border-radius:10px;overflow:hidden">
      ${emailHeader(C.red, '🚨 ALERTA: CÓDIGO ACV – PRE ASIGNADO', `Destino sugerido: <strong>${preAssignedHospital}${etaDisplay}</strong>`)}
      <div style="padding:24px;background:${C.slate}">
        <p style="margin:0 0 16px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Información del Paciente</p>
        ${patientTable(patientData)}
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Síntomas BE-FAST</p>
        ${formatSymptoms(patientData.symptoms || [])}
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Ubicación del Evento</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.navy};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.navy};font-weight:600">${patientData.location?.address || '—'}</div>
        ${patientData.clinicalObservations ? `<p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Observaciones Clínicas</p><div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.blue};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.text}">${patientData.clinicalObservations}</div>` : ''}
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  const distribution = getDistributionList();
  transporter.sendMail({
    from: `"Sistema ACV" <${process.env.EMAIL_USER}>`,
    to: distribution.to,
    cc: distribution.cc || undefined,
    subject: `[ALERTA] Nuevo Código ACV - ${preAssignedHospital}`,
    html: emailContent,
  }).then(info => console.log(`[submit-acv] sendMail OK — messageId: ${info.messageId}, response: ${info.response}, accepted: ${JSON.stringify(info.accepted)}, rejected: ${JSON.stringify(info.rejected)}`))
    .catch((err: any) => console.error('[submit-acv] sendMail FAILED:', err.message, err.code, err.response));

  res.json({ success: true, status: preAssignedHospitalId ? 'PRE_ASSIGNED' : 'PENDING_ASSIGNMENT', preAssignedHospitalId, etaText });
});

app.post('/api/confirm-hospital', async (req, res) => {
  const { caseId, patientData, confirmedHospitalId, etaText, requestId } = req.body;
  const actionKey = requestId || `${caseId}:${confirmedHospitalId}:confirm`;
  if (isDuplicateAction(actionKey)) {
    return res.json({ success: true, duplicateIgnored: true });
  }

  const confirmed = mockHospitals.find(h => h.id === confirmedHospitalId);
  const hospitalName = confirmed?.name ?? 'Hospital desconocido';
  const hospitalAddress = confirmed?.location.address ?? 'Dirección no disponible';
  const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;color:${C.text};border:1px solid ${C.border};border-radius:10px;overflow:hidden">
      ${emailHeader(C.green, '✔ DERIVACIÓN CONFIRMADA – CÓDIGO ACV', `Hospital destino: <strong>${hospitalName}${etaDisplay}</strong>`)}
      <div style="padding:24px;background:${C.slate}">
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.green};border-radius:6px;padding:12px 16px;margin-bottom:20px">
          <p style="margin:0;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px">Caso</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:${C.navy}">${caseId}</p>
          <p style="margin:6px 0 0;font-size:13px;color:${C.text}">Activar equipo de stroke para recepción del paciente en <strong>${hospitalName}</strong>.</p>
        </div>
        <p style="margin:0 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Información del Paciente</p>
        ${patientTable(patientData)}
        ${patientData.symptoms?.length ? `<p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Síntomas BE-FAST</p>${formatSymptoms(patientData.symptoms)}` : ''}
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Hospital Confirmado</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.green};border-radius:6px;padding:12px 16px">
          <p style="margin:0;font-weight:700;font-size:14px;color:${C.navy}">${hospitalName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${C.muted}">${hospitalAddress}</p>
        </div>
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Ubicación del Evento</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.navy};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.navy};font-weight:600">${patientData.location?.address || '—'}</div>
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  const distribution = getDistributionList();
  transporter.sendMail({
    from: `"Sistema ACV" <${process.env.EMAIL_USER}>`,
    to: distribution.to,
    cc: distribution.cc || undefined,
    subject: `[CONFIRMACIÓN] Código ACV ${caseId} – Derivación confirmada: ${hospitalName}`,
    html,
  }).then(info => console.log(`[confirm-hospital] sendMail OK — messageId: ${info.messageId}, response: ${info.response}, accepted: ${JSON.stringify(info.accepted)}, rejected: ${JSON.stringify(info.rejected)}`))
    .catch((err: any) => console.error('[confirm-hospital] sendMail FAILED:', err.message, err.code, err.response));

  res.json({ success: true });
});

app.post('/api/reassign-hospital', async (req, res) => {
  const { caseId, patientData, cancelledHospitalId, newHospitalId, etaText, requestId } = req.body;
  const actionKey = requestId || `${caseId}:${cancelledHospitalId}:${newHospitalId}:reassign`;
  if (isDuplicateAction(actionKey)) {
    return res.json({ success: true, duplicateIgnored: true });
  }

  const cancelledHospital = mockHospitals.find(h => h.id === cancelledHospitalId);
  const newHospital = mockHospitals.find(h => h.id === newHospitalId);
  const cancelledName = cancelledHospital?.name ?? 'Hospital anterior';
  const newHospitalName = newHospital?.name ?? 'Hospital nuevo';
  const newHospitalAddress = newHospital?.location.address ?? 'Dirección no disponible';
  const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';

  const cancellationHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;color:${C.text};border:1px solid ${C.border};border-radius:10px;overflow:hidden">
      ${emailHeader(C.amber, '⚠ REASIGNACIÓN – CÓDIGO ACV', `Derivación a <strong>${cancelledName}</strong> cancelada`)}
      <div style="padding:24px;background:${C.slate}">
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.amber};border-radius:6px;padding:12px 16px;margin-bottom:20px">
          <p style="margin:0;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px">Caso</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:${C.navy}">${caseId}</p>
          <p style="margin:6px 0 0;font-size:13px;color:${C.text}">La derivación a <strong>${cancelledName}</strong> fue cancelada. Paciente redirigido a <strong>${newHospitalName}</strong>.</p>
        </div>
        <p style="margin:0 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Información del Paciente</p>
        ${patientTable(patientData)}
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Ubicación del Evento</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.navy};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.navy};font-weight:600">${patientData.location?.address || '—'}</div>
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Nuevo Destino</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.blue};border-radius:6px;padding:12px 16px">
          <p style="margin:0;font-weight:700;font-size:14px;color:${C.navy}">${newHospitalName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${C.muted}">${newHospitalAddress}</p>
        </div>
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  const newAssignmentHtml = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;color:${C.text};border:1px solid ${C.border};border-radius:10px;overflow:hidden">
      ${emailHeader(C.navy, '🚨 ALERTA: CÓDIGO ACV – REASIGNACIÓN', `Nuevo destino: <strong>${newHospitalName}${etaDisplay}</strong>`)}
      <div style="padding:24px;background:${C.slate}">
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.red};border-radius:6px;padding:12px 16px;margin-bottom:20px">
          <p style="margin:0;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px">Caso</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:${C.navy}">${caseId}</p>
          <p style="margin:6px 0 0;font-size:13px;color:${C.text}">Reasignación confirmada. Activar equipo de stroke para recepción en <strong>${newHospitalName}</strong>.</p>
        </div>
        <p style="margin:0 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Información del Paciente</p>
        ${patientTable(patientData)}
        ${patientData.symptoms?.length ? `<p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Síntomas BE-FAST</p>${formatSymptoms(patientData.symptoms)}` : ''}
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Hospital Destino</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.navy};border-radius:6px;padding:12px 16px">
          <p style="margin:0;font-weight:700;font-size:14px;color:${C.navy}">${newHospitalName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:${C.muted}">${newHospitalAddress}</p>
        </div>
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Ubicación del Evento</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.blue};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.navy};font-weight:600">${patientData.location?.address || '—'}</div>
        ${patientData.clinicalObservations ? `<p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Observaciones Clínicas</p><div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.blue};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.text}">${patientData.clinicalObservations}</div>` : ''}
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  const distribution = getDistributionList();
  transporter.sendMail({
    from: `"Sistema ACV" <${process.env.EMAIL_USER}>`,
    to: distribution.to,
    cc: distribution.cc || undefined,
    subject: `[CANCELACIÓN] Código ACV ${caseId} – Derivación cancelada para ${cancelledName}`,
    html: cancellationHtml,
  }).then(info => console.log(`[reassign-hospital] cancel sendMail OK — messageId: ${info.messageId}, response: ${info.response}, accepted: ${JSON.stringify(info.accepted)}, rejected: ${JSON.stringify(info.rejected)}`))
    .catch((err: any) => console.error('[reassign-hospital] cancel sendMail FAILED:', err.message, err.code, err.response));

  transporter.sendMail({
    from: `"Sistema ACV" <${process.env.EMAIL_USER}>`,
    to: distribution.to,
    cc: distribution.cc || undefined,
    subject: `[DERIVACIÓN] Código ACV ${caseId} – Paciente en camino a ${newHospitalName}`,
    html: newAssignmentHtml,
  }).then(info => console.log(`[reassign-hospital] assign sendMail OK — messageId: ${info.messageId}, response: ${info.response}, accepted: ${JSON.stringify(info.accepted)}, rejected: ${JSON.stringify(info.rejected)}`))
    .catch((err: any) => console.error('[reassign-hospital] assign sendMail FAILED:', err.message, err.code, err.response));

  res.json({ success: true });
});

app.post('/api/cancel-case', async (req, res) => {
  const { caseId, patientData, assignedHospitalId, observation, cancelledBy } = req.body;
  const assignedHospital = assignedHospitalId ? mockHospitals.find(h => h.id === assignedHospitalId) : null;
  const assignedName = assignedHospital?.name ?? 'No asignado';
  const responsibleParty = cancelledBy ?? 'Usuario del sistema';

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;color:${C.text};border:1px solid ${C.border};border-radius:10px;overflow:hidden">
      ${emailHeader(C.red, '✖ CASO ACV CANCELADO', `Caso: <strong>${caseId}</strong>`)}
      <div style="padding:24px;background:${C.slate}">
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.red};border-radius:6px;padding:12px 16px;margin-bottom:14px">
          <p style="margin:0;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px">Cancelado por</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:${C.navy}">${responsibleParty}</p>
        </div>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.amber};border-radius:6px;padding:12px 16px;margin-bottom:20px">
          <p style="margin:0;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px">Motivo</p>
          <p style="margin:4px 0 0;font-size:13px;color:${C.text}">${observation || 'Sin observaciones'}</p>
        </div>
        ${assignedHospital ? `<div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.blue};border-radius:6px;padding:12px 16px;margin-bottom:20px"><p style="margin:0;font-size:12px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:1px">Hospital al momento de cancelación</p><p style="margin:4px 0 0;font-size:14px;font-weight:700;color:${C.navy}">${assignedName}</p></div>` : ''}
        <p style="margin:0 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Información del Paciente</p>
        ${patientTable(patientData || {})}
        <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Ubicación del Evento</p>
        <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.navy};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.navy};font-weight:600">${patientData?.location?.address || '—'}</div>
      </div>
      ${EMAIL_FOOTER}
    </div>`;

  const distribution = getDistributionList();
  transporter.sendMail({
    from: `"Sistema ACV" <${process.env.EMAIL_USER}>`,
    to: distribution.to,
    cc: distribution.cc || undefined,
    subject: `[CANCELACIÓN] Código ACV ${caseId} – Cancelado por ${responsibleParty}`,
    html,
  }).then(info => console.log(`[cancel-case] sendMail OK — messageId: ${info.messageId}, response: ${info.response}, accepted: ${JSON.stringify(info.accepted)}, rejected: ${JSON.stringify(info.rejected)}`))
    .catch((err: any) => console.error('[cancel-case] sendMail FAILED:', err.message, err.code, err.response));

  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
