/**
 * Hybrid MJPEG+WADO-RS Viewer Types
 *
 * 하이브리드 뷰어 전용 타입 정의
 * 기존 4개 뷰어 (RS-Rendered, WADO-RS, WADO-URI, MJPEG)와 완전 독립
 */

// ============================================================================
// Layout Types
// ============================================================================

/**
 * 지원 레이아웃 (1x1, 2x2, 3x2, 3x3만 지원)
 */
export type HybridGridLayout = '1x1' | '2x2' | '3x2' | '3x3'

/**
 * 레이아웃 설정
 */
export interface HybridLayoutConfig {
  cols: number
  rows: number
  slots: number
}

/**
 * 레이아웃별 설정
 */
export const HYBRID_LAYOUT_CONFIG: Record<HybridGridLayout, HybridLayoutConfig> = {
  '1x1': { cols: 1, rows: 1, slots: 1 },
  '2x2': { cols: 2, rows: 2, slots: 4 },
  '3x2': { cols: 3, rows: 2, slots: 6 },
  '3x3': { cols: 3, rows: 3, slots: 9 },
}

/**
 * 레이아웃별 Grid CSS 클래스
 */
export const HYBRID_LAYOUT_GRID_CLASSES: Record<HybridGridLayout, string> = {
  '1x1': 'grid-cols-1 grid-rows-1',
  '2x2': 'grid-cols-2 grid-rows-2',
  '3x2': 'grid-cols-3 grid-rows-2',
  '3x3': 'grid-cols-3 grid-rows-3',
}

/**
 * 최대 슬롯 수 (3x3)
 */
export const MAX_SLOTS = 9

// ============================================================================
// Instance Types
// ============================================================================

/**
 * 하이브리드 뷰어용 Instance 정보
 */
export interface HybridInstanceSummary {
  /** Instance Primary Key */
  id: number
  /** SOP Instance UID */
  sopInstanceUid: string
  /** Study Instance UID */
  studyInstanceUid: string
  /** Series Instance UID */
  seriesInstanceUid: string
  /** 프레임 수 */
  numberOfFrames: number
  /** 프레임 레이트 (fps) */
  frameRate: number
  /** Instance Number */
  instanceNumber?: number
}

// ============================================================================
// Phase / State Types
// ============================================================================

/**
 * 전환 단계 (상태 머신)
 *
 * Flow:
 * idle → mjpeg-loading → mjpeg-playing → transition-prepare → transitioning → cornerstone
 */
export type TransitionPhase =
  | 'idle'               // 인스턴스 없음
  | 'mjpeg-loading'      // MJPEG 프레임 로딩 중
  | 'mjpeg-playing'      // MJPEG 재생 + WADO-RS 백그라운드 로딩
  | 'transition-prepare' // MJPEG freeze + Cornerstone 첫 프레임 대기
  | 'transitioning'      // 크로스페이드 애니메이션 진행 중
  | 'cornerstone'        // Cornerstone 활성화

/**
 * MJPEG 레이어 상태
 */
export interface MjpegLayerState {
  /** 프레임 캐시 완료 여부 */
  isCached: boolean
  /** 캐시된 프레임 수 */
  cachedFrameCount: number
  /** 로딩 진행률 (0-100) */
  loadProgress: number
  /** 현재 프레임 인덱스 */
  currentFrame: number
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 에러 메시지 */
  errorMessage?: string
}

/**
 * Cornerstone 레이어 상태
 */
export interface CornerstoneLayerState {
  /** 프리로드 완료 여부 */
  isPreloaded: boolean
  /** 프리로드 진행률 (0-100) */
  preloadProgress: number
  /** 뷰포트 준비 완료 여부 */
  isReady: boolean
  /** 현재 프레임 인덱스 */
  currentFrame: number
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 에러 메시지 */
  errorMessage?: string
}

/**
 * 전환 상태
 */
export interface TransitionState {
  /** 전환 대기 중 (WADO-RS 준비완료, 루프 경계 대기) */
  pendingTransition: boolean
  /** 전환 진행률 (0-100, 크로스페이드 애니메이션) */
  transitionProgress: number
}

/**
 * 슬롯 상태
 */
export interface HybridSlotState {
  /** 슬롯 ID (0-8) */
  slotId: number
  /** 할당된 Instance (없으면 null) */
  instance: HybridInstanceSummary | null
  /** 현재 전환 단계 */
  phase: TransitionPhase
  /** MJPEG 레이어 상태 */
  mjpeg: MjpegLayerState
  /** Cornerstone 레이어 상태 */
  cornerstone: CornerstoneLayerState
  /** 전환 상태 */
  transition: TransitionState
}

// ============================================================================
// Resolution / Format Types
// ============================================================================

/**
 * MJPEG 지원 해상도
 */
export type HybridMjpegResolution = 256 | 128

/**
 * WADO-RS BulkData 포맷
 */
export type HybridBulkDataFormat = 'original' | 'jpeg-baseline'

// ============================================================================
// Store Types
// ============================================================================

/**
 * 하이브리드 뷰어 스토어 상태
 */
export interface HybridMultiViewerState {
  /** 현재 레이아웃 */
  layout: HybridGridLayout
  /** 전역 FPS */
  globalFps: number
  /** MJPEG 해상도 */
  globalResolution: HybridMjpegResolution
  /** WADO-RS 포맷 */
  globalFormat: HybridBulkDataFormat
  /** 슬롯 상태 배열 */
  slots: HybridSlotState[]
}

/**
 * 하이브리드 뷰어 스토어 액션
 */
export interface HybridMultiViewerActions {
  // Layout
  setLayout: (layout: HybridGridLayout) => void

  // Settings
  setGlobalFps: (fps: number) => void
  setGlobalResolution: (resolution: HybridMjpegResolution) => void
  setGlobalFormat: (format: HybridBulkDataFormat) => void

  // Instance Management
  assignInstanceToSlot: (slotId: number, instance: HybridInstanceSummary) => void
  clearSlot: (slotId: number) => void
  clearAllSlots: () => void

  // Phase Transitions
  setSlotPhase: (slotId: number, phase: TransitionPhase) => void
  requestTransition: (slotId: number) => void
  prepareTransition: (slotId: number) => void
  completeTransition: (slotId: number) => void

  // MJPEG State Updates
  updateMjpegState: (slotId: number, update: Partial<MjpegLayerState>) => void

  // Cornerstone State Updates
  updateCornerstoneState: (slotId: number, update: Partial<CornerstoneLayerState>) => void

  // Playback Control
  playSlot: (slotId: number) => void
  pauseSlot: (slotId: number) => void
  playAll: () => void
  pauseAll: () => void
  stopAll: () => void
}

// ============================================================================
// Loading Types
// ============================================================================

/**
 * MJPEG 프레임 로딩 진행 상태
 */
export interface MjpegLoadingProgress {
  slotId: number
  status: 'queued' | 'loading' | 'decoding' | 'completed' | 'error'
  progress: number
  error?: string
}

/**
 * MJPEG 프레임 로딩 결과
 */
export interface MjpegLoadingResult {
  slotId: number
  sopInstanceUid: string
  frames: HTMLImageElement[]
  success: boolean
  error?: string
}

/**
 * Cornerstone 프리로드 진행 상태
 */
export interface CornerstonePreloadProgress {
  slotId: number
  status: 'idle' | 'preloading' | 'completed' | 'error'
  loadedFrames: number
  totalFrames: number
  progress: number
  error?: string
}
