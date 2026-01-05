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
  file: File // 원본 File 객체
  id: string // 고유 ID (uuid)
  name: string // 파일명
  size: number // 파일 크기 (bytes)
  status: UploadStatus // 업로드 상태
  progress: number // 진행률 (0-100)
  error?: string // 에러 메시지 (실패 시)
  response?: UploadResponse // 업로드 응답 (성공 시)
}

/**
 * 업로드 상태
 */
export type UploadStatus =
  | 'pending' // 대기 중
  | 'uploading' // 업로드 중
  | 'success' // 성공
  | 'error' // 실패

/**
 * 업로드 API 응답
 */
export interface UploadResponse {
  success: boolean
  message: string
  instanceId?: string // 생성된 Instance ID
  studyInstanceUid?: string // Study Instance UID
  seriesInstanceUid?: string // Series Instance UID
  sopInstanceUid?: string // SOP Instance UID
}

/**
 * 업로드 결과 요약
 */
export interface UploadSummary {
  totalFiles: number // 전체 파일 수
  successCount: number // 성공 수
  errorCount: number // 실패 수
  totalSize: number // 전체 크기 (bytes)
  duration: number // 소요 시간 (ms)
  startTime?: Date // 시작 시간
  endTime?: Date // 종료 시간
}

/**
 * 프리뷰 파일 정보 (업로드 전 상태)
 *
 * 폴더 선택 시 업로드 전에 파일 목록을 미리 보여주기 위한 타입
 */
export interface PreviewFile {
  id: string // 고유 ID (uuid)
  file: File // 원본 File 객체
  name: string // 파일명
  size: number // 파일 크기 (bytes)
  relativePath: string // 폴더 내 상대 경로
  selected: boolean // 선택 여부 (기본값: true)
}

/**
 * 프리뷰 요약 정보
 */
export interface PreviewSummary {
  totalFiles: number // 전체 감지된 파일 수
  selectedFiles: number // 선택된 파일 수
  totalSize: number // 전체 크기 (bytes)
  selectedSize: number // 선택된 파일 크기 (bytes)
}
