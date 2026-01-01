/**
 * study.ts
 *
 * Study 관련 타입 정의
 *
 * 목적:
 * - Study 데이터 구조 정의
 * - 검색 파라미터 타입 정의
 */

/**
 * Study 인터페이스
 *
 * mockData.ts의 MOCK_STUDIES와 동일한 구조
 */
export interface Study {
  id: string;                    // 내부 ID (STU-001)
  studyInstanceUid: string;      // DICOM Study Instance UID
  patientId: string;             // 환자 ID (PAT-001)
  patientName: string;           // 환자 이름
  studyDate: string;             // 검사 날짜 (YYYY-MM-DD)
  studyTime: string;             // 검사 시간 (HH:mm:ss)
  modality: string;              // Modality (CT, MR, XR, US, etc.)
  studyDescription: string;      // Study 설명
  seriesCount: number;           // Series 개수
  instancesCount: number;        // Instance 개수
}

/**
 * Study 검색 파라미터
 *
 * 모든 필드가 선택적(optional)
 */
export interface StudySearchParams {
  patientId?: string;            // 환자 ID로 필터링
  patientName?: string;          // 환자 이름 검색
  studyDate?: string;            // 검사 날짜 (YYYY-MM-DD)
  modality?: string;             // Modality 필터 (CT, MR, XR, US, ALL)
}
