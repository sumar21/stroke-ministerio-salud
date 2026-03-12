import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface Hospital {
  id: string; name: string; isStrokeCenter: boolean;
  location: { lat: number; lng: number; address: string };
}

const hospitals: Hospital[] = [
  { id: 'h1', name: 'Hospital El Cruce (SAMIC)', isStrokeCenter: true, location: { lat: -34.786521, lng: -58.257342, address: 'Av. Calchaquí 5401, Florencio Varela' } },
  { id: 'h2', name: 'Hospital Nacional Prof. Alejandro Posadas', isStrokeCenter: true, location: { lat: -34.630632, lng: -58.575611, address: 'Av. Pres. Arturo U. Illia s/n, El Palomar' } },
  { id: 'h3', name: 'Hospital Gral. de Agudos Dr. Juan A. Fernández', isStrokeCenter: true, location: { lat: -34.581123, lng: -58.406145, address: 'Cerviño 3356, CABA' } },
  { id: 'h4', name: 'Hospital Gral. de Agudos Dr. Cosme Argerich', isStrokeCenter: true, location: { lat: -34.628050, lng: -58.359612, address: 'Pi y Margall 750, CABA' } },
  { id: 'h5', name: 'Hospital Gral. de Agudos Carlos G. Durand', isStrokeCenter: true, location: { lat: -34.609412, lng: -58.437523, address: 'Av. Díaz Vélez 5044, CABA' } },
  { id: 'h6', name: 'Hospital Gral. de Agudos J. M. Ramos Mejía', isStrokeCenter: true, location: { lat: -34.615830, lng: -58.407250, address: 'Gral. Urquiza 609, CABA' } },
  { id: 'h7', name: 'Hospital Gral. de Agudos Dr. Ignacio Pirovano', isStrokeCenter: true, location: { lat: -34.566123, lng: -58.472234, address: 'Av. Monroe 3555, CABA' } },
  { id: 'h8', name: 'Hospital Gral. de Agudos Dr. Teodoro Álvarez', isStrokeCenter: false, location: { lat: -34.625350, lng: -58.468050, address: 'Dr. Juan F. Aranguren 2701, CABA' } },
  { id: 'h9', name: 'Hospital Gral. de Agudos Parmenio Piñero', isStrokeCenter: false, location: { lat: -34.640812, lng: -58.452834, address: 'Av. Varela 1301, CABA' } },
  { id: 'h10', name: 'Hospital Gral. de Agudos Donación Francisco Santojanni', isStrokeCenter: true, location: { lat: -34.648200, lng: -58.516430, address: 'Pilar 950, CABA' } },
];

const RECIPIENTS = [
  { role:'DINESA', email:'santiago.bianucci@sumardigital.com.ar', bcc:'rodrigo.rizzo@sumardigital.com.ar' },
  { role:'Centro Coordinador SAME', email:'santiago.bianucci@sumardigital.com.ar', bcc:'rodrigo.rizzo@sumardigital.com.ar' },
  { role:'Centro Stroke', email:'santiago.bianucci@sumardigital.com.ar', bcc:'rodrigo.rizzo@sumardigital.com.ar' },
];

/*
const RECIPIENTS = [
  { role: 'DINESA', email: 'marzumendi@msal.gov.ar', bcc: 'santiago.bianucci@sumardigital.com.ar,rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Coordinador SAME', email: 'lgaggino@msal.gov.ar', bcc: 'santiago.bianucci@sumardigital.com.ar,rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Stroke', email: 'dmassaragian@msal.gov.ar', bcc: 'santiago.bianucci@sumardigital.com.ar,rodrigo.rizzo@sumardigital.com.ar' },
];
*/
function patientRows(p: any) {
  const r = (l: string, v: string, c = '#0f172a') => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:40%;color:#64748b;font-weight:500">${l}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:${c}">${v}</td></tr>`;
  return [r('Nombre', p.name || 'N/A'), r('DNI', p.id || 'N/A'), r('Edad / Sexo', `${p.age || 'N/A'} / ${p.sex || 'N/A'}`), r('Cobertura', p.coverage || 'N/A'), r('Inicio de Síntomas', p.symptomOnsetTime || 'N/A', '#ef4444'), r('Contacto', p.contactInfo || 'N/A')].join('');
}

