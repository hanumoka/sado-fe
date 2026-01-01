/**
 * upload.ts
 *
 * Upload 관련 타입 정의
 *
 * 목적:
 * - 업로드 파일 정보 구조 정의
 * - 업로드 진행 상태 타입 정의
 * - API 응답 타입 정의
 */

/**
 * 업로드 파일 정보
 */
export interface UploadFile {
  file: File;                    // 원본 File 객체
  id: string;                    // 고유 ID (uuid)
  name: string;                  // 파일명
  size: number;                  // 파일 크기 (bytes)
  status: UploadStatus;          // 업로드 상태
  progress: number;              // 진행률 (0-100)
  error?: string;                // 에러 메시지 (실패 시)
}

/**
 * 업로드 상태
 */
export type UploadStatus =
  | 'pending'    // 대기 중
  | 'uploading'  // 업로드 중
  | 'success'    // 성공
  | 'error';     // 실패

/**
 * 업로드 API 응답
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  instanceId?: string;           // 생성된 Instance ID
  studyInstanceUid?: string;     // Study Instance UID
  seriesInstanceUid?: string;    // Series Instance UID
  sopInstanceUid?: string;       // SOP Instance UID
}
