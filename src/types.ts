export type Role = 'AMBULANCE' | 'COORDINATION' | 'DINESA' | 'ADMIN' | null;

export type RecentPregnancy = 'en_curso' | '3_meses' | '6_meses';

export type CaseStatus =
  | 'DRAFT'
  | 'SAVED'
  | 'PENDING_ASSIGNMENT'
  | 'PRE_ASSIGNED'
  | 'ASSIGNED_EN_ROUTE'
  | 'REASSIGNED'
  | 'ARRIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PatientData {
  // Módulo 1 - Datos del paciente
  id: string; // DNI
  name: string;
  age: number | '';
  sex: 'M' | 'F' | 'X' | '';
  hasCoverage?: boolean | null; // Cobertura Sí/No
  // Módulo 2 - Parámetros clínicos
  systolicBP?: number | '';
  diastolicBP?: number | '';
  bloodPressureMeds?: boolean | null;
  glucemia?: number | '';
  temperature?: number | '';
  heartRate?: number | '';
  pulseRegular?: boolean | null;
  recentPregnancy?: RecentPregnancy | null; // null = No
  priorStroke?: boolean | null;
  recentCranialTrauma?: boolean | null;
  // Módulo 3 - Síntomas BE-FAST
  symptomOnsetTime: string;
  symptoms: string[]; // IDs of BE-FAST questions answered "Sí"
  contactInfo: string;
  clinicalObservations: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface HospitalAssignment {
  hospitalId: string;
  assignedAt: string;
}

export interface AcvCase {
  id: string;
  createdAt: string;
  status: CaseStatus;
  patient: PatientData;
  preAssignedHospitalId?: string;
  etaText?: string;
  assignedHospitalId?: string;
  assignedAt?: string;
  hospitalHistory?: HospitalAssignment[];
  cancellationObservation?: string;
}

export interface Hospital {
  id: string;
  name: string;
  isStrokeCenter: boolean;
  strokeCenterId?: string; // required when isStrokeCenter is false
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  distance?: number; // mock distance for UI
  email?: string;
}

export interface OperativeCenter {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password?: string;
  role: string;
  operativeCenterId?: string;
}