const FOOTER = `<div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">Mensaje automático – Sistema de Gestión de ACV</div>`;
const processedConfirmActions = new Map<string, number>();
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
  const bccSet = new Set<string>();

  for (const recipient of RECIPIENTS) {
    if (recipient.email) toSet.add(recipient.email);
    for (const bccEmail of parseEmails(recipient.bcc)) {
      bccSet.add(bccEmail);
    }
  }

  for (const toEmail of toSet) {
    bccSet.delete(toEmail);
  }

  return {
    to: Array.from(toSet).join(','),
    bcc: Array.from(bccSet).join(','),
  };
}

function isDuplicateAction(actionKey: string) {
  const now = Date.now();
  for (const [key, timestamp] of processedConfirmActions.entries()) {
    if (now - timestamp > IDEMPOTENCY_WINDOW_MS) {
      processedConfirmActions.delete(key);
    }
  }

  const previous = processedConfirmActions.get(actionKey);
  if (previous && now - previous <= IDEMPOTENCY_WINDOW_MS) {
    return true;
  }

  processedConfirmActions.set(actionKey, now);
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { caseId, patientData, confirmedHospitalId, etaText, requestId } = body;
    const actionKey = requestId || `${caseId}:${confirmedHospitalId}:confirm`;

    if (isDuplicateAction(actionKey)) {
      return res.status(200).json({ success: true, duplicateIgnored: true });
    }

    const confirmed = hospitals.find(h => h.id === confirmedHospitalId);
    const hospitalName = confirmed?.name ?? 'Hospital desconocido';
    const hospitalAddress = confirmed?.location.address ?? 'Dirección no disponible';
    const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';

    const html = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:680px;margin:0 auto;color:#334155;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#10b981;padding:24px;color:#fff;text-align:center">
          <h1 style="margin:0;font-size:22px">✔ DERIVACIÓN CONFIRMADA – CÓDIGO ACV</h1>
          <p style="margin:10px 0 0;font-size:15px;opacity:.9">Hospital: <strong>${hospitalName}${etaDisplay}</strong></p>
        </div>
        <div style="padding:24px;background:#f8fafc">
          <div style="background:#d1fae5;border:1px solid #a7f3d0;border-radius:6px;padding:14px 18px;margin-bottom:20px">
            <p style="margin:0;color:#065f46;font-weight:600;font-size:14px">📋 Caso: ${caseId}</p>
            <p style="margin:6px 0 0;color:#047857;font-size:13px">Coordinación del Centro Stroke ha confirmado la derivación a <strong>${hospitalName}</strong>. Activar equipo de stroke.</p>
          </div>
          <h2 style="margin-top:0;font-size:17px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Información del Paciente</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:12px">${patientRows(patientData || {})}</table>
          ${patientData?.symptoms?.length ? `<h3 style="margin-top:22px;font-size:15px">Síntomas</h3><ul style="margin-top:8px;padding-left:20px">${patientData.symptoms.map((s: string) => `<li style="margin-bottom:4px">${s}</li>`).join('')}</ul>` : ''}
          <h3 style="margin-top:22px;font-size:15px">Hospital Confirmado</h3>
          <p style="margin-top:8px;background:#d1fae5;padding:12px;border-radius:6px;border-left:4px solid #10b981"><strong>${hospitalName}</strong><br/><span style="font-size:13px;color:#374151">${hospitalAddress}</span></p>
        </div>
        ${FOOTER}
      </div>`;

    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const distribution = getDistributionList();

    await transport.sendMail({
      from: '"Sistema ACV" <no-reply@sumardigital.com.ar>',
      to: distribution.to,
      bcc: distribution.bcc || undefined,
      subject: `[CONFIRMACIÓN] Código ACV ${caseId} – ${hospitalName}`,
      html,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('confirm-hospital error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
