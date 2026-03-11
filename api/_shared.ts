import nodemailer from 'nodemailer';

// ── Hospital data (self-contained for Vercel serverless) ──
export interface Hospital {
  id: string;
  name: string;
  isStrokeCenter: boolean;
  location: { lat: number; lng: number; address: string };
  distance?: number;
  email?: string;
}

export const mockHospitals: Hospital[] = [
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

// ── Nodemailer transporter ──
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export const NOTIFICATION_RECIPIENTS = [
  { role: 'DINESA', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Coordinador SAME', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
  { role: 'Centro Stroke', email: 'santiago.bianucci@sumardigital.com.ar', cc: 'rodrigo.rizzo@sumardigital.com.ar' },
];

export const EMAIL_FOOTER = `<div style="background-color:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0">Este es un mensaje automático del Sistema de Gestión de ACV. Por favor, no responda a este correo.</div>`;

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

export async function getClosestHospitalByETA(lat: number, lng: number, hospitals: Hospital[]) {
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

export function buildPatientTableRows(p: any) {
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
