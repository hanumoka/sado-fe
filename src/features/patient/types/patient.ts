/**
 * patient.ts
 *
 * Patient 관련 타입 정의
 *
 * 목적:
 * - Patient 데이터 구조 정의
 * - 검색 파라미터 타입 정의
 */

/**
 * Patient 인터페이스
 *
 * mockData.ts의 MOCK_PATIENTS와 동일한 구조
 */
export interface Patient {
  id: string;                 // 내부 ID (PAT-001)
  dicomPatientId: string;     // DICOM Patient ID
  name: string;               // 환자 이름
  age: number;                // 나이
  gender: 'M' | 'F';          // 성별 (M: 남성, F: 여성)
  issuer: string;             // 발급 기관
  studiesCount: number;       // Study 개수
  lastStudyDate: string;      // 최근 Study 날짜 (YYYY-MM-DD)
}

/**
 * 환자 검색 파라미터
 *
 * 모든 필드가 선택적(optional)
 */
export interface PatientSearchParams {
  name?: string;              // 이름 검색
  gender?: 'M' | 'F' | 'ALL'; // 성별 필터 (ALL: 전체)
}
