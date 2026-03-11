import React, { useState, useEffect } from 'react';
import { AcvCase, PatientData } from '../types';
import { HomeMobile } from './prehospital/HomeMobile';
import { PreHospitalForm } from './prehospital/PreHospitalForm';
import { CaseDetail } from './prehospital/CaseDetail';

interface PreHospitalViewProps {
  onLogout: () => void;
  onSubmitCase: (patientData: PatientData, status?: any, preAssignedHospitalId?: string, etaText?: string) => void;
  onArriveCase?: (caseId: string) => void;
  activeCase: AcvCase | null;
  cases: AcvCase[];
  onClearActiveCase: () => void;
}

export function PreHospitalView({ onLogout, onSubmitCase, onArriveCase, activeCase, cases, onClearActiveCase }: PreHospitalViewProps) {
  const [viewMode, setViewMode] = useState<'HOME' | 'FORM' | 'DETAIL'>('HOME');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (activeCase) {
      setViewMode('DETAIL');
      setSelectedCaseId(activeCase.id);
    } else {
      // If no active case passed from parent, default to HOME unless we are in FORM mode
      if (viewMode === 'DETAIL') {
         setViewMode('HOME');
      }
    }
  }, [activeCase]);

  const currentDetailCase = cases.find(c => c.id === selectedCaseId);

  if (viewMode === 'DETAIL' && currentDetailCase) {
    return (
      <CaseDetail 
        caseData={currentDetailCase} 
        onBack={() => {
          setViewMode('HOME');
          onClearActiveCase();
        }}
        onArrive={onArriveCase}
      />
    );
  }

  if (viewMode === 'FORM') {
    return (
      <PreHospitalForm 
        onSubmit={(data, status, preAssignedHospitalId, etaText) => {
          onSubmitCase(data, status, preAssignedHospitalId, etaText);
          // The parent will update activeCase, which triggers the effect to switch to DETAIL
        }}
        onCancel={() => setViewMode('HOME')}
      />
    );
  }

  return (
    <HomeMobile 
      onLogout={onLogout}
      onNewCase={() => setViewMode('FORM')}
      onSelectCase={(caseId) => {
        setSelectedCaseId(caseId);
        setViewMode('DETAIL');
      }}
      cases={cases}
    />
  );
}
