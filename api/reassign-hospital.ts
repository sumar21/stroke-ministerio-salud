import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  mockHospitals, transporter, NOTIFICATION_RECIPIENTS,
  EMAIL_FOOTER, buildPatientTableRows,
} from './_shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { caseId, patientData, cancelledHospitalId, newHospitalId, etaText } = req.body;
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

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('reassign-hospital error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error sending reassignment emails' });
  }
}
