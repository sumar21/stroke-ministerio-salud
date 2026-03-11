import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  mockHospitals, transporter, NOTIFICATION_RECIPIENTS,
  EMAIL_FOOTER, buildPatientTableRows,
} from './_shared.js';

async function parseBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON body')); } });
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { caseId, patientData, confirmedHospitalId, etaText } = await parseBody(req);
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
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('confirm-hospital error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error sending confirmation email' });
  }
}
