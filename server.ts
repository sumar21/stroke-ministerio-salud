import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { mockHospitals } from "./src/data/mockHospitals.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getClosestHospitalByETA(patientLat: number, patientLng: number, hospitals: any[]) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return getClosestHospitalByHaversine(patientLat, patientLng, hospitals);

  const origins = `${patientLat},${patientLng}`;
  const destinations = hospitals.map(h => `${h.location.lat},${h.location.lng}`).join('|');

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`);
    const data = await response.json();
    if (data.status === 'OK' && data.rows[0].elements) {
      const elements = data.rows[0].elements;
      let minDuration = Infinity;
      let closestIndex = -1;
      elements.forEach((element: any, index: number) => {
        if (element.status === 'OK' && element.duration.value < minDuration) {
          minDuration = element.duration.value;
          closestIndex = index;
        }
      });
      if (closestIndex !== -1) {
        return { hospital: hospitals[closestIndex], etaText: elements[closestIndex].duration.text, etaSeconds: elements[closestIndex].duration.value };
      }
    }
  } catch (error) {
    console.error("Error fetching Distance Matrix:", error);
  }
  return getClosestHospitalByHaversine(patientLat, patientLng, hospitals);
}

function getClosestHospitalByHaversine(patientLat: number, patientLng: number, hospitals: any[]) {
  let closestHospital = null;
  let minDistance = Infinity;
  for (const hospital of hospitals) {
    const distance = calculateDistance(patientLat, patientLng, hospital.location.lat, hospital.location.lng);
    if (distance < minDistance) { minDistance = distance; closestHospital = hospital; }
  }
  return { hospital: closestHospital, etaText: null, etaSeconds: null };
}

function buildPatientTableRows(patientData: any) {
  const row = (label: string, val: string, color = '#0f172a') =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:40%;color:#64748b;font-weight:500">${label}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:${color}">${val}</td></tr>`;
  return [
    row('Nombre', patientData.name || 'N/A'),
    row('DNI', patientData.id || 'N/A'),
    row('Edad / Sexo', `${patientData.age || 'N/A'} / ${patientData.sex || 'N/A'}`),
    row('Cobertura', patientData.coverage || 'N/A'),
    row('Inicio de Síntomas', patientData.symptomOnsetTime || 'N/A', '#ef4444'),
    row('Contacto', patientData.contactInfo || 'N/A'),
  ].join('');
}

const EMAIL_FOOTER = `<div style="background-color:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">Este es un mensaje automático del Sistema de Gestión de ACV. Por favor, no responda a este correo.</div>`;

const NOTIFICATION_RECIPIENTS = [
  { role: 'DINESA', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Coordinador SAME', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Stroke', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
];

app.post("/api/submit-acv", async (req, res) => {
  const patientData = req.body;
  const strokeCenters = mockHospitals.filter(h => h.isStrokeCenter);
  const { hospital: closestHospital, etaText, etaSeconds } = await getClosestHospitalByETA(patientData.location.lat, patientData.location.lng, strokeCenters);
  const preAssignedHospital = closestHospital ? closestHospital.name : "Hospital Stroke Center (Default)";
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

  try {
    for (const r of NOTIFICATION_RECIPIENTS) {
      await transporter.sendMail({ from: '"Sistema ACV" <no-reply@sumardigital.com.ar>', to: r.email, cc: r.cc, subject: `[${r.role}] Nuevo Código ACV - ${preAssignedHospital}`, html: emailContent });
    }
    res.json({ success: true, status: 'PRE_ASSIGNED', preAssignedHospitalId, etaText, etaSeconds });
  } catch (error) {
    console.error("Error sending emails:", error);
    res.status(500).json({ success: false, error: "Error sending emails" });
  }
});

app.post('/api/confirm-hospital', async (req, res) => {
  const { caseId, patientData, confirmedHospitalId, etaText } = req.body;
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
          <p style="margin:6px 0 0 0;color:#047857;font-size:13px">Coordinación del Centro Stroke ha confirmado la derivación del paciente a <strong>${hospitalName}</strong>.<br/>El hospital destino debe preparar el equipo de stroke para la recepción.</p>
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

  try {
    for (const r of NOTIFICATION_RECIPIENTS) {
      await transporter.sendMail({ from: '"Sistema ACV" <no-reply@sumardigital.com.ar>', to: r.email, cc: r.cc, subject: `[CONFIRMACIÓN] Código ACV ${caseId} – Derivación confirmada: ${hospitalName}`, html });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    res.status(500).json({ success: false, error: 'Error sending confirmation email' });
  }
});

app.post('/api/reassign-hospital', async (req, res) => {
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
          <p style="margin:6px 0 0 0;color:#b45309;font-size:13px">La derivación del paciente a <strong>${cancelledName}</strong> ha sido <strong>cancelada</strong> por decisión operativa de Coordinación del Centro Stroke.<br/>El paciente ha sido redirigido a otro centro asistencial.</p>
        </div>
        <h2 style="margin-top:0;color:#0f172a;font-size:17px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Información del Paciente</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">${buildPatientTableRows(patientData)}</table>
        <h3 style="margin-top:22px;color:#0f172a;font-size:15px">Ubicación del Evento</h3>
        <p style="margin-top:8px;color:#0f172a;background-color:#e2e8f0;padding:12px;border-radius:6px">${patientData.location?.address || 'N/A'}</p>
        <div style="margin-top:22px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:14px 18px">
          <p style="margin:0;color:#9a3412;font-size:13px;font-weight:600">Centro de destino final: ${newHospitalName}</p>
          <p style="margin:4px 0 0 0;color:#c2410c;font-size:12px">Para consultas operativas, contactar a Coordinación del Centro Stroke.</p>
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
          <p style="margin:6px 0 0 0;color:#991b1b;font-size:13px">Coordinación del Centro Stroke ha confirmado la derivación de un paciente con <strong>Código ACV</strong> a su institución.<br/>Se solicita activación inmediata del equipo de stroke y preparación de guardia neurológica.</p>
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

  try {
    for (const r of NOTIFICATION_RECIPIENTS) {
      await transporter.sendMail({ from: '"Sistema ACV" <no-reply@sumardigital.com.ar>', to: r.email, cc: r.cc, subject: `[CANCELACIÓN] Código ACV ${caseId} – Derivación cancelada para ${cancelledName}`, html: cancellationHtml });
    }
    for (const r of NOTIFICATION_RECIPIENTS) {
      await transporter.sendMail({ from: '"Sistema ACV" <no-reply@sumardigital.com.ar>', to: r.email, cc: r.cc, subject: `[DERIVACIÓN] Código ACV ${caseId} – Paciente en camino a ${newHospitalName}`, html: newAssignmentHtml });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending reassignment emails:', error);
    res.status(500).json({ success: false, error: 'Error sending reassignment emails' });
  }
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
