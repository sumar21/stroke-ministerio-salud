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
  { id: 'h1', name: 'Hospital El Cruce (SAMIC)', isStrokeCenter: true, location: { lat: -34.786521, lng: -58.257342, address: 'Av. Calchaquí 5401, B1888 Florencio Varela, Provincia de Buenos Aires, Argentina' } },
  { id: 'h2', name: 'Hospital Nacional Prof. Alejandro Posadas', isStrokeCenter: true, location: { lat: -34.630632, lng: -58.575611, address: 'Av. Pres. Arturo U. Illia s/n, B1684 El Palomar, Provincia de Buenos Aires, Argentina' } },
  { id: 'h3', name: 'Hospital Evita Pueblo', isStrokeCenter: false, location: { lat: -34.782859, lng: -58.210940, address: 'C. 136 2905, B1884 Berazategui, Provincia de Buenos Aires' } },
  { id: 'h4', name: 'Sanatorio Berazategui', isStrokeCenter: false, location: { lat: -34.765556, lng: -58.216166, address: 'Av. 14 4123, B1884CUC Gran Buenos Aires, Provincia de Buenos Aires' } },
];



const BCC_LIST = 'harry.yang@sumardigital.com.ar,santiago.bianucci@sumardigital.com.ar,rodrigo.rizzo@sumardigital.com.ar';

function getDistributionList(assignedHospital?: Hospital | null) {
  const to: string[] = [
    'cvillagran@msal.gov.ar',   // Centro Coordinador Nacional (DINESA)
    'lgaggino@msal.gov.ar',     // Centro Operativo Local
  ];
  if (assignedHospital?.isStrokeCenter) {
    to.push('dmasaragian@msal.gov.ar'); // Centro Stroke
  }
  return { to: to.join(','), bcc: BCC_LIST };
}


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

// Logo URL — set LOGO_URL env var on Vercel (the public URL of LogoMSAL.png)
const LOGO_URL = process.env.LOGO_URL || '';

function emailHeader(bannerBg: string, bannerText: string, bannerSub: string) {
  return `
    <div style="background:${C.navy};padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px">
      ${LOGO_URL ? `<img src="${LOGO_URL}" alt="Ministerio de Salud" style="height:44px;object-fit:contain;flex-shrink:0" />` : '<span style="color:#fff;font-weight:700;font-size:13px">Ministerio de Salud</span>'}
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
    ${row('Inicio de síntomas', p.symptomOnsetTime || '00:00', true)}
    ${row('Contacto', p.contactInfo)}
  </table>`;
}

const EMAIL_FOOTER_HTML = `
  <div style="background:${C.navy};padding:14px 24px;text-align:center">
    <p style="margin:0;color:${C.gold};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Ministerio de Salud · República Argentina</p>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:11px">Mensaje automático – Sistema de Gestión de ACV. No responder a este correo.</p>
  </div>`;

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

    const preAssignedHospitalId: string | null = body.preAssignedHospitalId ?? null;
    const etaText: string | null = body.etaText ?? null;
    const hospital = preAssignedHospitalId ? hospitals.find(h => h.id === preAssignedHospitalId) ?? null : null;

    const name = hospital ? hospital.name : 'A confirmar por DINESA';
    const eta = etaText ? ` (ETA: ${etaText})` : '';

    const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;color:${C.text};border:1px solid ${C.border};border-radius:10px;overflow:hidden">
    ${emailHeader(C.red, '🚨 ALERTA: CÓDIGO ACV – PRE ASIGNADO', `Destino sugerido: <strong>${name}${eta}</strong>`)}
    <div style="padding:24px;background:${C.slate}">
      <p style="margin:0 0 16px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Información del Paciente</p>
      ${patientTable(body)}
      <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Síntomas BE-FAST</p>
      ${formatSymptoms(body.symptoms || [])}
      <p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Ubicación del Evento</p>
      <div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.navy};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.navy};font-weight:600">${body.location?.address || '—'}</div>
      ${body.clinicalObservations ? `<p style="margin:20px 0 10px;font-size:13px;color:${C.muted};font-weight:600;text-transform:uppercase;letter-spacing:1px">Observaciones Clínicas</p><div style="background:#fff;border:1px solid ${C.border};border-left:4px solid ${C.blue};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.text}">${body.clinicalObservations}</div>` : ''}
    </div>
    ${EMAIL_FOOTER_HTML}
  </div>`;

    const smtpConfig = {
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      requireTLS: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    };
    console.log('[submit-acv] SMTP config (no password):', { ...smtpConfig, auth: { user: smtpConfig.auth.user } });

    const transport = nodemailer.createTransport(smtpConfig);

    try {
      await transport.verify();
      console.log('[submit-acv] SMTP verify OK');
    } catch (verifyErr: any) {
      console.error('[submit-acv] SMTP verify FAILED:', verifyErr.message, verifyErr.code, verifyErr.response);
    }

    const distribution = getDistributionList(hospital);
    await transport.sendMail({
      from: `"Sistema ACV" <${process.env.EMAIL_USER}>`,
      to: distribution.to,
      bcc: distribution.bcc,
      subject: `[ALERTA] Nuevo Código ACV – ${name}`,
      html,
    }).then(info => console.log(`[submit-acv] sendMail OK — messageId: ${info.messageId}, response: ${info.response}, accepted: ${JSON.stringify(info.accepted)}, rejected: ${JSON.stringify(info.rejected)}`))
      .catch((mailErr: any) => console.error('[submit-acv] sendMail FAILED:', mailErr.message, mailErr.code, mailErr.response));

    const status = hospital ? 'PRE_ASSIGNED' : 'PENDING_ASSIGNMENT';
    return res.status(200).json({ success: true, status, preAssignedHospitalId: hospital?.id ?? null, etaText });
  } catch (err: any) {
    console.error('submit-acv error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
