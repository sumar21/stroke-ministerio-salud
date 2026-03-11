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
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Haversine formula to calculate distance between two lat/lng points in km (Fallback)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

async function getClosestHospitalByETA(patientLat: number, patientLng: number, hospitals: any[]) {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn("No Google Maps API key found, falling back to Haversine distance.");
    return getClosestHospitalByHaversine(patientLat, patientLng, hospitals);
  }

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
        if (element.status === 'OK') {
          const durationSeconds = element.duration.value;
          if (durationSeconds < minDuration) {
            minDuration = durationSeconds;
            closestIndex = index;
          }
        }
      });
      
      if (closestIndex !== -1) {
        return {
          hospital: hospitals[closestIndex],
          etaText: elements[closestIndex].duration.text,
          etaSeconds: elements[closestIndex].duration.value
        };
      }
    }
  } catch (error) {
    console.error("Error fetching Distance Matrix:", error);
  }
  
  // Fallback if API fails
  return getClosestHospitalByHaversine(patientLat, patientLng, hospitals);
}

function getClosestHospitalByHaversine(patientLat: number, patientLng: number, hospitals: any[]) {
  let closestHospital = null;
  let minDistance = Infinity;

  for (const hospital of hospitals) {
    const distance = calculateDistance(
      patientLat,
      patientLng,
      hospital.location.lat,
      hospital.location.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestHospital = hospital;
    }
  }

  return {
    hospital: closestHospital,
    etaText: null,
    etaSeconds: null
  };
}

app.post("/api/submit-acv", async (req, res) => {
  const patientData = req.body;
  
  // 1. Pre-assignment logic: Find closest stroke center by ETA
  const strokeCenters = mockHospitals.filter(h => h.isStrokeCenter);
  
  const { hospital: closestHospital, etaText, etaSeconds } = await getClosestHospitalByETA(
    patientData.location.lat,
    patientData.location.lng,
    strokeCenters
  );

  const preAssignedHospital = closestHospital ? closestHospital.name : "Hospital Stroke Center (Default)";
  const preAssignedHospitalId = closestHospital ? closestHospital.id : null;
  const etaDisplay = etaText ? ` (ETA: ${etaText})` : '';
  
  const status = "PRE_ASSIGNED";
  
  // 2. Send emails
  // We send distinct emails (simulated with the same or different addresses for testing)
  // In a real scenario, these would be fetched from a database based on roles/hospital
  const emails = [
    { role: "DINESA", email: "santiago.bianucci@sumardigital.com.ar", cc: "rodrigo.rizzo@sumardigital.com.ar" },
    { role: "Centro Coordinador SAME", email: "santiago.bianucci@sumardigital.com.ar", cc: "rodrigo.rizzo@sumardigital.com.ar" },
    { role: "Hospital", email: "santiago.bianucci@sumardigital.com.ar", cc: "rodrigo.rizzo@sumardigital.com.ar" }
  ];
  
  const emailContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-w-3xl; margin: 0 auto; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ef4444; padding: 20px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">ALERTA: CÓDIGO ACV - PRE ASIGNADO</h1>
        <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Destino Pre-asignado: <strong>${preAssignedHospital}${etaDisplay}</strong></p>
      </div>
      
      <div style="padding: 24px; background-color: #f8fafc;">
        <h2 style="margin-top: 0; color: #0f172a; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Información del Paciente</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; width: 40%; color: #64748b; font-weight: 500;">Nombre</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${patientData.name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500;">DNI</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${patientData.id || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500;">Edad / Sexo</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${patientData.age || 'N/A'} / ${patientData.sex || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500;">Cobertura</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${patientData.coverage || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500;">Inicio de Síntomas</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #ef4444;">${patientData.symptomOnsetTime || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500;">Contacto</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${patientData.contactInfo || 'N/A'}</td>
          </tr>
        </table>

        <h3 style="margin-top: 24px; color: #0f172a; font-size: 16px;">Síntomas Detectados</h3>
        <ul style="margin-top: 8px; padding-left: 20px; color: #0f172a;">
          ${patientData.symptoms.map((s: string) => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
        </ul>

        <h3 style="margin-top: 24px; color: #0f172a; font-size: 16px;">Ubicación del Evento</h3>
        <p style="margin-top: 8px; color: #0f172a; background-color: #e2e8f0; padding: 12px; border-radius: 6px;">
          ${patientData.location.address}
        </p>
        
        ${patientData.clinicalObservations ? `
          <h3 style="margin-top: 24px; color: #0f172a; font-size: 16px;">Observaciones Clínicas</h3>
          <p style="margin-top: 8px; color: #0f172a; background-color: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 4px solid #94a3b8;">
            ${patientData.clinicalObservations}
          </p>
        ` : ''}
      </div>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Este es un mensaje automático del Sistema de Gestión de ACV. Por favor, no responda a este correo.
      </div>
    </div>
  `;
  
  try {
    for (const recipient of emails) {
      await transporter.sendMail({
        from: '"Sistema ACV" <no-reply@sumardigital.com.ar>',
        to: recipient.email,
        cc: recipient.cc,
        subject: `[${recipient.role}] Nuevo Código ACV - ${preAssignedHospital}`,
        html: emailContent,
      });
    }
    
    res.json({ success: true, status, preAssignedHospitalId, etaText, etaSeconds });
  } catch (error) {
    console.error("Error sending emails:", error);
    res.status(500).json({ success: false, error: "Error sending emails" });
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
