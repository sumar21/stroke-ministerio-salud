export type Role = 'AMBULANCE' | 'DINESA' | null;

export type Coverage = 'OBRA_SOCIAL' | 'PREPAGA' | 'PUBLICO' | 'SIN_COBERTURA';

export type CaseStatus = 
  | 'DRAFT' 
  | 'PENDING_ASSIGNMENT' 
  | 'PRE_ASSIGNED'
  | 'ASSIGNED_EN_ROUTE' 
  | 'ARRIVED'
  | 'RECEIVED';

export interface PatientData {
  id: string; // DNI
  name: string;
  age: number | '';
  sex: 'M' | 'F' | 'X' | '';
  coverage: Coverage | '';
  symptomOnsetTime: string;
  symptoms: string[];
  contactInfo: string;
  clinicalObservations: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
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
}

export interface Hospital {
  id: string;
  name: string;
  isStrokeCenter: boolean;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  distance?: number; // mock distance for UI
  email?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password?: string;
  role: string;
}
