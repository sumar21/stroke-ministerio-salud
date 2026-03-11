import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  mockHospitals, transporter, NOTIFICATION_RECIPIENTS,
  EMAIL_FOOTER, getClosestHospitalByETA, buildPatientTableRows,
} from './_shared.js';

// Manual body parsing fallback
async function parseBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return req.body;
  }
  // Fallback: read the raw stream
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
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
    const patientData = await parseBody(req);
    const strokeCenters = mockHospitals.filter(h => h.isStrokeCenter);
    const { hospital: closestHospital, etaText, etaSeconds } = await getClosestHospitalByETA(
      patientData.location.lat, patientData.location.lng, strokeCenters
    );

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

    return res.status(200).json({ success: true, status: 'PRE_ASSIGNED', preAssignedHospitalId, etaText, etaSeconds });
  } catch (error: any) {
    console.error('submit-acv error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error sending emails' });
  }
}
