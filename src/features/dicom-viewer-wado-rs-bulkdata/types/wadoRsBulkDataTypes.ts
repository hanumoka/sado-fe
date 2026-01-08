/**
 * WADO-RS BulkData Multi-Slot Viewer Types
 *
 * WADO-RS BulkData 기반 멀티 슬롯 뷰어를 위한 타입 정의
 * dicom-viewer, dicom-viewer-wado-uri와 완전 독립적으로 정의
 */

// ==================== 레이아웃 타입 ====================

/** 그리드 레이아웃 타입 (1x1, 2x2, 3x3, 4x4) */
export type WadoRsBulkDataGridLayout = '1x1' | '2x2' | '3x3' | '4x4'

// ==================== Instance 정보 ====================

/** Instance 요약 정보 (WADO-RS BulkData 멀티 슬롯 뷰어용) */
export interface WadoRsBulkDataInstanceSummary {
  sopInstanceUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  numberOfFrames: number
  patientName?: string
  modality?: string
}

// ==================== 성능 통계 ====================

/** 슬롯별 성능 통계 */
export interface WadoRsBulkDataSlotPerformanceStats {
  /** 현재 FPS */
  fps: number
  /** 평균 FPS */
  avgFps: number
  /** 프레임 드롭 횟수 */
  frameDrops: number
  /** 렌더링된 총 프레임 수 */
  totalFramesRendered: number
  /** FPS 히스토리 (최근 30개) */
  fpsHistory: number[]
  /** 마지막 프레임 시간 */
  lastFrameTime: number
}

// ==================== 슬롯 상태 ====================

/** WADO-RS BulkData 슬롯 상태 */
export interface WadoRsBulkDataSlotState {
  /** 할당된 인스턴스 */
  instance: WadoRsBulkDataInstanceSummary | null
  /** 현재 프레임 인덱스 (0-based) */
  currentFrame: number
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 프리로딩 중 여부 */
  isPreloading: boolean
  /** 프리로드 완료 여부 */
  isPreloaded: boolean
  /** 프리로드 진행률 (0-100) */
  preloadProgress: number
  /** 로딩 중 여부 */
  loading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 성능 통계 */
  performanceStats: WadoRsBulkDataSlotPerformanceStats
}

// ==================== Store 상태 ====================

/** WADO-RS BulkData Multi Viewer 전체 상태 */
export interface WadoRsBulkDataMultiViewerState {
  /** 레이아웃 (1x1, 2x2, 3x3, 4x4) */
  layout: WadoRsBulkDataGridLayout
  /** 전역 FPS 설정 */
  globalFps: number
  /** 슬롯 상태 (최대 16개) */
  slots: Record<number, WadoRsBulkDataSlotState>
  /** 사용 가능한 인스턴스 목록 */
  availableInstances: WadoRsBulkDataInstanceSummary[]
  /** 썸네일 로딩 완료된 인스턴스 (sopInstanceUid Set) */
  thumbnailsLoaded: Set<string>
  /** 총 썸네일 개수 */
  totalThumbnailCount: number
  /** 모든 썸네일 로딩 완료 여부 */
  allThumbnailsLoaded: boolean
}

// ==================== 드래그 앤 드롭 ====================

/** 드래그앤드롭 데이터 */
export interface WadoRsBulkDataDragDropData {
  studyInstanceUid: string
  seriesInstanceUid: string
  sopInstanceUid: string
  instanceNumber?: number
}

// ==================== Cine 정보 ====================

/** Cine 재생 정보 (심장초음파 등) */
export interface WadoRsBulkDataCineInfo {
  sopInstanceUid: string
  numberOfFrames: number
  frameTime?: number
  cineRate?: number
  recommendedDisplayFrameRate?: number
  durationMs?: number
  hasColorDoppler?: boolean
}

/** 재생 가능한 Instance */
export interface WadoRsBulkDataPlayableInstance extends WadoRsBulkDataInstanceSummary {
  cineInfo?: WadoRsBulkDataCineInfo
  thumbnailUrl?: string
}
