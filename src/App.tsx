import React, { useRef, useState } from 'react';
import { Role, AcvCase, PatientData, CaseStatus, Hospital, HospitalAssignment } from './types';
import { LoginView } from './views/LoginView';
import { PreHospitalView } from './views/PreHospitalView';
import { DinesaView } from './views/DinesaView';
import { HospitalSelectView } from './views/HospitalSelectView';
import { mockHospitals } from './data/mockHospitals';

const initialMockCases: AcvCase[] = [
  {
    id: 'ACV-0041',
    createdAt: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
    status: 'ARRIVED',
    preAssignedHospitalId: 'h1',
    assignedHospitalId: 'h1',
    assignedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    etaText: '18 min',
    patient: {
      id: '28541763',
      name: 'Roberto Fernández',
      age: 67,
      sex: 'M',
      hasCoverage: true,
      symptomOnsetTime: '08:45',
      symptoms: ['cara', 'brazos', 'habla'],
      contactInfo: '011-4523-8871',
      clinicalObservations: 'Paciente hipertenso. TA 180/110.',
      location: { lat: -34.799, lng: -58.271, address: 'Av. Mitre 1230, Quilmes, Buenos Aires' },
    },
  },
  {
    id: 'ACV-0057',
    createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    status: 'ASSIGNED_EN_ROUTE',
    preAssignedHospitalId: 'h2',
    assignedHospitalId: 'h2',
    assignedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    etaText: '22 min',
    patient: {
      id: '35218904',
      name: 'María Elena Soria',
      age: 54,
      sex: 'F',
      hasCoverage: false,
      symptomOnsetTime: '10:15',
      symptoms: ['vision', 'equilibrio'],
      contactInfo: '011-6712-4490',
      clinicalObservations: '',
      location: { lat: -34.618, lng: -58.561, address: 'Calle Rivadavia 450, Morón, Buenos Aires' },
    },
  },
  {
    id: 'ACV-0033',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    status: 'CANCELLED',
    preAssignedHospitalId: 'h4',
    assignedHospitalId: 'h4',
    cancellationObservation: 'Paciente estabilizado en origen. Traslado no requerido.',
    patient: {
      id: '22184537',
      name: 'Jorge Héctor Medina',
      age: 71,
      sex: 'M',
      hasCoverage: true,
      symptomOnsetTime: '07:30',
      symptoms: ['cara', 'brazos'],
      contactInfo: '011-4256-9031',
      clinicalObservations: 'Síntomas resueltos antes del traslado.',
      location: { lat: -34.773, lng: -58.213, address: 'Av. 14 2100, Berazategui, Buenos Aires' },
    },
  },
];

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [cases, setCases] = useState<AcvCase[]>(initialMockCases);
  const assignmentLocksRef = useRef<Set<string>>(new Set());
  const [selectedCoordinationHospital, setSelectedCoordinationHospital] = useState<Hospital | null>(null);

  // For the pre-hospital view, we track the active case they just created
  const [activeAmbulanceCaseId, setActiveAmbulanceCaseId] = useState<string | null>(null);

  const handleLogin = (selectedRole: Role) => {
    setRole(selectedRole);
  };

  const handleLogout = () => {
    setRole(null);
    setSelectedCoordinationHospital(null);
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
    if (status !== 'SAVED') setActiveAmbulanceCaseId(newCase.id);
  };

  const handleArriveCase = (caseId: string) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          status: 'ARRIVED',
          assignedAt: new Date().toISOString()
        };
      }
      return c;
    }));
    setActiveAmbulanceCaseId(null);
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
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    if (currentCase) {
      const patientData = currentCase.patient;
      const oldHospitalId = currentCase.assignedHospitalId ?? null;
      const wasPreAssignedDifferently = currentCase.preAssignedHospitalId && currentCase.preAssignedHospitalId !== hospitalId;

      if (oldHospitalId && oldHospitalId !== hospitalId) {
        // Already assigned to a hospital and now changing → reassign
        fetch('/api/reassign-hospital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId,
            patientData,
            cancelledHospitalId: oldHospitalId,
            newHospitalId: hospitalId,
            etaText: currentCase.etaText ?? null,
            requestId,
          }),
        }).catch(err => console.error('[EMAIL] Error al enviar correos de reasignación:', err));
      } else if (wasPreAssignedDifferently) {
        // DINESA changing from pre-assigned to a different hospital
        fetch('/api/reassign-hospital', {
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
        }).catch(err => console.error('[EMAIL] Error al enviar correos de reasignación:', err));
      } else if (!currentCase.preAssignedHospitalId && !oldHospitalId) {
        // First manual assignment with no pre-assignment from submit-acv
        fetch('/api/confirm-hospital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId,
            patientData,
            confirmedHospitalId: hospitalId,
            etaText: currentCase.etaText ?? null,
            requestId,
          }),
        }).catch(err => console.error('[EMAIL] Error al enviar correo de confirmación:', err));
      }
      // else: preAssignedHospitalId === hospitalId (DINESA approving same pre-assigned) → no email, submit-acv already notified
    }

    try {
      setCases(prev => prev.map(c => {
        if (c.id === caseId) {
          const now = new Date().toISOString();
          const isReassignment = c.assignedHospitalId && c.assignedHospitalId !== hospitalId;
          const newStatus = isReassignment && c.status !== 'REASSIGNED'
            ? 'REASSIGNED'
            : c.status === 'REASSIGNED'
              ? 'REASSIGNED'
              : 'ASSIGNED_EN_ROUTE';
          const prevEntry: HospitalAssignment | null =
            c.assignedHospitalId ? { hospitalId: c.assignedHospitalId, assignedAt: c.assignedAt ?? now } : null;
          return {
            ...c,
            status: newStatus,
            assignedHospitalId: hospitalId,
            assignedAt: now,
            hospitalHistory: prevEntry
              ? [...(c.hospitalHistory ?? []), prevEntry]
              : (c.hospitalHistory ?? []),
          };
        }
        return c;
      }));

      return true;
    } finally {
      assignmentLocksRef.current.delete(lockKey);
    }
  };


  const handleCancelCase = (caseId: string, observation: string) => {
    const currentCase = cases.find(c => c.id === caseId);
    if (currentCase) {
      const cancelledBy = role === 'DINESA'
        ? 'Centro Coordinador Nacional (DINESA)'
        : role === 'COORDINATION'
          ? `Centro Stroke: ${selectedCoordinationHospital?.name ?? 'Hospital'}`
          : role ?? 'Usuario del sistema';
      fetch('/api/cancel-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          patientData: currentCase.patient,
          assignedHospitalId: currentCase.assignedHospitalId ?? null,
          observation,
          cancelledBy,
        }),
      }).catch(err => console.error('[EMAIL] Error al enviar correo de cancelación:', err));
    }
    setCases(prev => prev.map(c =>
      c.id === caseId
        ? { ...c, status: 'CANCELLED', cancellationObservation: observation }
        : c
    ));
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
    if (!selectedCoordinationHospital) {
      return (
        <HospitalSelectView
          onSelect={setSelectedCoordinationHospital}
          onLogout={handleLogout}
        />
      );
    }

    // Filter cases visible to this hospital
    const coordinationCases = cases.filter(c => {
      const hospital = selectedCoordinationHospital;

      if (c.status === 'PRE_ASSIGNED') {
        // Only the pre-assigned hospital sees it directly
        if (c.preAssignedHospitalId === hospital.id) return true;
        // Stroke centers also see cases pre-assigned to their intermediaries
        if (hospital.isStrokeCenter) {
          const preAssigned = mockHospitals.find(h => h.id === c.preAssignedHospitalId);
          return preAssigned?.strokeCenterId === hospital.id;
        }
        return false;
      }

      if (c.status === 'PENDING_ASSIGNMENT') {
        // No pre-assignment — only stroke centers see these (intermediaries cannot act on them)
        return hospital.isStrokeCenter === true;
      }

      // ASSIGNED_EN_ROUTE, REASSIGNED, ARRIVED, CANCELLED
      const relevantId = c.assignedHospitalId;
      if (!relevantId) return false;
      if (relevantId === hospital.id) return true;
      if (hospital.isStrokeCenter) {
        const assignedHospital = mockHospitals.find(h => h.id === relevantId);
        return assignedHospital?.strokeCenterId === hospital.id;
      }
      return false;
    });

    return (
      <DinesaView
        mode="COORDINATION"
        onLogout={handleLogout}
        cases={coordinationCases}
        onAssignHospital={handleAssignHospital}
        onCancelCase={handleCancelCase}
        selectedHospital={selectedCoordinationHospital}
        onChangeHospital={() => setSelectedCoordinationHospital(null)}
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
        onCancelCase={handleCancelCase}
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
        onCancelCase={handleCancelCase}
      />
    );
  }

  return null;
}
