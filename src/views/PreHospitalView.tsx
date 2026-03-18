import React, { useState } from 'react';
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

  const currentDetailCase = cases.find(c => c.id === selectedCaseId);

  if (viewMode === 'DETAIL' && currentDetailCase) {
    return (
      <CaseDetail
        caseData={currentDetailCase}
        onBack={() => {
          setViewMode('HOME');
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
          setViewMode('HOME');
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
      activeCase={activeCase}
      onDismissCase={onClearActiveCase}
    />
  );
}
