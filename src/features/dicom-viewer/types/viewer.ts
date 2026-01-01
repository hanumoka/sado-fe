/**
 * viewer.ts
 *
 * DICOM Viewer 관련 타입 정의
 *
 * 목적:
 * - Instance 데이터 구조 정의
 * - Viewer 도구 타입 정의
 * - Window/Level 설정 타입 정의
 */

/**
 * DICOM Instance 인터페이스
 */
export interface Instance {
  id: string;                    // 내부 ID (INS-001)
  sopInstanceUid: string;        // DICOM SOP Instance UID
  seriesId: string;              // Series ID
  studyId: string;               // Study ID
  instanceNumber: number;        // Instance 번호
  storageUri: string;            // 스토리지 URI
  rows?: number;                 // 이미지 행 수
  columns?: number;              // 이미지 열 수
  pixelSpacing?: [number, number]; // 픽셀 간격 [행, 열]
}

/**
 * Series 인터페이스 (Viewer에서 필요한 정보)
 */
export interface ViewerSeries {
  id: string;
  seriesInstanceUid: string;
  seriesNumber: number;
  modality: string;
  seriesDescription: string;
  instancesCount: number;
}

/**
 * Viewer 도구 타입
 */
export type ViewerTool =
  | 'WindowLevel'   // 창/레벨 조정
  | 'Zoom'          // 확대/축소
  | 'Pan'           // 이동
  | 'Length'        // 길이 측정
  | 'Angle'         // 각도 측정
  | 'Rectangle'     // 사각형 ROI
  | 'Reset';        // 초기화

/**
 * Window/Level 프리셋
 */
export interface WindowLevelPreset {
  name: string;
  windowWidth: number;
  windowCenter: number;
}

/**
 * 기본 Window/Level 프리셋
 */
export const DEFAULT_PRESETS: WindowLevelPreset[] = [
  { name: 'CT Abdomen', windowWidth: 400, windowCenter: 40 },
  { name: 'CT Bone', windowWidth: 2000, windowCenter: 300 },
  { name: 'CT Brain', windowWidth: 80, windowCenter: 40 },
  { name: 'CT Lung', windowWidth: 1500, windowCenter: -600 },
  { name: 'CT Mediastinum', windowWidth: 350, windowCenter: 50 },
];
