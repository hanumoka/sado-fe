/**
 * Multi-Slot Viewer Types
 *
 * Cornerstone.js 기반 멀티 슬롯 뷰어를 위한 타입 정의
 * mini-pacs-poc 참고
 */

// ==================== 레이아웃 타입 ====================

/** 그리드 레이아웃 타입 (1x1, 2x2, 3x3, 4x4) */
export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4'

/** API 타입 (DICOM 이미지 로딩 방식) */
export type ApiType = 'wado-rs' | 'wado-uri'

// ==================== Instance 정보 ====================

/** Instance 요약 정보 (멀티 슬롯 뷰어용) */
export interface InstanceSummary {
  sopInstanceUid: string
  studyInstanceUid: string
  seriesInstanceUid: string
  numberOfFrames: number
  patientName?: string
  modality?: string
}

// ==================== 성능 통계 ====================

/** 슬롯별 성능 통계 */
export interface SlotPerformanceStats {
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

/** Cornerstone 슬롯 상태 */
export interface CornerstoneSlotState {
  /** 할당된 인스턴스 */
  instance: InstanceSummary | null
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
  performanceStats: SlotPerformanceStats
}

// ==================== Store 상태 ====================

/** Cornerstone Multi Viewer 전체 상태 */
export interface CornerstoneMultiViewerState {
  /** 레이아웃 (1x1, 2x2, 3x3) */
  layout: GridLayout
  /** API 타입 */
  apiType: ApiType
  /** 전역 FPS 설정 */
  globalFps: number
  /** 슬롯 상태 (최대 16개) */
  slots: Record<number, CornerstoneSlotState>
  /** 사용 가능한 인스턴스 목록 */
  availableInstances: InstanceSummary[]
  /** 썸네일 로딩 완료된 인스턴스 (sopInstanceUid Set) */
  thumbnailsLoaded: Set<string>
  /** 총 썸네일 개수 */
  totalThumbnailCount: number
  /** 모든 썸네일 로딩 완료 여부 */
  allThumbnailsLoaded: boolean
}

// ==================== 드래그 앤 드롭 ====================

/** 드래그앤드롭 데이터 */
export interface DragDropInstanceData {
  studyInstanceUid: string
  seriesInstanceUid: string
  sopInstanceUid: string
  instanceNumber?: number
}

// ==================== Cine 정보 ====================

/** Cine 재생 정보 (심장초음파 등) */
export interface CineInfo {
  sopInstanceUid: string
  numberOfFrames: number
  frameTime?: number
  cineRate?: number
  recommendedDisplayFrameRate?: number
  durationMs?: number
  hasColorDoppler?: boolean
}

/** 재생 가능한 Instance */
export interface PlayableInstance extends InstanceSummary {
  cineInfo?: CineInfo
  thumbnailUrl?: string
}
