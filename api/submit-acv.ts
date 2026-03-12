import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// ═══════════════════════════════════════════════════════
// 100% self-contained – zero local imports
// ═══════════════════════════════════════════════════════

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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function closestByDistance(lat: number, lng: number, list: Hospital[]) {
  let best: Hospital | null = null, min = Infinity;
  for (const h of list) { const d = haversine(lat, lng, h.location.lat, h.location.lng); if (d < min) { min = d; best = h; } }
  return { hospital: best, etaText: null as string | null, etaSeconds: null as number | null };
}

async function closestByETA(lat: number, lng: number, list: Hospital[]) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return closestByDistance(lat, lng, list);
  try {
    const origins = `${lat},${lng}`;
    const dests = list.map(h => `${h.location.lat},${h.location.lng}`).join('|');
    const r = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${dests}&key=${key}`);
    const d = await r.json();
    if (d.status === 'OK' && d.rows?.[0]?.elements) {
      let mi = Infinity, idx = -1;
      d.rows[0].elements.forEach((el: any, i: number) => { if (el.status === 'OK' && el.duration.value < mi) { mi = el.duration.value; idx = i; } });
      if (idx !== -1) return { hospital: list[idx], etaText: d.rows[0].elements[idx].duration.text, etaSeconds: d.rows[0].elements[idx].duration.value };
    }
  } catch (e) { console.error('Google Maps error:', e); }
  return closestByDistance(lat, lng, list);
}

function patientRows(p: any) {
  const r = (l: string, v: string, c = '#0f172a') => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;width:40%;color:#64748b;font-weight:500">${l}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;color:${c}">${v}</td></tr>`;
  return [r('Nombre', p.name || 'N/A'), r('DNI', p.id || 'N/A'), r('Edad / Sexo', `${p.age || 'N/A'} / ${p.sex || 'N/A'}`), r('Cobertura', p.coverage || 'N/A'), r('Inicio de Síntomas', p.symptomOnsetTime || 'N/A', '#ef4444'), r('Contacto', p.contactInfo || 'N/A')].join('');
}

const FOOTER = `<div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">Mensaje automático – Sistema de Gestión de ACV</div>`;

// ═══════════════════════════════════════════════════════
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!body || !body.location) {
      return res.status(400).json({ success: false, error: 'Missing patient location data', receivedBody: typeof req.body, bodyKeys: body ? Object.keys(body) : 'null' });
    }

    const strokeCenters = hospitals.filter(h => h.isStrokeCenter);
    const { hospital, etaText, etaSeconds } = await closestByETA(body.location.lat, body.location.lng, strokeCenters);

    const name = hospital ? hospital.name : 'Hospital Stroke Center (Default)';
    const hid = hospital ? hospital.id : null;
    const eta = etaText ? ` (ETA: ${etaText})` : '';

    const html = `
      <div style="font-family:'Segoe UI',sans-serif;max-width:680px;margin:0 auto;color:#334155;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#ef4444;padding:20px;color:#fff;text-align:center">
          <h1 style="margin:0;font-size:24px">ALERTA: CÓDIGO ACV – PRE ASIGNADO</h1>
          <p style="margin:8px 0 0;font-size:16px;opacity:.9">Destino: <strong>${name}${eta}</strong></p>
        </div>
        <div style="padding:24px;background:#f8fafc">
          <h2 style="margin-top:0;font-size:18px;border-bottom:2px solid #e2e8f0;padding-bottom:8px">Información del Paciente</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">${patientRows(body)}</table>
          <h3 style="margin-top:24px;font-size:16px">Síntomas Detectados</h3>
          <ul style="margin-top:8px;padding-left:20px">${(body.symptoms || []).map((s: string) => `<li style="margin-bottom:4px">${s}</li>`).join('')}</ul>
          <h3 style="margin-top:24px;font-size:16px">Ubicación del Evento</h3>
          <p style="margin-top:8px;background:#e2e8f0;padding:12px;border-radius:6px">${body.location?.address || 'N/A'}</p>
          ${body.clinicalObservations ? `<h3 style="margin-top:24px;font-size:16px">Observaciones Clínicas</h3><p style="margin-top:8px;background:#f1f5f9;padding:12px;border-radius:6px;border-left:4px solid #94a3b8">${body.clinicalObservations}</p>` : ''}
        </div>
        ${FOOTER}
      </div>`;

    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    for (const r of RECIPIENTS) {
      await transport.sendMail({
        from: '"Sistema ACV" <no-reply@sumardigital.com.ar>',
        to: r.email, bcc: r.bcc,
        subject: `[${r.role}] Nuevo Código ACV – ${name}`,
        html,
      });
    }

    return res.status(200).json({ success: true, status: 'PRE_ASSIGNED', preAssignedHospitalId: hid, etaText, etaSeconds });
  } catch (err: any) {
    console.error('submit-acv error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
