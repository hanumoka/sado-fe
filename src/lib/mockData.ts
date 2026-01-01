/**
 * mockData.ts
 *
 * Week 1-5 Mock 데이터
 *
 * BE API가 준비되기 전까지 사용할 샘플 데이터
 * Week 6-7 DICOMWeb API 완성 후 Real API로 전환
 */

export interface Patient {
  id: string;
  dicomPatientId: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  issuer: string;
  studiesCount: number;
  lastStudyDate: string;
}

export interface Study {
  id: string;
  studyInstanceUid: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  studyTime: string;
  modality: string;
  studyDescription: string;
  seriesCount: number;
  instancesCount: number;
}

export interface Series {
  id: string;
  seriesInstanceUid: string;
  studyId: string;
  seriesNumber: number;
  modality: string;
  seriesDescription: string;
  instancesCount: number;
}

export interface Instance {
  id: string;
  sopInstanceUid: string;
  seriesId: string;
  instanceNumber: number;
  storageUri: string;
}

// Mock 환자 데이터 (10명)
export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'PAT-001',
    dicomPatientId: 'patient001',
    name: 'John Doe',
    age: 45,
    gender: 'M',
    issuer: 'HOSPITAL_A',
    studiesCount: 3,
    lastStudyDate: '2025-12-25',
  },
  {
    id: 'PAT-002',
    dicomPatientId: 'patient002',
    name: 'Jane Smith',
    age: 32,
    gender: 'F',
    issuer: 'HOSPITAL_A',
    studiesCount: 2,
    lastStudyDate: '2025-12-20',
  },
  {
    id: 'PAT-003',
    dicomPatientId: 'patient003',
    name: 'Mike Johnson',
    age: 58,
    gender: 'M',
    issuer: 'HOSPITAL_B',
    studiesCount: 5,
    lastStudyDate: '2025-12-15',
  },
  {
    id: 'PAT-004',
    dicomPatientId: 'patient004',
    name: 'Emily Davis',
    age: 27,
    gender: 'F',
    issuer: 'HOSPITAL_A',
    studiesCount: 1,
    lastStudyDate: '2025-12-10',
  },
  {
    id: 'PAT-005',
    dicomPatientId: 'patient005',
    name: 'Robert Brown',
    age: 63,
    gender: 'M',
    issuer: 'HOSPITAL_C',
    studiesCount: 4,
    lastStudyDate: '2025-12-05',
  },
  {
    id: 'PAT-006',
    dicomPatientId: 'patient006',
    name: 'Sarah Wilson',
    age: 41,
    gender: 'F',
    issuer: 'HOSPITAL_B',
    studiesCount: 2,
    lastStudyDate: '2025-11-30',
  },
  {
    id: 'PAT-007',
    dicomPatientId: 'patient007',
    name: 'David Lee',
    age: 36,
    gender: 'M',
    issuer: 'HOSPITAL_A',
    studiesCount: 3,
    lastStudyDate: '2025-11-25',
  },
  {
    id: 'PAT-008',
    dicomPatientId: 'patient008',
    name: 'Lisa Taylor',
    age: 29,
    gender: 'F',
    issuer: 'HOSPITAL_C',
    studiesCount: 1,
    lastStudyDate: '2025-11-20',
  },
  {
    id: 'PAT-009',
    dicomPatientId: 'patient009',
    name: 'James Anderson',
    age: 52,
    gender: 'M',
    issuer: 'HOSPITAL_B',
    studiesCount: 6,
    lastStudyDate: '2025-11-15',
  },
  {
    id: 'PAT-010',
    dicomPatientId: 'patient010',
    name: 'Michelle Martinez',
    age: 38,
    gender: 'F',
    issuer: 'HOSPITAL_A',
    studiesCount: 2,
    lastStudyDate: '2025-11-10',
  },
];

// Mock Study 데이터 (5개)
export const MOCK_STUDIES: Study[] = [
  {
    id: 'STU-001',
    studyInstanceUid: '1.2.840.113619.2.55.3.1',
    patientId: 'PAT-001',
    patientName: 'John Doe',
    studyDate: '2025-12-25',
    studyTime: '14:30:00',
    modality: 'CT',
    studyDescription: 'Chest CT',
    seriesCount: 3,
    instancesCount: 150,
  },
  {
    id: 'STU-002',
    studyInstanceUid: '1.2.840.113619.2.55.3.2',
    patientId: 'PAT-002',
    patientName: 'Jane Smith',
    studyDate: '2025-12-20',
    studyTime: '10:15:00',
    modality: 'MR',
    studyDescription: 'Brain MRI',
    seriesCount: 4,
    instancesCount: 200,
  },
  {
    id: 'STU-003',
    studyInstanceUid: '1.2.840.113619.2.55.3.3',
    patientId: 'PAT-003',
    patientName: 'Mike Johnson',
    studyDate: '2025-12-15',
    studyTime: '09:00:00',
    modality: 'XR',
    studyDescription: 'Chest X-Ray',
    seriesCount: 1,
    instancesCount: 2,
  },
  {
    id: 'STU-004',
    studyInstanceUid: '1.2.840.113619.2.55.3.4',
    patientId: 'PAT-004',
    patientName: 'Emily Davis',
    studyDate: '2025-12-10',
    studyTime: '16:45:00',
    modality: 'US',
    studyDescription: 'Abdominal Ultrasound',
    seriesCount: 2,
    instancesCount: 50,
  },
  {
    id: 'STU-005',
    studyInstanceUid: '1.2.840.113619.2.55.3.5',
    patientId: 'PAT-005',
    patientName: 'Robert Brown',
    studyDate: '2025-12-05',
    studyTime: '11:20:00',
    modality: 'CT',
    studyDescription: 'Abdominal CT',
    seriesCount: 3,
    instancesCount: 180,
  },
];

// Mock Series 데이터 (3개)
export const MOCK_SERIES: Series[] = [
  {
    id: 'SER-001',
    seriesInstanceUid: '1.2.840.113619.2.55.3.1.1',
    studyId: 'STU-001',
    seriesNumber: 1,
    modality: 'CT',
    seriesDescription: 'Axial',
    instancesCount: 50,
  },
  {
    id: 'SER-002',
    seriesInstanceUid: '1.2.840.113619.2.55.3.1.2',
    studyId: 'STU-001',
    seriesNumber: 2,
    modality: 'CT',
    seriesDescription: 'Coronal',
    instancesCount: 50,
  },
  {
    id: 'SER-003',
    seriesInstanceUid: '1.2.840.113619.2.55.3.1.3',
    studyId: 'STU-001',
    seriesNumber: 3,
    modality: 'CT',
    seriesDescription: 'Sagittal',
    instancesCount: 50,
  },
];

// Mock Instance 데이터 (3개)
export const MOCK_INSTANCES: Instance[] = [
  {
    id: 'INS-001',
    sopInstanceUid: '1.2.840.113619.2.55.3.1.1.1',
    seriesId: 'SER-001',
    instanceNumber: 1,
    storageUri: 'seaweedfs://1,001234567890',
  },
  {
    id: 'INS-002',
    sopInstanceUid: '1.2.840.113619.2.55.3.1.1.2',
    seriesId: 'SER-001',
    instanceNumber: 2,
    storageUri: 'seaweedfs://1,001234567891',
  },
  {
    id: 'INS-003',
    sopInstanceUid: '1.2.840.113619.2.55.3.1.1.3',
    seriesId: 'SER-001',
    instanceNumber: 3,
    storageUri: 'seaweedfs://1,001234567892',
  },
];
