/**
 * Admin Dashboard 관련 TypeScript 타입 정의
 */

/**
 * Dashboard 전체 통계
 */
export interface DashboardSummary {
  totalPatients: number
  totalStudies: number
  totalSeries: number
  totalInstances: number
  storageSummary: StorageSummary
  tierDistribution: TierDistribution
}

/**
 * 스토리지 사용량 요약
 */
export interface StorageSummary {
  totalSize: number // bytes
  hotSize: number // bytes
  warmSize: number // bytes
  coldSize: number // bytes
}

/**
 * Storage Tier 분포
 */
export interface TierDistribution {
  hot: number // bytes
  warm: number // bytes
  cold: number // bytes
}

/**
 * FileAsset 요약 정보 (Tiering 관리용)
 */
export interface FileAssetSummary {
  id: number
  storagePath: string // S3 Key (예: "dicom/123/instance.dcm")
  fileCategory: string // DICOM, AI_RESULT, CLINICAL_DOC, SYSTEM, EXPORT
  storageTier: string // HOT, WARM, COLD
  fileSize: number // bytes
  lastAccessedAt: string // ISO datetime
  createdAt: string // ISO datetime
}

/**
 * Storage Tiering 정책 정보
 */
export interface TieringPolicies {
  hotToWarmDays: number // HOT → WARM 전환 기준 일수
  warmToColdDays: number // WARM → COLD 전환 기준 일수
  schedulerEnabled: boolean // 자동 Tiering 스케줄러 활성화 여부
  hotToWarmSchedule: string // Cron 표현식 (예: "0 0 3 * * *")
  warmToColdSchedule: string // Cron 표현식 (예: "0 0 4 * * *")
}

/**
 * 카테고리별 스토리지 사용량 메트릭
 */
export interface CategoryStorageMetrics {
  category: string // DICOM, AI_RESULT, CLINICAL_DOC, SYSTEM, EXPORT
  fileCount: number // 파일 개수
  totalSize: number // 총 크기 (bytes)
}

/**
 * 테넌트별 스토리지 사용량 메트릭
 * 원본 파일(DICOM)과 사전렌더링 파일(SYSTEM) 구분
 */
export interface TenantStorageMetrics {
  tenantId: number
  tenantName?: string
  originalFileCount: number   // 원본 파일 개수 (DICOM)
  originalSize: number        // 원본 파일 크기 (bytes)
  preRenderedFileCount: number // 사전렌더링 파일 개수 (SYSTEM)
  preRenderedSize: number     // 사전렌더링 파일 크기 (bytes)
  totalSize: number           // 총 크기 (bytes)
}

/**
 * 스토리지 메트릭 트렌드 (시계열 데이터)
 */
export interface StorageMetricsTrend {
  timestamp: string // ISO datetime
  totalSize: number // bytes
  hotSize: number // bytes
  warmSize: number // bytes
  coldSize: number // bytes
  fileCount: number // 전체 파일 개수
  hotFileCount: number // HOT Tier 파일 개수
  warmFileCount: number // WARM Tier 파일 개수
  coldFileCount: number // COLD Tier 파일 개수
}

/**
 * SeaweedFS 물리적 스토리지 용량 정보
 */
export interface SeaweedFSCapacity {
  totalCapacity: number   // bytes
  usedSpace: number       // bytes
  freeSpace: number       // bytes
  percentUsed: number     // 0.00 ~ 100.00
}

/**
 * Spring Page 응답 (페이징)
 */
export interface PageResponse<T> {
  content: T[] // 현재 페이지 데이터
  totalElements: number // 전체 요소 수
  totalPages: number // 전체 페이지 수
  size: number // 페이지 크기
  number: number // 현재 페이지 번호 (0부터 시작)
  first: boolean // 첫 페이지 여부
  last: boolean // 마지막 페이지 여부
}

/**
 * Tier 전환 이력
 */
export interface TierTransitionHistory {
  id: number
  fileAssetId: number
  storagePath: string
  fromTier: 'HOT' | 'WARM' | 'COLD'
  toTier: 'HOT' | 'WARM' | 'COLD'
  reason: string
  transitionType: 'MANUAL' | 'AUTO'
  performedBy: string
  transitionedAt: string // ISO datetime
  tenantId: number
}

// ========== 실시간 모니터링 타입 ==========

/**
 * 모니터링 작업 현황 응답
 */
export interface MonitoringTasksResponse {
  uploadTasks: UploadTask[]
  renderingTasks: RenderingTask[]
  summary: TaskSummary
}

/**
 * 업로드 작업
 */
export interface UploadTask {
  instanceId: number
  sopInstanceUid: string
  studyDescription?: string
  modality?: string
  fileSize: number
  uploadedAt: string // ISO datetime
  renderingStatus: 'NONE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  tenantId: number
}

/**
 * 사전렌더링 작업
 */
export interface RenderingTask {
  instanceId: number
  sopInstanceUid: string
  studyDescription?: string
  modality?: string
  status: 'PENDING' | 'PROCESSING'
  totalFrames: number
  renderedFrames: number
  renderedSize?: number
  startedAt?: string // ISO datetime
  progressPercent: number
  tenantId: number
}

/**
 * 작업 요약 통계
 */
export interface TaskSummary {
  totalPending: number
  totalProcessing: number
  recentCompleted: number // 최근 1시간 내 완료
  recentFailed: number    // 최근 1시간 내 실패
}
