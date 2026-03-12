import React, { useRef, useState } from 'react';
import { Role, AcvCase, PatientData, CaseStatus } from './types';
import { LoginView } from './views/LoginView';
import { PreHospitalView } from './views/PreHospitalView';
import { DinesaView } from './views/DinesaView';

const initialMockCases: AcvCase[] = [
  {
    id: 'ACV-8492',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    status: 'PENDING_ASSIGNMENT',
    patient: {
      id: '28491033',
      name: 'Carlos Rodríguez',
      age: 65,
      sex: 'M',
      coverage: 'OBRA_SOCIAL',
      symptomOnsetTime: '08:30',
      symptoms: ['Hemiparesia derecha', 'Afasia', 'Desviación de comisura labial'],
      contactInfo: 'Hija (María) - 1145678901',
      clinicalObservations: 'Paciente hipertenso, refiere haber dejado la medicación hace 1 semana.',
      location: {
        lat: -34.6131,
        lng: -58.3772,
        address: 'Av. de Mayo 500, CABA'
      }
    }
  },
  {
    id: 'ACV-3105',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    status: 'ASSIGNED_EN_ROUTE',
    assignedHospitalId: 'h1',
    assignedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    patient: {
      id: '14552910',
      name: 'Marta Gómez',
      age: 72,
      sex: 'F',
      coverage: 'OBRA_SOCIAL',
      symptomOnsetTime: '07:15',
      symptoms: ['Pérdida de fuerza en brazo izquierdo', 'Dificultad para hablar'],
      contactInfo: 'Vecino - 1123456789',
      clinicalObservations: 'Paciente diabética. Glucemia capilar 140 mg/dl.',
      location: {
        lat: -34.7600,
        lng: -58.2100,
        address: 'Calle 14 123, Berazategui'
      }
    }
  }
];

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [cases, setCases] = useState<AcvCase[]>(initialMockCases);
  const assignmentLocksRef = useRef<Set<string>>(new Set());
  
  // For the pre-hospital view, we track the active case they just created
  const [activeAmbulanceCaseId, setActiveAmbulanceCaseId] = useState<string | null>(null);

  const handleLogin = (selectedRole: Role) => {
    setRole(selectedRole);
  };

  const handleLogout = () => {
    setRole(null);
    setActiveAmbulanceCaseId(null);
  };

  const handleSubmitCase = (patientData: PatientData, status: CaseStatus = 'PENDING_ASSIGNMENT', preAssignedHospitalId?: string, etaText?: string) => {
    const newCase: AcvCase = {
      id: `ACV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      status: status,
      preAssignedHospitalId: preAssignedHospitalId,
      etaText: etaText,
      patient: patientData
    };
    setCases(prev => [...prev, newCase]);
    setActiveAmbulanceCaseId(newCase.id);
  };

  const handleArriveCase = (caseId: string) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          status: 'ARRIVED',
          assignedAt: new Date().toISOString() // Using assignedAt as arrival time for metrics
        };
      }
      return c;
    }));
  };

  const handleAssignHospital = async (caseId: string, hospitalId: string): Promise<boolean> => {
    const lockKey = `${caseId}:${hospitalId}`;
    if (assignmentLocksRef.current.has(lockKey)) {
      return true;
    }
    assignmentLocksRef.current.add(lockKey);

    // Fetch calls MUST be outside the setCases updater — React 18 StrictMode
    // runs updater functions twice in development, which would send duplicate emails.
    const currentCase = cases.find(c => c.id === caseId);
    let emailRequestFailed = false;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    if (currentCase) {
      const patientData = currentCase.patient;

      if (currentCase.preAssignedHospitalId && currentCase.preAssignedHospitalId !== hospitalId) {
        // Hospital changed: cancellation to old + assignment to new
        try {
          const response = await fetch('/api/reassign-hospital', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caseId,
              patientData,
              cancelledHospitalId: currentCase.preAssignedHospitalId,
              newHospitalId: hospitalId,
              etaText: currentCase.etaText ?? null,
              requestId,
            }),
          });
          if (!response.ok) {
            emailRequestFailed = true;
            console.error('[EMAIL] Error HTTP en reasignación:', response.status);
          }
        } catch (err) {
          emailRequestFailed = true;
          console.error('[EMAIL] Error al enviar correos de reasignación:', err);
        }
      } else if (!currentCase.preAssignedHospitalId) {
        // No pre-assignment: fresh confirmation email
        try {
          const response = await fetch('/api/confirm-hospital', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caseId,
              patientData,
              confirmedHospitalId: hospitalId,
              etaText: currentCase.etaText ?? null,
              requestId,
            }),
          });
          if (!response.ok) {
            emailRequestFailed = true;
            console.error('[EMAIL] Error HTTP en confirmación:', response.status);
          }
        } catch (err) {
          emailRequestFailed = true;
          console.error('[EMAIL] Error al enviar correo de confirmación:', err);
        }
      }
      // preAssignedHospitalId === hospitalId: confirmed same hospital, no email needed
    }

    try {
      setCases(prev => prev.map(c => {
        if (c.id === caseId) {
          return {
            ...c,
            status: 'ASSIGNED_EN_ROUTE',
            assignedHospitalId: hospitalId,
            assignedAt: new Date().toISOString()
          };
        }
        return c;
      }));

      return !emailRequestFailed;
    } finally {
      assignmentLocksRef.current.delete(lockKey);
    }
  };


  if (!role) {
    return <LoginView onLogin={handleLogin} />;
  }

  if (role === 'AMBULANCE') {
    const activeCase = cases.find(c => c.id === activeAmbulanceCaseId) || null;
    return (
      <PreHospitalView 
        onLogout={handleLogout} 
        onSubmitCase={handleSubmitCase}
        onArriveCase={handleArriveCase}
        activeCase={activeCase}
        cases={cases}
        onClearActiveCase={() => setActiveAmbulanceCaseId(null)}
      />
    );
  }

  if (role === 'COORDINATION') {
    return (
      <DinesaView 
        mode="COORDINATION"
        onLogout={handleLogout}
        cases={cases}
        onAssignHospital={handleAssignHospital}
      />
    );
  }

  if (role === 'DINESA') {
    return (
      <DinesaView
        mode="DINESA"
        onLogout={handleLogout}
        cases={cases}
        onAssignHospital={handleAssignHospital}
      />
    );
  }

  if (role === 'ADMIN') {
    return (
      <DinesaView
        mode="ADMIN"
        onLogout={handleLogout}
        cases={cases}
        onAssignHospital={handleAssignHospital}
      />
    );
  }

  return null;
}
