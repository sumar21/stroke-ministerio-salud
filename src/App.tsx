import React, { useState } from 'react';
import { Role, AcvCase, PatientData } from './types';
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
      coverage: 'PAMI',
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
  
  // For the pre-hospital view, we track the active case they just created
  const [activeAmbulanceCaseId, setActiveAmbulanceCaseId] = useState<string | null>(null);

  const handleLogin = (selectedRole: Role) => {
    setRole(selectedRole);
  };

  const handleLogout = () => {
    setRole(null);
    setActiveAmbulanceCaseId(null);
  };

  const handleSubmitCase = (patientData: PatientData) => {
    const newCase: AcvCase = {
      id: `ACV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING_ASSIGNMENT',
      patient: patientData
    };
    setCases(prev => [...prev, newCase]);
    setActiveAmbulanceCaseId(newCase.id);
  };

  const handleAssignHospital = (caseId: string, hospitalId: string) => {
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
        activeCase={activeCase}
      />
    );
  }

  if (role === 'DINESA') {
    return (
      <DinesaView 
        onLogout={handleLogout}
        cases={cases}
        onAssignHospital={handleAssignHospital}
      />
    );
  }

  return null;
}
